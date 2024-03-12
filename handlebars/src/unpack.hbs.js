import { Tree } from "@weborigami/async-tree";
import * as utilities from "@weborigami/origami";
import Handlebars from "handlebars";

/**
 * Load a file as a Handlebars template and return a function that applies the
 * template.
 *
 * @type {import("@weborigami/language").FileUnpackFunction}
 */
export default async function unpackText(input, options = {}) {
  const text = utilities.toString(input);
  const templateFn = Handlebars.compile(text);
  const fn = async (treelike) => {
    const plain = await Tree.plain(treelike);
    return templateFn(plain);
  };
  return fn;
}
