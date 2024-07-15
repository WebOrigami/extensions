import { Tree } from "@weborigami/async-tree";
import { HandleExtensionsTransform } from "@weborigami/language";
import DropboxTree from "./DropboxTree.js";

// Map of app secret to access token.
const accessTokenMap = new Map();

// Dictionary of access token to path to DropboxTree.
const treeMap = {};

export default async function auth(credentialsTreelike, path) {
  const credentials = await Tree.plain(credentialsTreelike);

  let accessToken = accessTokenMap.get(credentials.app_secret);
  if (!accessToken) {
    accessToken = await getAccessToken(credentials);
    accessTokenMap.set(credentials.app_secret, accessToken);
  }

  if (path === undefined || path === "/") {
    // Dropbox wants the root path as the empty string.
    path = "";
  } else if (path !== "" && !path?.startsWith("/")) {
    // Dropbox wants all other paths to start with a slash.
    path = `/${path}`;
  }

  let tree = treeMap[accessToken]?.[path];
  if (!tree) {
    tree = new (HandleExtensionsTransform(DropboxTree))(accessToken, path);
    tree.parent = this;
    treeMap[accessToken] ??= {};
    treeMap[accessToken][path] = tree;
  }

  return tree;
}

/**
 * Given Dropbox credentials, get an access token.
 *
 * @returns {Promise<string>} The access token
 */
async function getAccessToken(credentials) {
  const { app_key, app_secret, refresh_token } = credentials;
  if (!app_key || !app_secret || !refresh_token) {
    throw new Error("Missing Dropbox credentials");
  }
  const basicAuth = btoa(`${app_key}:${app_secret}`);
  let response;
  try {
    response = await fetch("https://api.dropbox.com/oauth2/token", {
      method: "POST",
      headers: { Authorization: `Basic ${basicAuth}` },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refresh_token,
      }),
    });
  } catch (error) {
    throw new Error(`Could not get access token: ${error}`);
  }

  if (!response.ok) {
    throw new Error(`Could not get access token: ${response.statusText}`);
  }

  const json = await response?.json();
  return json.access_token;
}
