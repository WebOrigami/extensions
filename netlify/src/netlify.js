import { args } from "@weborigami/async-tree";
import {
  HandleExtensionsTransform,
  initializeGlobalsFromContext,
} from "@weborigami/language";
import NetlifyMap from "./NetlifyMap.js";

/**
 * Return an AsyncMap for the files in a Netlify project.
 *
 * @param {{ projectId: string, projectName: string, token: string }} options
 * @returns {Promise<NetlifyMap>}
 */
export default async function netlify(options) {
  let { projectId, projectName, token } = await args.dictionary(
    options,
    "Netlify",
    {
      projectId: {},
      projectName: {},
      token: { type: "stringlike" },
    },
  );

  token = token.trim();

  const tree = new (HandleExtensionsTransform(NetlifyMap))({
    projectId,
    projectName,
    token,
  });

  // Set globals for extension handlers
  tree.globals = await initializeGlobalsFromContext();

  return tree;
}
netlify.unpackArgs = true;
