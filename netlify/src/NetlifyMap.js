import {
  AsyncMap,
  naturalOrder,
  setParent,
  trailingSlash,
  Tree,
} from "@weborigami/async-tree";
import { fetchWithBackoff } from "@weborigami/origami";

export default class NetlifyMap extends AsyncMap {
  /**
   * An AsyncMap representation of a Netlify site
   *
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

  // replaceWith(source) {}

  trailingSlashKeys = true;
}
