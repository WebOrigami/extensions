import { Tree } from "@weborigami/async-tree";
import zip from "./zip.js";

/**
 * Package a tree of files as an EPUB file in Buffer form.
 *
 * @param {import("@weborigami/async-tree").Treelike} treelike
 */
export default async function epub(treelike) {
  const tree = Tree.from(treelike);
  return zip(epubTree(tree));
}

// An EPUB tree is just a normal tree with the `mimetype` file moved to the
// front.
function epubTree(tree) {
  return {
    async get(key) {
      return tree.get(key);
    },

    async keys() {
      const keys = await tree.keys();
      // Move `mimetype` to the front of the list.
      const index = keys.indexOf("mimetype");
      if (index > -1) {
        keys.splice(index, 1);
        keys.unshift("mimetype");
      }
      return keys;
    },
  };
}
