import InstagramAlbumTree from "./InstagramAlbumTree.js";

const igApiBase = "https://graph.instagram.com";

export default class InstagramMediaTree {
  constructor(token, userId) {
    this.token = token;
    this.userId = userId;
  }

  async get(albumId) {
    return new InstagramAlbumTree(this.token, albumId);
  }

  async keys() {
    const response = await fetch(
      `${igApiBase}/${this.userId}/media?fields=id,media_type&access_token=${this.token}`
    );
    if (!response.ok) {
      throw new Error(response.statusText);
    }
    const { data } = await response.json();
    const albumIds = data
      .filter((media) => media.media_type === "CAROUSEL_ALBUM")
      .map((media) => media.id);
    return albumIds;
  }
}
