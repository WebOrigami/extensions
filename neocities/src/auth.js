import { isUnpackable } from "@weborigami/async-tree";
import { coreGlobals, HandleExtensionsTransform } from "@weborigami/language";
import NeocitiesMap from "./NeocitiesMap.js";

export default async function auth(token, state) {
  if (isUnpackable(token)) {
    token = await token.unpack();
    token = token.trim();
  }
  if (typeof token !== "string" || token.length === 0) {
    throw new ReferenceError("Neocities: token was not provided");
  }

  const tree = new (HandleExtensionsTransform(NeocitiesMap))(token);

  // Set globals for extension handlers
  const globals = state?.globals || (await coreGlobals());
  tree.globals = globals;

  return tree;
}
auth.needsState = true;
