import fetchWithBackoff from "./fetchWithBackoff.js";

// An album here is mapping of keys to media URLs. This acts like an ObjectTree,
// with the difference that getting a key fetches the value of the URL.
export default class InstagramAlbumTree {
  constructor(mapKeysToMediaUrls) {
    this.mapKeysToMediaUrls = mapKeysToMediaUrls;
  }

  async get(key) {
    const media_url = this.mapKeysToMediaUrls[key];
    if (!media_url) {
      throw new Error(`Couldn't get URL for ${key}`);
    }
    const response = await fetchWithBackoff(media_url);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch media ${media_url}: ${response.statusText}`
      );
    }
    const arrayBuffer = await response.arrayBuffer();
    return arrayBuffer;
  }

  async keys() {
    return Object.keys(this.mapKeysToMediaUrls);
  }
}
