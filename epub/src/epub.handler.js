import { Tree } from "@weborigami/async-tree";
import zipHandler from "@weborigami/zip";

/**
 * Handler for EPUB files
 */
export default {
  mediaType: "application/epub+zip",

  /**
   * Package a tree of files as an EPUB file in Buffer form.
   *
   * This calls the pack() method for ZIP files, but ensures the `mimetype` file
   * is the first file in the package -- a requirement for EPUB files.
   *
   * @param {import("@weborigami/async-tree").Treelike} treelike
   */
  async pack(treelike) {
    const tree = Tree.from(treelike);
    return zipHandler.pack(mimetypeFirst(tree));
  },

  unpack: zipHandler.unpack,
};

// A tree with its `mimetype` file first
function mimetypeFirst(tree) {
  return {
    async get(key) {
      return tree.get(key);
    },

    async keys() {
      const keys = [...(await tree.keys())];
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
