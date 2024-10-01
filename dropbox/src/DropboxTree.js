import { naturalOrder, trailingSlash } from "@weborigami/async-tree";
import fetchWithBackoff from "./fetchWithBackoff.js";

/**
 * A Dropbox folder as an AsyncTree.
 */
export default class DropboxTree {
  constructor(accessToken, path) {
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

  async get(key) {
    if (key == null) {
      // Reject nullish key.
      throw new ReferenceError(
        `${this.constructor.name}: Cannot get a null or undefined key.`
      );
    }

    // A key with a trailing slash and no extension is for a folder; return a
    // subtree without making a network request.
    if (trailingSlash.has(key) && !key.includes(".")) {
      const path = this.path + key;
      const subtree = Reflect.construct(this.constructor, [
        this.accessToken,
        path,
      ]);
      subtree.parent = this;
      return subtree;
    }

    // HACK: For now we don't allow lookup of Origami extension handlers.
    if (key.endsWith("_handler")) {
      return undefined;
    }

    const items = await this.getItems();
    let item = items[key];
    if (!item) {
      // Try alternate key with/without trailing slash.
      item = items[trailingSlash.toggle(key)];
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
      subtree.parent = this;
      return subtree;
    }

    // Return a buffer for the indicated file from the Dropbox content API.
    const headers = new Headers({
      Authorization: `Bearer ${this.accessToken}`,
      "Dropbox-API-Arg": JSON.stringify({ path }),
    });
    const response = await fetchWithBackoff(
      "https://content.dropboxapi.com/2/files/download",
      {
        method: "POST",
        headers,
      }
    );
    if (!response.ok) {
      throw new Error(
        `Dropbox API reported an error: ${response.status}: ${response.statusText}`
      );
    }

    return response.arrayBuffer();
  }

  async getItems() {
    this.itemsPromise ??= getFolderItems(this.accessToken, this.path);
    return this.itemsPromise;
  }

  // Get the contents of this folder.
  async keys() {
    const items = await this.getItems();
    const keys = Object.keys(items);
    // Dropbox seems to return keys in an almost-but-not-quite sorted order. In
    // any event, Origami tree drivers generally use natural sort order. For
    // reference, Dropbox's own UI uses what seems to be natural sort order.
    keys.sort(naturalOrder);
    return keys;
  }
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
        `Dropbox API reported an error: ${response.status}: ${response.statusText}`
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
