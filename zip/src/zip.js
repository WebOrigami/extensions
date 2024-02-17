import { DeepObjectTree, Tree, isPlainObject } from "@weborigami/async-tree";
import Zip from "adm-zip";

/**
 * Package a tree of files as a ZIP file in Buffer form.
 *
 * @param {import("@weborigami/async-tree").Treelike} treelike
 */
export default async function zip(treelike) {
  // If the input is a plain object, we'll treat it as a deep object tree.
  const tree =
    !Tree.isAsyncTree(treelike) && isPlainObject(treelike)
      ? new DeepObjectTree(treelike)
      : Tree.from(treelike);
  // The ZIP file should leave the files in tree order.
  const zip = new Zip({ noSort: true });
  await traversePaths(tree, (value, path) => {
    if (value instanceof String) {
      value = String(value);
    }
    zip.addFile(path, value);
  });
  const buffer = zip.toBuffer();
  return buffer;
}

/**
 * Traverse the tree, invoking the given callback function for each
 * value. Pass the value and path to the callback function.
 *
 * @param {import("@weborigami/types").AsyncTree} tree
 * @param {Function} fn
 * @param {string} [base]
 */
async function traversePaths(tree, fn, base = "") {
  for (const key of await tree.keys()) {
    const path = base ? `${base}/${key}` : key;
    const value = await tree.get(key);
    if (Tree.isAsyncTree(value)) {
      await traversePaths(value, fn, path);
    } else {
      await fn(value, path);
    }
  }
}
