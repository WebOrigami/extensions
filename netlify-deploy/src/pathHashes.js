import { isUnpackable, trailingSlash, Tree } from "@weborigami/async-tree";
import crypto from "node:crypto";
import toBuffer from "./toBuffer.js";

/**
 * Return an object whose keys are paths for all resources in the map-based tree
 * and whose values are the hashes of those resources.
 *
 * @param {import("@weborigami/async-tree").Maplike} maplike
 * @param {{ base?: string }} options
 */
export default async function pathHashes(maplike, options = {}) {
  if (isUnpackable(maplike)) {
    maplike = await maplike.unpack();
  }
  const tree = Tree.from(maplike, { deep: true });
  const base = options.base ?? "/";

  const result = {};

  for await (const key of tree.keys()) {
    const separator = trailingSlash.has(base) ? "" : "/";
    const encodedKey = encodeURIComponent(trailingSlash.remove(key));
    const valuePath = `${base}${separator}${encodedKey}`;
    const value = await tree.get(key);
    if (Tree.isMaplike(value)) {
      // Subtree; recurse
      const subPaths = await pathHashes(value, { base: valuePath });
      Object.assign(result, subPaths);
    } else {
      result[valuePath] = hash(value, valuePath);
    }
  }

  return result;
}

function hash(value, valuePath) {
  const buffer = toBuffer(value, valuePath);
  return crypto.createHash("sha1").update(buffer).digest("hex");
}
