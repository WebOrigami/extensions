import { isUnpackable, toString } from "@weborigami/async-tree";

export default async function auth(githubToken) {
  if (isUnpackable(githubToken)) {
    githubToken = toString(await githubToken.unpack());
  }
}
