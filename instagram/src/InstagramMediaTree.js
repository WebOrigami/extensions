import fetchWithBackoff from "../../dropbox/src/fetchWithBackoff.js";
import InstagramAlbumTree from "./InstagramAlbumTree.js";

const igApiBase = "https://graph.instagram.com";

export default class InstagramMediaTree {
  constructor(token, userId) {
    this.token = token;
    this.userId = userId;
    this.itemsPromise = null;
  }

  async get(key) {
    const items = await this.getItems();
    const id = items[key];
    return id ? new InstagramAlbumTree(this.token, id) : undefined;
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
  let url = `${igApiBase}/${userId}/media?fields=id,media_type,timestamp&access_token=${token}`;
  const items = {};
  while (url) {
    const response = await fetchWithBackoff(url);
    if (!response.ok) {
      throw new Error(response.statusText);
    }
    const { data, paging } = await response.json();

    for (const media of data) {
      const { id, media_type, timestamp } = media;
      if (media_type === "CAROUSEL_ALBUM") {
        const key = keyFromTimestamp(timestamp);
        items[key] = id;
      }
    }

    url = paging?.next;
  }
  return items;
}

// Return a key for a timestamp that avoids the use of colons, which are not
// allowed in filenames.
//
// Example: "2024-08-24T08:38:41.000Z" returns "2024-08-24 08.38.41"
//
function keyFromTimestamp(timestamp) {
  const date = new Date(timestamp);
  let key = date.toISOString();
  // Strip the millisecond period and everything after it
  key = key.slice(0, key.indexOf("."));
  // Replace T with space, and colons with periods
  key = key.replace("T", " ").replace(/:/g, ".");
  return key;
}
