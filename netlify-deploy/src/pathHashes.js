import { Tree } from "@weborigami/async-tree";
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
  const base = options.base ?? "/";
  const deflated = await Tree.deflatePaths(maplike, base);

  // Map values to hashes
  const mapped = await Tree.map(deflated, hash);
  const plain = await Tree.plain(mapped);
  return plain;
}

function hash(value, valuePath) {
  const buffer = toBuffer(value, valuePath);
  return crypto.createHash("sha1").update(buffer).digest("hex");
}
