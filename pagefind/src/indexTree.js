import { keysFromPath, trailingSlash, Tree } from "@weborigami/async-tree";
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

  // Add everything in the input tree to the index.
  await addTreeToIndex(treelike, { index, basePath });

  // Return the index files as a plain object.
  return indexToObject(index);
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

// Return the complete set of index files as a plain object.
async function indexToObject(index) {
  const result = {};
  const { files } = await index.getFiles();
  for (const file in files) {
    const { path, content } = files[file];
    const keys = keysFromPath(path);
    addValueToObject(result, keys, content);
  }
  return result;
}

// Cast a possible ArrayBuffer, Buffer, or other TypedArray to a string.
function toString(value) {
  if (value instanceof ArrayBuffer || value instanceof TypedArray) {
    // Treat the buffer as UTF-8 text.
    return textDecoder.decode(value);
  } else {
    return String(value);
  }
}
