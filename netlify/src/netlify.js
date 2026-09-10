import { args } from "@weborigami/async-tree";
import { coreGlobals, HandleExtensionsTransform } from "@weborigami/language";
import NetlifyMap from "./NetlifyMap.js";

/**
 * Return an AsyncMap for the files in a Netlify project.
 *
 * @param {{ projectId: string, projectName: string, token: string }} options
 * @param {*} state
 * @returns {Promise<NetlifyMap>}
 */
export default async function netlify(options, state) {
  let { projectId, projectName, token } = await args.options(
    options,
    "Netlify",
    {
      projectId: {},
      projectName: {},
      token: {},
    },
  );

  token = token.trim();

  const tree = new (HandleExtensionsTransform(NetlifyMap))({
    projectId,
    projectName,
    token,
  });

  // Set globals for extension handlers
  tree.globals = state?.globals || (await coreGlobals());
  return tree;
}
netlify.needsState = true;
