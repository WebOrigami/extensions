import {
  isUnpackable,
  toPlainValue,
  toString,
  Tree,
} from "@weborigami/async-tree";
import { Liquid } from "liquidjs";

export default {
  mediaType: "text/plain",

  /** @type {import("@weborigami/language").UnpackFunction} */
  async unpack(packed, options = {}) {
    // If a parent was supplied, provide a virtual file system for it
    const liquidOptions = options.parent
      ? { fs: liquidFs(options.parent) }
      : {};
    const engine = new Liquid(liquidOptions);

    const text = toString(packed);
    const templateFn = engine.parse(text);

    return async (input) => {
      if (isUnpackable(input)) {
        input = await input.unpack();
      }
      const data = input ? await toPlainValue(input) : null;
      return engine.render(templateFn, data);
    };
  },
};

// Return a Liquid virtual file system backed by the given tree.
// See https://liquidjs.com/api/interfaces/FS.html
function liquidFs(treelike) {
  const tree = Tree.from(treelike);
  return {
    // TODO
    contains(root, file) {
      return true;
    },

    // TODO
    dirname(filePath) {
      debugger;
      return filePath.substring(0, filePath.lastIndexOf("/"));
    },

    // TODO
    async exists(filePath) {
      return true;
    },

    async readFile(filePath) {
      const value = await tree.get(filePath);
      return value ? toString(value) : undefined;
    },

    // TODO
    resolve(dir, file, ext) {
      return file;
    },

    sep: "/",
  };
}
