import {
  AsyncMap,
  naturalOrder,
  pack,
  setParent,
  trailingSlash,
  Tree,
} from "@weborigami/async-tree";
import { symbols } from "@weborigami/language";
import { fetchWithBackoff } from "@weborigami/origami";
import mapLimit from "./mapLimit.js";

/**
 * An AsyncMap representation of a Netlify site.
 */
export default class NetlifyMap extends AsyncMap {
  /**
   * @param {{ path?: string, projectId: string, projectName: string, token: string|Uint8Array }} options
   */
  constructor(options) {
    super();
    this.domain = `https://${options.projectName}.netlify.app`;
    this.path = options.path || "";
    if (this.path.startsWith("/")) {
      this.path = this.path.slice(1); // Remove leading slash
    }
    this.projectId = options.projectId;
    this.projectName = options.projectName;
    this.token = options.token;
  }

  async get(key) {
    const base = new URL(this.path, this.domain);
    const url = new URL(key, base);

    // A key with a trailing slash is for a folder; return a subtree without
    // making a network request.
    if (trailingSlash.has(key)) {
      const value = Reflect.construct(this.constructor, [
        {
          path: url.pathname.slice(1), // Remove leading slash
          projectId: this.projectId,
          projectName: this.projectName,
          token: this.token,
        },
      ]);
      setParent(value, this);
      return value;
    }

    // Fetch the data at the given route.
    let response;
    try {
      response = await fetchWithBackoff(url.href);
    } catch (error) {
      return undefined;
    }

    return response.ok ? await response.arrayBuffer() : undefined;
  }

  async *keys() {
    const manifest = await this.manifest();
    yield* manifest.keys();
  }

  async manifest() {
    const url = `https://api.netlify.com/api/v1/sites/${this.projectId}/files`;
    const response = await fetchWithBackoff(url, {
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Netlify API request failed with status ${response.status}: ${errorText}`,
      );
    }

    const data = await response.json();

    // Construct an array of tuples of path->hash
    const tuples = [];
    for (const file of data) {
      let { path, sha } = file;
      path = path.slice(1); // Remove leading slash
      tuples.push([path, sha]);
    }

    // Sort tuples by path using natural order
    const sorted = tuples.sort((a, b) => naturalOrder(a[0], b[0]));

    // Create a flat map
    const flat = new Map(sorted);

    // Inflate to a nested structure
    const inflated = await Tree.inflatePaths(flat);

    // If we have a non-empty path, traverse to that point in the manifest
    const result = this.path
      ? await Tree.traversePath(inflated, this.path)
      : inflated;
    return result;
  }

  [symbols.noCacheSymbol] = true;

  async replaceWith(source) {
    if (this.path) {
      throw new Error(
        "Netlify: You can only call replaceWith() on the project's root.",
      );
    }

    // What files are in the source tree?
    const manifest = await Tree.manifest(source);

    // Netlify wants leading slashes in the manifest paths.
    const deflated = await Tree.deflatePaths(manifest, { base: "/" });
    const files = await Tree.plain(deflated);

    const body = JSON.stringify({ files });
    const response = await fetch(
      `https://api.netlify.com/api/v1/sites/${this.projectId}/deploys`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
        },
        body,
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Netlify API request failed with status ${response.status}: ${errorText}`,
      );
    }

    // See what files Netlify wants.
    const data = await response.json();
    const { id: deployId, required, ssl_url } = data;
    if (required.length === 0) {
      console.log(`Site is up to date: ${ssl_url}`);
      return;
    }

    // Netlify gives us a set of hashes. For each one, find the first path in our
    // tree that has that hash.
    const uploadPaths = required.map((hash) => {
      const path = Object.keys(files).find((path) => files[path] === hash);
      if (!path) {
        throw new Error(
          `Netlify requested a file with a hash that wasn't in the provided source files: ${hash}`,
        );
      }
      return path;
    });

    // Upload each required file.
    const deployUrl = `https://api.netlify.com/api/v1/deploys/${deployId}/files`;
    await mapLimit(
      uploadPaths,
      (path) => uploadFile(source, path, deployUrl, this.token),
      8,
    );

    console.log(`Uploaded ${uploadPaths.length} file(s) to ${ssl_url}`);
  }

  trailingSlashKeys = true;
}

// Upload the file at the given path to Netlify
async function uploadFile(site, path, deployUrl, token) {
  const value = await Tree.traversePath(site, path);
  let body;
  try {
    body = pack(value);
  } catch (err) {
    throw new Error(`Netlify: Can't convert to buffer: ${path}`);
  }
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  const uploadUrl = `${deployUrl}/${encodedPath}`;
  const uploadResponse = await fetchWithBackoff(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": "application/octet-stream",
      Authorization: `Bearer ${token}`,
    },
    body,
  });
  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    throw new Error(
      `Netlify: Failed to upload ${path}: ${uploadResponse.status} ${errorText}`,
    );
  }
}
