import { Tree } from "@weborigami/async-tree";
import zip from "./zip.js";

/**
 * Package a tree of files as an EPUB file in Buffer form.
 *
 * This works just like `zip`, but ensures the `mimetype` file is the first file
 * in the package -- a requirement for EPUB files.
 *
 * @param {import("@weborigami/async-tree").Treelike} treelike
 */
export default async function epub(treelike) {
  const tree = Tree.from(treelike);
  return zip(mimetypeFirst(tree));
}

// A tree with its `mimetype` file first
function mimetypeFirst(tree) {
  return {
    async get(key) {
      return tree.get(key);
    },

    async keys() {
      const keys = await tree.keys();
      // Move `mimetype` (if present) to the front of the list.
      const index = keys.indexOf("mimetype");
      if (index >= 0) {
        keys.splice(index, 1);
        keys.unshift("mimetype");
      }
      return keys;
    },
  };
}
