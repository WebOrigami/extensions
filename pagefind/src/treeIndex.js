import { keysFromPath, Tree } from "@weborigami/async-tree";
import * as pagefind from "pagefind";

export default async function treeIndexFiles(treelike, basePath = "") {
  const { index } = await pagefind.createIndex();

  await treeIndex(treelike, { index, basePath });

  const result = {};
  const { files } = await index.getFiles();
  for (const file in files) {
    const { path, content } = files[file];
    const keys = keysFromPath(path);
    addValueToObject(result, keys, content);
  }

  return result;
}

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

async function treeIndex(treelike, options) {
  const tree = Tree.from(treelike);
  const { index, basePath } = options;
  for (const key of await tree.keys()) {
    const path = `${basePath}/${key}`;
    const value = await tree.get(key);
    if (Tree.isAsyncTree(value)) {
      await treeIndex(value, { index, basePath: path });
      continue;
    } else if (!key.endsWith(".html")) {
      continue;
    }
    await index.addHTMLFile({
      url: path,
      content: String(value),
    });
  }
}
