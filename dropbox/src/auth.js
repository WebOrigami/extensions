import { Tree } from "@weborigami/async-tree";
import { HandleExtensionsTransform } from "@weborigami/language";
import DropboxTree from "./DropboxTree.js";

export default async function auth(credentialsTreelike, path) {
  const credentials = await Tree.plain(credentialsTreelike);
  const accessToken = await getAccessToken(credentials);
  let tree = new (HandleExtensionsTransform(DropboxTree))(accessToken, path);
  // Because of latency, we don't want to include Dropbox trees in scope.
  // We give the tree the same scope as the calling scope.
  tree.scope = this;
  return tree;
}

/**
 * Given Dropbox credentials, get an access token.
 *
 * @returns {Promise<string>} The access token
 */
async function getAccessToken(credentials) {
  const { app_key, app_secret, refresh_token } = credentials;
  const basicAuth = btoa(`${app_key}:${app_secret}`);
  const response = await fetch("https://api.dropbox.com/oauth2/token", {
    method: "POST",
    headers: { Authorization: `Basic ${basicAuth}` },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refresh_token,
    }),
  });

  const json = await response?.json();

  if (!json.access_token) {
    throw new Error("Could not get access token");
  }

  return json.access_token;
}
