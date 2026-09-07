import { isUnpackable } from "@weborigami/async-tree";
import { coreGlobals, HandleExtensionsTransform } from "@weborigami/language";
import NeocitiesMap from "./NeocitiesMap.js";

/**
 * Return a NeocitiesMap for the given options.
 *
 * @param {{ token: string|Uint8Array, url?: string }} options
 * @param {*} state
 * @returns {Promise<NeocitiesMap>}
 */
export default async function auth(options, state) {
  let { token, url } = options;

  if (isUnpackable(token)) {
    token = await token.unpack();
    token = token.trim();
  }
  if (typeof token !== "string" || token.length === 0) {
    throw new ReferenceError("Neocities: token was not provided");
  }

  if (url && !(url.startsWith("http://") || url.startsWith("https://"))) {
    url = `https://${url}`;
  }

  const tree = new (HandleExtensionsTransform(NeocitiesMap))({ token, url });

  // Set globals for extension handlers
  const globals = state?.globals || (await coreGlobals());
  tree.globals = globals;

  return tree;
}
auth.needsState = true;
