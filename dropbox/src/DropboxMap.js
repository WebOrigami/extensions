import {
  AsyncMap,
  isUnpackable,
  naturalOrder,
  pack,
  setParent,
  trailingSlash,
  Tree,
} from "@weborigami/async-tree";
import { symbols } from "@weborigami/language";
import { fetchWithBackoff } from "@weborigami/origami";

/**
 * A Dropbox folder as an async map.
 */
export default class DropboxMap extends AsyncMap {
  constructor(accessToken, path) {
    super();
    this.accessToken = accessToken;
    if (path === undefined || path === "/") {
      // Dropbox wants the root path as the empty string.
      path = "";
    } else if (path !== "") {
      if (!path?.startsWith("/")) {
        // Dropbox wants all non-root paths to start with a slash.
        path = `/${path}`;
      }
      if (!path.endsWith("/")) {
        // We want to including trailing slashes to indicate a folder.
        path += "/";
      }
    }
    this.path = path;
    this.itemsPromise = null;
  }

  /**
   * Bulk update the contents of this Dropbox folder with everything in
   * the given source tree.
   */
  async apply(source) {
    if (isUnpackable(source)) {
      source = await source.unpack();
    }
    const tree = Tree.from(source, { deep: true });

    const base = this.path === "" ? "/" : this.path;
    const deflated = await Tree.deflatePaths(tree, { base });
    const uploadFilter = await Tree.filter(deflated, Boolean);
    const uploads = await Tree.resolve(uploadFilter);
    const deleteFilter = await Tree.filter(
      deflated,
      (value) => value == undefined,
    );
    const deletions = await Tree.resolve(deleteFilter);

    if (uploads.size > 0) {
      await uploadFiles(uploads, this.accessToken);
    }

    if (deletions.size > 0) {
      await deleteFiles(deletions, this.accessToken);
    }

    // Invalidate cached items since they've changed
    this.itemsPromise = null;

    return this;
  }

  /**
   * Return the child folder for the given key, creating it if necessary.
   * - If the child folder exists, return as DropboxMap for it.
   * - If the child folder doesn't exist, create it and return as DropboxMap.
   */
  async child(key) {
    const normalizedKey = trailingSlash.remove(key);
    const path = `${this.path}${normalizedKey}`;

    const items = await this.getItems();
    const item =
      items[normalizedKey] ?? items[trailingSlash.toggle(normalizedKey)];

    let createFolder = true;
    if (item?.tag === "folder") {
      createFolder = false; // Already exists
    } else if (item?.tag === "file") {
      // Delete existing file with same name
      await this.delete(normalizedKey);
    }

    if (createFolder) {
      const response = await fetchWithBackoff(
        "https://api.dropboxapi.com/2/files/create_folder_v2",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ path }),
        },
      );

      if (!response.ok) {
        const data = await response.json();
        const message =
          data.user_message?.text ?? data.error_summary ?? response.statusText;
        throw new Error(`Dropbox error: ${response.status}: ${message}`);
      }

      // Invalidate cached items since they've changed
      this.itemsPromise = null;
    }

    const subtree = Reflect.construct(this.constructor, [
      this.accessToken,
      path,
    ]);
    setParent(subtree, this);
    return subtree;
  }

  async delete(key) {
    // We use a trailing slash on our folder paths, but Dropbox doesn't want
    // them in a delete call.
    const normalized = trailingSlash.remove(key);
    const path = `${this.path}${normalized}`;
    const response = await fetchWithBackoff(
      "https://api.dropboxapi.com/2/files/delete_v2",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ path }),
      },
    );

    if (!response.ok) {
      const error = await response.json();
      if (
        error.error?.[".tag"] === "path_lookup" &&
        error.error.path_lookup?.[".tag"] === "not_found"
      ) {
        // File/folder doesn't exist
        return false;
      }
      throw new Error(error.error_summary);
    }

    // Invalidate cached items since they've changed
    this.itemsPromise = null;

    // Successfully deleted
    return true;
  }

  async get(key) {
    if (key == null) {
      // Reject nullish key.
      throw new ReferenceError(
        `${this.constructor.name}: Cannot get a null or undefined key.`,
      );
    }

    // A key with a trailing slash is for a folder; return a subtree without
    // making a network request.
    if (trailingSlash.has(key)) {
      const subtree = Reflect.construct(this.constructor, [
        this.accessToken,
        this.path + key,
      ]);
      subtree.parent = this;
      return subtree;
    }

    const normalizedKey = trailingSlash.remove(key);

    const items = await this.getItems();
    let item = items[normalizedKey];
    if (!item) {
      // Try alternate key with/without trailing slash.
      item = items[trailingSlash.toggle(normalizedKey)];
      if (!item) {
        // Asked for a key that doesn't exist in this folder.
        return undefined;
      }
    }

    const path = item.path_display;
    if (item.tag === "folder") {
      // Return a subtree for the indicated folder.
      const subtree = Reflect.construct(this.constructor, [
        this.accessToken,
        path,
      ]);
      setParent(subtree, this);
      return subtree;
    }

    // Return a buffer for the indicated file from the Dropbox content API.
    const response = await fetchWithBackoff(
      "https://content.dropboxapi.com/2/files/download",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Dropbox-API-Arg": JSON.stringify({ path }),
        },
      },
    );
    if (!response.ok) {
      throw new Error(
        `Dropbox API reported an error: ${response.status}: ${response.statusText}`,
      );
    }

    const value = response.arrayBuffer();
    setParent(value, this);
    return value;
  }

  async getItems() {
    this.itemsPromise ??= getFolderItems(this.accessToken, this.path);
    return this.itemsPromise;
  }

  // Get the contents of this folder.
  async *keys() {
    const items = await this.getItems();
    const keys = Object.keys(items);
    // Dropbox seems to return keys in an almost-but-not-quite sorted order. In
    // any event, Origami tree drivers generally use natural sort order. For
    // reference, Dropbox's own UI uses what seems to be natural sort order.
    keys.sort(naturalOrder);
    yield* keys;
  }

  [symbols.noCacheSymbol] = true;

  async set(key, value) {
    const path = `${this.path}${key}`;
    const packed = pack(value);
    const response = await fetchWithBackoff(
      "https://content.dropboxapi.com/2/files/upload",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/octet-stream",
          "Dropbox-API-Arg": JSON.stringify({
            path,
            mode: "overwrite",
          }),
        },
        body: packed,
      },
    );

    if (!response.ok) {
      const data = await response.json();
      const message =
        data.user_message?.text ?? data.error_summary ?? response.statusText;
      throw new Error(`Dropbox error: ${response.status}: ${message}`);
    }

    // Invalidate cached items since they've changed
    this.itemsPromise = null;

    return this;
  }

  trailingSlashKeys = true;
}

