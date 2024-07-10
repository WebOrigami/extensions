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
    } else if (path !== "" && !path?.startsWith("/")) {
      // Dropbox wants all other paths to start with a slash.
      path = `/${path}`;
    }
    this.path = path;
    this.itemsPromise = null;
  }

  async get(key) {
    if (!key) {
      return undefined;
    }

    const items = await this.getItems();
    const item = items[key];
    if (!item) {
      // Asked for a key that doesn't exist in this folder.
      return undefined;
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

    return response.arrayBuffer();
  }

  async getItems() {
    this.itemsPromise ??= getFolderItems(this.accessToken, this.path);
    return this.itemsPromise;
  }

  async isKeyForSubtree(key) {
    const items = await this.getItems();
    const item = items[key];
    return item?.tag === "folder";
  }

  // Get the contents of this folder.
  async keys() {
    const items = await this.getItems();
    return Object.keys(items);
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
      const text = await response.text();
      throw new Error(
        `Dropbox API error: ${response.status}: ${response.statusText} - ${text}`
      );
    }

    const json = await response.json();

    // Add the entries in the response to the items.
    for (const entry of json.entries) {
      const tag = entry[".tag"];
      const { name, path_display } = entry;
      if (entry[".tag"] === "deleted") {
        continue;
      }
      items[name] = {
        tag,
        path_display,
      };
    }

    hasMore = json.has_more;
    cursor = json.cursor;
  }

  return items;
}
