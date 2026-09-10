import { args } from "@weborigami/async-tree";
import { coreGlobals, HandleExtensionsTransform } from "@weborigami/language";
import NeocitiesMap from "./NeocitiesMap.js";

/**
 * Return an AsyncMap for the files in a Neocities site.
 *
 * @param {{ token: string|Uint8Array, url: string }} options
 * @param {*} state
 * @returns {Promise<NeocitiesMap>}
 */
export default async function neocities(options, state) {
  let { token, url } = await args.options(options, "Neocities", {
    token: {},
    url: { required: false },
  });

  token = token.trim();
  if (url && !(url.startsWith("http://") || url.startsWith("https://"))) {
    url = `https://${url}`;
  }

  const tree = new (HandleExtensionsTransform(NeocitiesMap))({ token, url });

  // Set globals for extension handlers
  tree.globals = state?.globals || (await coreGlobals());

  return tree;
}
neocities.needsState = true;