// Get items in a folder via the Dropbox API.
async function getFolderItems(accessToken, path) {
  let items = {};
  let hasMore = true;
  let cursor = null;

  while (hasMore) {
    let url;
    let body;
    if (cursor) {
      url = "https://api.dropboxapi.com/2/files/list_folder/continue";
      body = { cursor };
    } else {
      url = "https://api.dropboxapi.com/2/files/list_folder";
      body = { path };
    }

    const response = await fetchWithBackoff(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(
        `Dropbox error: ${response.status}: ${response.statusText}`,
      );
    }

    const json = await response.json();

    // Add the entries in the response to the items.
    for (const entry of json.entries) {
      const tag = entry[".tag"];
      if (tag === "deleted") {
        continue;
      }
      const { name, path_display } = entry;
      const key = trailingSlash.toggle(name, tag === "folder");
      items[key] = {
        tag,
        path_display,
      };
    }

    hasMore = json.has_more;
    cursor = json.cursor;
  }

  return items;
}

// Delete multiple files
async function deleteFiles(map, token) {
  if (map.size === 0) {
    return;
  }

  // Note: these are "entries" in Dropbox terminology, not Map entries
  const deleteEntries = Array.from(map.keys(), (path) => ({ path }));
  const response = await fetchWithBackoff(
    "https://api.dropboxapi.com/2/files/delete_batch",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ entries: deleteEntries }),
    },
  );

  if (!response.ok) {
    const data = await response.json();
    const message =
      data.user_message?.text ?? data.error_summary ?? response.statusText;
    throw new Error(`Dropbox error: ${response.status}: ${message}`);
  }

  // Batch operations are async on Dropbox's side; poll until the job completes.
  let json = await response.json();
  while (json[".tag"] === "async_job_id") {
    await new Promise((resolve) => setTimeout(resolve, 500));

    const checkResponse = await fetchWithBackoff(
      "https://api.dropboxapi.com/2/files/delete_batch/check",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ async_job_id: json.async_job_id }),
      },
    );

    if (!checkResponse.ok) {
      const data = await checkResponse.json();
      const message =
        data.user_message?.text ??
        data.error_summary ??
        checkResponse.statusText;
      throw new Error(`Dropbox error: ${checkResponse.status}: ${message}`);
    }

    json = await checkResponse.json();
  }

  if (json[".tag"] === "failed") {
    throw new Error(
      `Dropbox error: batch delete failed: ${JSON.stringify(json.failed)}`,
    );
  }
}

// Upload multiple files
async function uploadFiles(map, token) {
  const uploadEntries = [];
  for (const [path, value] of map.entries()) {
    const packed = pack(value);

    const startResponse = await fetchWithBackoff(
      "https://content.dropboxapi.com/2/files/upload_session/start",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/octet-stream",
          "Dropbox-API-Arg": JSON.stringify({ close: true }),
        },
        body: packed,
      },
    );

    if (!startResponse.ok) {
      const data = await startResponse.json();
      const message =
        data.user_message?.text ??
        data.error_summary ??
        startResponse.statusText;
      throw new Error(`Dropbox error: ${startResponse.status}: ${message}`);
    }

    const { session_id } = await startResponse.json();
    uploadEntries.push({
      cursor: { session_id, offset: packed.byteLength },
      commit: { path, mode: "overwrite" },
    });
  }

  if (uploadEntries.length === 0) {
    return;
  }

  // finish_batch_v2 blocks until the batch completes, so no polling is needed.
  const finishResponse = await fetchWithBackoff(
    "https://api.dropboxapi.com/2/files/upload_session/finish_batch_v2",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ entries: uploadEntries }),
    },
  );

  if (!finishResponse.ok) {
    const data = await finishResponse.json();
    const message =
      data.user_message?.text ??
      data.error_summary ??
      finishResponse.statusText;
    throw new Error(`Dropbox error: ${finishResponse.status}: ${message}`);
  }

  const json = await finishResponse.json();
  const failed = json.entries?.filter((entry) => entry[".tag"] === "failure");
  if (failed?.length > 0) {
    throw new Error(
      `Dropbox error: batch upload failed: ${JSON.stringify(failed)}`,
    );
  }
}
