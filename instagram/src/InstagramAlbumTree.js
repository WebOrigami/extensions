const igApiBase = "https://graph.instagram.com";

export default class InstagramAlbumTree {
  constructor(token, albumId) {
    this.token = token;
    this.albumId = albumId;
  }

  async get(imageName) {
    const imageId = imageName.replace(/\.jpeg$/, "");
    const response = await fetch(
      `${igApiBase}/${imageId}?fields=media_url&access_token=${this.token}`
    );
    if (!response.ok) {
      throw new Error(
        `Failed to fetch media ${imageId}: ${response.statusText}`
      );
    }
    const data = await response.json();
    const { media_url } = data;
    if (!media_url) {
      throw new Error(`Couldn't get URL for the image ${imageName}`);
    }
    const imageResponse = await fetch(media_url);
    if (!imageResponse.ok) {
      throw new Error(
        `Failed to fetch media ${media_url}: ${imageResponse.statusText}`
      );
    }
    const arrayBuffer = await imageResponse.arrayBuffer();
    return arrayBuffer;
  }

  async keys() {
    const response = await fetch(
      `${igApiBase}/${this.albumId}?fields=children&access_token=${this.token}`
    );
    if (!response.ok) {
      throw new Error(response.statusText);
    }
    const { children } = await response.json();
    const imageNames = children.data.map((media) => `${media.id}.jpeg`);
    return imageNames;
  }
}
