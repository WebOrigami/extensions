import { args } from "@weborigami/async-tree";
import {
  HandleExtensionsTransform,
  initializeGlobalsFromContext,
} from "@weborigami/language";
import NeocitiesMap from "./NeocitiesMap.js";

/**
 * Return an AsyncMap for the files in a Neocities site.
 *
 * @param {{ token: string|Uint8Array, url: string }} options
 * @returns {Promise<NeocitiesMap>}
 */
export default async function neocities(options) {
  let { token, url, path } = await args.dictionary(options, "Neocities", {
    path: { required: false },
    token: {},
    url: { required: false },
  });

  token = token.trim();
  if (url && !(url.startsWith("http://") || url.startsWith("https://"))) {
    url = `https://${url}`;
  }

  const tree = new (HandleExtensionsTransform(NeocitiesMap))({
    token,
    url,
    path,
  });

  // Set globals for extension handlers
  tree.globals = await initializeGlobalsFromContext();

  return tree;
}
