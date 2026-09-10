import {
  AsyncMap,
  isUnpackable,
  pack,
  setParent,
  SyncMap,
  trailingSlash,
  Tree,
} from "@weborigami/async-tree";
import { fetchWithBackoff } from "@weborigami/origami";

export default class NeocitiesMap extends AsyncMap {
  constructor(options, path = "") {
    super();
    this.token = options.token;
    this.url = options.url;
    this.path = path ? trailingSlash.add(path) : "";
  }

  /**
   * Bulk update the contents of this Neocities site with everything in
   * the given source tree.
   */
  async apply(source) {
    if (isUnpackable(source)) {
      source = await source.unpack();
    }
    const tree = Tree.from(source, { deep: true });

    const deflated = await Tree.deflatePaths(tree);
    const uploadFilter = await Tree.filter(deflated, Boolean);
    const uploads = await Tree.resolve(uploadFilter);
    const deleteFilter = await Tree.filter(
      deflated,
      (value) => value == undefined,
    );
    const deletions = await Tree.resolve(deleteFilter);

    if (uploads.size > 0) {
      await uploadFiles(uploads, this.token);
    }

    if (deletions.size > 0) {
      await deleteFiles(deletions, this.token);
    }

    return this;
  }

  /**
   * Return the child node for the given key, creating it if necessary.
   */
  async child(key) {
    // We remove the trailing slash before the get() call because otherwise it
    // would immediately return a NeocitiesMap without actually checking to see
    // if it exists.
    const normalized = trailingSlash.remove(key);
    let result = await this.get(normalized);

    if (result instanceof NeocitiesMap) {
      // Directory exists
      return result;
    } else if (result !== undefined) {
      // File exists with same name, delete it
      await this.delete(key);
    }

    // Create a new directory
    const pathArg = this.filePathForKey(normalized);
    const url = `https://neocities.org/api/create_directory`;
    const response = await fetchWithBackoff(url, {
      body: new URLSearchParams({ path: pathArg }),
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
      method: "POST",
    });

    // If we get 400 Bad Request, it likely means the directory already exists
    // but is empty. This happens because get() cannot detect empty directories
    // without a trailing slash.
    if (!response.ok && response.status !== 400) {
      throw new Error(
        `Failed to create directory ${pathArg}: ${response.statusText}`,
      );
    }

    result = Reflect.construct(this.constructor, [
      {
        token: this.token,
        url: this.url,
      },
      pathArg,
    ]);
    result.parent = this;
    return result;
  }

  async delete(key) {
    const filePath = this.filePathForKey(key);
    const deletions = new Map([[filePath, undefined]]);
    await deleteFiles(deletions, this.token);
    return this;
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
      this.url ??= await this.getSiteUrl();
      const fileUrl = `${this.url}/${filePath}`;

      response = await fetchWithBackoff(fileUrl, {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
        redirect: "manual", // so we can detect redirects
      });

      // Did we get redirected to a directory? Note: Neocities does *not*
      // redirect an empty directory. This means get() cannot return a property
      // response for an empty subdirectory unless a trailing slash is included
      // in the key.
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

    let value;
    if (isDirectory) {
      const directoryPath = trailingSlash.add(filePath);
      value = Reflect.construct(this.constructor, [
        {
          token: this.token,
          url: this.url,
        },
        directoryPath,
      ]);
    } else if (!response.ok) {
      // Not found or an error
      return undefined;
    } else {
      // File
      value = await response.arrayBuffer();
    }

    setParent(value, this);
    return value;
  }

  async getSiteUrl() {
    const response = await fetchWithBackoff(`https://neocities.org/api/info`, {
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });
    const data = await response.json();
    return `https://${data.info.sitename}.neocities.org`;
  }

  async *keys() {
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

    // Extract file names, add slash to directory names
    const keys = entries.map((file) =>
      trailingSlash.toggle(
        file.path.slice(this.path.length),
        file.is_directory,
      ),
    );

    yield* keys;
  }

  async manifest() {
    const pathArg = this.path ? encodeURIComponent(this.path) : "/";
    const url = `https://neocities.org/api/list?path=${pathArg}`;
    const response = await fetchWithBackoff(url, {
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });
    const data = await response.json();
    let entries = data.files;

    // Convert from Neocities format to an object mapping key to hash (for
    // files) or null (for directories)
    const mapped = entries.map((file) => [
      file.path,
      file.is_directory ? null : file.sha1_hash,
    ]);

    // Filter out directories
    const filtered = mapped.filter(([, value]) => value !== null);
    const flat = new SyncMap(filtered);

    const inflated = await Tree.inflatePaths(flat);
    return inflated;
  }

  async set(key, value) {
    const map = new SyncMap([[key, value]]);
    await uploadFiles(map, this.token);
    return this;
  }

  trailingSlashKeys = true;
}

// Delete multiple files
async function deleteFiles(map, token) {
  const body = new FormData();
  for (const path of map.keys()) {
    body.append("filenames[]", path);
  }

  const response = await fetchWithBackoff(`https://neocities.org/api/delete`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body,
  });

  if (!response.ok) {
    throw new Error(
      `Neocities delete failed: ${response.status} ${response.statusText}`,
    );
  }
}

// Upload multiple files
async function uploadFiles(map, token) {
  const body = new FormData();
  for (const [path, value] of map.entries()) {
    const buffer = pack(value);
    const blob = new Blob([buffer]);
    body.append(path, blob, path);
  }

  const response = await fetchWithBackoff(`https://neocities.org/api/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body,
  });

  if (!response.ok) {
    throw new Error(
      `Neocities upload failed: ${response.status} ${response.statusText}`,
    );
  }
}
