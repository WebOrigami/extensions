import { DeepMapTree, keysFromPath } from "@weborigami/async-tree";
import { OrigamiTransform, Scope } from "@weborigami/language";
import Zip from "adm-zip";

export default async function unzip(buffer) {
  const zip = new Zip(buffer);

  const files = new Map();
  for (const entry of zip.getEntries()) {
    const path = entry.entryName;
    const value = entry.getData();
    // Skip directory entries -- we'll create them as needed.
    if (!path.endsWith("/")) {
      addToMap(files, path, value);
    }
  }

  // Convert deep map structure to async tree.
  let tree = new (OrigamiTransform(DeepMapTree))(files);
  if (this) {
    tree = Scope.treeWithScope(tree, this);
  }

  return tree;
}

function addToMap(map, path, value) {
  // Turn the path into a list of keys.
  const keys = keysFromPath(path);

  const filename = keys.pop();

  // Traverse to the appropriate parent, creating submaps as needed.
  let parent = map;
  for (const key of keys) {
    if (!parent.has(key)) {
      parent.set(key, new Map());
    }
    parent = parent.get(key);
  }

  // Set the value in the final parent.
  parent.set(filename, value);
}
