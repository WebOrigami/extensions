import { AsyncMap, trailingSlash } from "@weborigami/async-tree";
import fetchWithBackoff from "./fetchWithBackoff.js";

export default class NeocitiesMap extends AsyncMap {
  constructor(token, path = "") {
    super();
    this.token = token;
    this.path = path ? trailingSlash.add(path) : "";

    this._files = null;
    this._siteName = null;
  }

  // Return the (possibly new) subdirectory with the given key.
  child(key) {
    const filePath = this.filePathForKey(key);
    const directoryPath = trailingSlash.add(filePath);
    const directory = Reflect.construct(this.constructor, [
      this.token,
      directoryPath,
    ]);
    directory.parent = this;
    return directory;
  }

  async fileEntryForKey(key) {
    const filePath = this.filePathForKey(key);
    const files = await this.getFiles();
    return files[filePath];
  }

  filePathForKey(key) {
    const normalizedKey = trailingSlash.remove(key);
    return this.path ? `${this.path}${normalizedKey}` : normalizedKey;
  }

  async get(key) {
    // Do we know the key is for a directory?
    let isDirectory = trailingSlash.has(key);
    const filePath = this.filePathForKey(key);

    let response;
    if (!isDirectory) {
      // Might be a file or a directory
      const siteName = await this.getSiteName();
      const url = `https://${siteName}.neocities.org/${filePath}`;

      response = await fetchWithBackoff(url, {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
        redirect: "manual", // so we can detect redirects
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (location.endsWith("/")) {
          // The path is a directory
          isDirectory = true;
        } else {
          // Follow the redirect to get the file contents
          response = await fetchWithBackoff(location, {
            headers: {
              Authorization: `Bearer ${this.token}`,
            },
          });
        }
      }
    }

    if (isDirectory) {
      const directoryPath = trailingSlash.add(filePath);
      const directory = Reflect.construct(this.constructor, [
        this.token,
        directoryPath,
      ]);
      directory.parent = this;
      return directory;
    } else if (!response.ok) {
      // Not found or an error
      return undefined;
    } else {
      // File
      return await response.arrayBuffer();
    }
  }

  async getFiles() {
    if (!this._files) {
      const pathArg = this.path ? encodeURIComponent(this.path) : "/";
      const url = `https://neocities.org/api/list?path=${pathArg}`;
      const response = await fetchWithBackoff(url, {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      });
      const data = await response.json();
      let entries = data.files;

      // When we ask for only the root contents, Neocities returns all files in
      // the site. We have to filter this to just the files that start with this
      // path.
      if (this.path === "") {
        entries = entries.filter((file) => !file.path.includes("/"));
      }

      // Convert from Neocities format to an object mapping key to hash (for
      // files) or null (for directories)
      const mapped = entries.map((file) => [
        trailingSlash.toggle(
          file.path.slice(this.path.length),
          file.is_directory,
        ),
        file.is_directory ? null : file.sha1_hash,
      ]);

      this._files = Object.fromEntries(mapped);
    }

    return this._files;
  }

  async getSiteName() {
    if (!this._siteName) {
      const response = await fetchWithBackoff(
        `https://neocities.org/api/info`,
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
          },
        },
      );
      const data = await response.json();
      this._siteName = data.info.sitename;
    }

    return this._siteName;
  }

  async *keys() {
    const files = await this.getFiles();
    yield* Object.keys(files);
  }

  trailingSlashKeys = true;
}
