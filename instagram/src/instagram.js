import { isUnpackable, toString } from "@weborigami/async-tree";
import InstagramMediaTree from "./InstagramMediaTree.js";

export default async function instagram(token, userId = "me") {
  if (isUnpackable(token)) {
    token = await token.unpack();
  }
  token = toString(token);
  if (!token) {
    throw new Error("The Instagram access token was not defined.");
  }
  return new InstagramMediaTree(token, userId);
}
