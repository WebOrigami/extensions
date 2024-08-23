import fetchWithBackoff from "./fetchWithBackoff.js";

const igApiBase = "https://graph.instagram.com";

export default class InstagramAlbumTree {
  constructor(token, albumId) {
    this.token = token;
    this.albumId = albumId;
    this.itemsPromise = null;
  }

  async get(key) {
    const items = await this.getItems();

    const id = items[key];
    const response = await fetchWithBackoff(
      `${igApiBase}/${id}?fields=media_url&access_token=${this.token}`
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch media ${id}: ${response.statusText}`);
    }
    const data = await response.json();
    const { media_url } = data;
    if (!media_url) {
      throw new Error(`Couldn't get URL for the image ${imageName}`);
    }
    const imageResponse = await fetchWithBackoff(media_url);
    if (!imageResponse.ok) {
      throw new Error(
        `Failed to fetch media ${media_url}: ${imageResponse.statusText}`
      );
    }
    const arrayBuffer = await imageResponse.arrayBuffer();
    return arrayBuffer;
  }

  async getItems() {
    this.itemsPromise ??= await fetchItems(this.token, this.albumId);
    return this.itemsPromise;
  }

  async keys() {
    const items = await this.getItems();
    return Object.keys(items);
  }
}

async function fetchItems(token, albumId) {
  const response = await fetchWithBackoff(
    `${igApiBase}/${albumId}?fields=children&access_token=${token}`
  );
  if (!response.ok) {
    throw new Error(response.statusText);
  }
  const data = await response.json();
  const children = data.children.data;

  const items = {};
  let count = 0;
  for (const media of children) {
    const { id } = media;
    const key = `${count++}.jpeg`;
    items[key] = id;
  }

  return items;
}
