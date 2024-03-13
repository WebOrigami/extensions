import { Tree } from "@weborigami/async-tree";
import * as utilities from "@weborigami/origami";
import Handlebars from "handlebars";

/**
 * A Handlebars template file
 *
 * Unpacking a Handlebars template returns a function that applies the template.
 */
export default {
  /** @type {import("@weborigami/language").FileUnpackFunction} */
  async unpack(input, options = {}) {
    const text = utilities.toString(input);
    const templateFn = Handlebars.compile(text);
    const fn = async (treelike) => {
      const plain = await Tree.plain(treelike);
      return templateFn(plain);
    };
    return fn;
  },
};
