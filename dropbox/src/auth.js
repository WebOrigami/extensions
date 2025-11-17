import { Tree } from "@weborigami/async-tree";
import { HandleExtensionsTransform } from "@weborigami/language";
import DropboxMap from "./DropboxMap.js";

// Map of app secret to access token.
const accessTokenMap = new Map();

// Dictionary of access token to DropboxTree.
const treeMap = {};

export default async function auth(credentialsTreelike) {
  if (!credentialsTreelike) {
    throw new ReferenceError("Missing Dropbox credentials");
  }

  const credentials = await Tree.plain(credentialsTreelike);

  let accessToken = accessTokenMap.get(credentials.app_secret);
  if (!accessToken) {
    accessToken = await getAccessToken(credentials);
    accessTokenMap.set(credentials.app_secret, accessToken);
  }

  let tree = treeMap[accessToken];
  if (!tree) {
    tree = new (HandleExtensionsTransform(DropboxMap))(accessToken);
    treeMap[accessToken] = tree;
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
