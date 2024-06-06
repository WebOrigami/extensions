import dropboxFetch from "./dropboxFetch.js";

/**
 * A Dropbox folder as an AsyncTree.
 */
export default class DropboxTree {
  constructor(accessToken, path) {
    this.accessToken = accessToken;
    if (path === undefined || path === "/") {
      // Dropbox wants the root path as the empty string.
      path = "";
    } else if (!path?.startsWith("/")) {
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
      const subtree = Reflect.construct(this.constructor, [
        this.accessToken,
        path,
      ]);
      subtree.parent = this;
      return subtree;
    }

    // Get the indicated file.
    const headers = new Headers({
      Authorization: `Bearer ${this.accessToken}`,
      "Dropbox-API-Arg": JSON.stringify({ path }),
    });
    const response = await fetch(
      "https://content.dropboxapi.com/2/files/download",
      {
        method: "POST",
        headers,
      }
    );
    return response.arrayBuffer();
  }

  async getItems() {
    this.itemsPromise ??= getItemsInternal(this.accessToken, this.path);
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

async function getItemsInternal(accessToken, path) {
  let items = {};
  let hasMore = true;
  let cursor = null;

  try {
    while (hasMore) {
      let response;
      if (cursor) {
        response = await dropboxFetch(
          accessToken,
          "/files/list_folder/continue",
          {
            cursor,
          }
        );
      } else {
        response = await dropboxFetch(accessToken, "/files/list_folder", {
          path,
        });
      }

      // Add the entries in the response to the items.
      for (const entry of response.entries) {
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

      hasMore = response.has_more;
      cursor = response.cursor;
    }
  } catch (error) {
    console.error("Error listing folder:", error);
  }

  return items;
}
