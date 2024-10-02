import { trailingSlash } from "@weborigami/async-tree";
import fetchWithBackoff from "./fetchWithBackoff.js";
import InstagramAlbumTree from "./InstagramAlbumTree.js";

const igApiBase = "https://graph.instagram.com";

export default class InstagramMediaTree {
  constructor(token, userId) {
    this.token = token;
    this.userId = userId;
    this.itemsPromise = null;
  }

  async get(key) {
    if (key == null) {
      // Reject nullish key.
      throw new ReferenceError(
        `${this.constructor.name}: Cannot get a null or undefined key.`
      );
    }

    const items = await this.getItems();

    let item = items[key];
    if (!item) {
      // Try alternative key with/without trailing slash
      item = items[trailingSlash.toggle(key)];
    }

    if (typeof item === "string") {
      // Image or video media URL
      const response = await fetchWithBackoff(item);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch media ${item}: ${response.statusText}`
        );
      }
      return response.arrayBuffer();
    } else if (item) {
      // Album
      const tree = new InstagramAlbumTree(item);
      tree.parent = this;
      return tree;
    }
  }

  async getItems() {
    this.itemsPromise ??= fetchItems(this.token, this.userId);
    return this.itemsPromise;
  }

  async keys() {
    const items = await this.getItems();
    return Object.keys(items);
  }
}

async function fetchItems(token, userId) {
  let url = `${igApiBase}/${userId}/media?fields=children{id,media_type,media_url,timestamp},id,media_type,media_url,timestamp&access_token=${token}`;
  const items = {};
  while (url) {
    const response = await fetchWithBackoff(url);
    if (!response.ok) {
      throw new Error(response.statusText);
    }
    const { data, paging } = await response.json();

    for (const media of data) {
      const { children, media_type, media_url } = media;
      const key = keyFromMedia(media);
      const value =
        media_type === "CAROUSEL_ALBUM"
          ? mapKeysToMediaUrls(children.data)
          : media_type === "VIDEO" || media_type === "IMAGE"
          ? media_url
          : undefined;
      if (value) {
        items[key] = value;
      }
    }

    url = paging?.next;
  }
  return items;
}

// Return a key for a timestamp that avoids the use of colons, which are not
// allowed in filenames.
//
// Example: "2024-08-24T08:38:41.000Z" returns "2024-08-24_08_38_41"
function keyFromTimestamp(timestamp) {
  const date = new Date(timestamp);
  let key = date.toISOString();
  // Strip the millisecond period and everything after it
  key = key.slice(0, key.indexOf("."));
  // Replace T and colons with underscores
  key = key.replaceAll(/[T:]/g, "_");
  return key;
}

function keyFromMedia(media, index) {
  const { media_type, timestamp } = media;
  const key = index ?? keyFromTimestamp(timestamp);
  switch (media_type) {
    case "IMAGE":
      return `${key}.jpeg`;

    case "VIDEO":
      return `${key}.mp4`;

    case "CAROUSEL_ALBUM":
      return trailingSlash.add(key);
  }
}

function mapKeysToMediaUrls(children) {
  let index = 0;
  const result = {};
  for (const media of children) {
    const key = keyFromMedia(media, index);
    result[key] = media.media_url;
    index++;
  }
  return result;
}
