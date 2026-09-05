import { toString, trailingSlash, Tree } from "@weborigami/async-tree";
import * as pagefind from "pagefind";

const textDecoder = new TextDecoder();
const TypedArray = Object.getPrototypeOf(Uint8Array);

/**
 * Given a tree of HTML content, index that content with Pagefind and return a
 * new tree containing the index files.
 *
 * @typedef {import("@weborigami/async-tree").Treelike} Treelike
 * @param {Treelike} treelike
 * @param {string} [basePath]
 * @param {Object} [config] - Pagefind configuration options (camelCase)
 * @returns {Treelike}
 */
export default async function indexTree(treelike, basePath = "", config = {}) {
  const { index } = await pagefind.createIndex(config);

  // Add everything in the input tree to the index
  await addTreeToIndex(treelike, { index, basePath });

  // Get the index files and convert a map of path->content
  const { files } = await index.getFiles();
  const map = new Map();
  for (const file in files) {
    const { path, content } = files[file];
    map.set(path, content);
  }

  // Pagefind returns the files in a non-deterministic order that can vary
  // between runs. To provide a stable order, we sort by paths.
  const sorted = await Tree.sort(map);

  // Inflate from paths to a full tree
  const inflated = await Tree.inflatePaths(sorted);
  return inflated;
}

// Add a single value to a nested object based on an array of keys.
function addValueToObject(object, keys, value) {
  for (let i = 0, current = object; i < keys.length; i++) {
    const key = keys[i];
    if (i === keys.length - 1) {
      // Write out value
      current[key] = value;
    } else {
      // Traverse further
      if (!current[key]) {
        current[key] = {};
      }
      current = current[key];
    }
  }
}

// Add the complete HTML content in a tree to a Pagefind index.
async function addTreeToIndex(treelike, options) {
  const tree = Tree.from(treelike);
  const { index, basePath } = options;
  for await (const key of tree.keys()) {
    const path = `${trailingSlash.remove(basePath)}/${key}`;
    const value = await tree.get(key);
    if (Tree.isMaplike(value)) {
      // Child node
      await addTreeToIndex(value, { index, basePath: path });
      continue;
    } else if (key.endsWith(".html")) {
      // HTML file
      const result = await index.addHTMLFile({
        url: path,
        content: toString(value),
      });
      if (result.errors?.length > 0) {
        console.error(
          `Errors indexing ${path}:\n${JSON.stringify(result.errors, null, 2)}`,
        );
      }
    }
  }
}
