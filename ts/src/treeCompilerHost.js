import {
  DeepObjectTree,
  keysFromPath,
  toString,
  Tree,
} from "@weborigami/async-tree";
import ts from "typescript";

/**
 * Given a tree including JavaScript and TypeScript files, copy the tree to
 * create a new tree that can be used as a TypeScript compiler host. The
 * resulting host will be both a TypeScript compiler host and an AsyncTree.
 *
 * Any subsequent writes to the host -- for example, when the TypeScript
 * compiler compiles a program -- will *not* update the original tree.
 *
 * @typedef {import("@weborigami/async-tree").Treelike} Treelike
 * @param {Treelike} treelike
 */
export default async function treeCompilerHost(treelike) {
  const plain = await Tree.plain(treelike);
  return new TreeCompilerHost(plain);
}

/**
 * A TypeScript compiler host that reads and writes files from a plain object.
 * This subclasses DeepObjectTree so that it can be used as an AsyncTree too.
 *
 * Note: TypeScript docs call the first argument to functions like getSourceFile
 * and writeFile `fileName`, but it's actually a slash-separated path.
 */
class TreeCompilerHost extends DeepObjectTree {
  fileExists(filePath) {
    return traversePath(this.object, filePath) !== undefined;
  }

  getCanonicalFileName(fileName) {
    return fileName;
  }

  getCurrentDirectory() {
    return "/";
  }

  getDefaultLibFileName() {
    return "";
  }

  getSourceFile(filePath) {
    return ts.createSourceFile(
      filePath,
      toString(traversePath(this.object, filePath))
    );
  }

  readFile(filePath) {
    return toString(traversePath(this.object, filePath));
  }

  useCaseSensitiveFileNames() {
    return true;
  }

  writeFile(filePath, contents) {
    const keys = keysFromPath(filePath);
    const fileName = keys.pop();
    // Traverse to the appropriate parent object, creating any missing objects.
    let current = this.object;
    for (const key of keys) {
      if (!current[key]) {
        current[key] = {};
      }
      current = current[key];
    }
    current[fileName] = contents;
  }
}

// Traverse the path in a plain object.
function traversePath(plain, path) {
  const keys = keysFromPath(path);
  let current = plain;
  for (const key of keys) {
    if (!key) {
      continue;
    }
    current = current[key];
    if (!current) {
      return undefined;
    }
  }
  return current;
}
