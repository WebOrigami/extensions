import { Tree } from "@weborigami/async-tree";
import Zip from "adm-zip";

/**
 * Package a tree of files as a ZIP file in Buffer form.
 *
 * @param {import("@weborigami/async-tree").Treelike} treelike
 */
export default async function zip(treelike) {
  const tree = Tree.from(treelike);
  const zip = new Zip();
  await traversePaths(tree, (value, path) => {
    // if (path.startsWith("src/")) {
    //   zip.addFile("src/", Buffer.alloc(0));
    // }
    if (value instanceof String) {
      value = String(value);
    }
    if (typeof value === "string") {
      value = Buffer.from(value, "utf8");
    }
    zip.addFile(path, value);
    // zip.addFile(path, buffer);
  });
  // zip.addFile("sub/hello.txt", "Hello");
  // zip.addFile("sub/goodbye.txt", "Goodbye");
  // zip.addFile("ReadMe.md", "This is a ReadMe file.");

  // for (const entry of zip.getEntries()) {
  //   console.error(entry.entryName);
  // }

  const buffer = zip.toBuffer();
  return buffer;
}

/**
 * Traverse the tree, invoking the given callback function for each
 * value. Pass the value, path, and tree to the callback function.
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
      await fn(value, path, tree);
    }
  }
}
