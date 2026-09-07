import { isUnpackable } from "@weborigami/async-tree";
import { coreGlobals, HandleExtensionsTransform } from "@weborigami/language";
import NetlifyMap from "./NetlifyMap.js";

/**
 * Return a NetlifyMap for the given options.
 *
 * @param {{ projectId: string, projectName: string, token: string|Uint8Array }} options
 * @param {*} state
 * @returns {Promise<NetlifyMap>}
 */
export default async function auth(options, state) {
  let { projectId, projectName, token } = options;

  if (typeof projectId !== "string" || projectId.length === 0) {
    throw new ReferenceError("Netlify: projectId was not provided");
  }
  if (typeof projectName !== "string" || projectName.length === 0) {
    throw new ReferenceError("Netlify: projectName was not provided");
  }
  if (isUnpackable(token)) {
    token = await token.unpack();
    token = token.trim();
  }
  if (typeof token !== "string" || token.length === 0) {
    throw new ReferenceError("Netlify: token was not provided");
  }

  const tree = new (HandleExtensionsTransform(NetlifyMap))({
    projectId,
    projectName,
    token,
  });

  // Set globals for extension handlers
  const globals = state?.globals || (await coreGlobals());
  tree.globals = globals;

  return tree;
}
auth.needsState = true;
