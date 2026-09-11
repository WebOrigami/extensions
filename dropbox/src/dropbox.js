import { args } from "@weborigami/async-tree";
import { coreGlobals, HandleExtensionsTransform } from "@weborigami/language";
import DropboxMap from "./DropboxMap.js";

/**
 * Return an AsyncMap for files on Dropbox.
 *
 * @param {{ app_key: string, app_secret: string, refresh_token: string }}
 * options
 * @param {*} state
 * @returns {Promise<DropboxMap>}
 */
export default async function dropbox(options, state) {
  const { app_key, app_secret, refresh_token, path } = await args.options(
    options,
    "Dropbox",
    {
      app_key: {},
      app_secret: {},
      refresh_token: {},
      path: { required: false },
    },
  );

  const accessToken = await getAccessToken(app_key, app_secret, refresh_token);
  const tree = new (HandleExtensionsTransform(DropboxMap))({
    accessToken,
    path,
  });

  // Set globals for extension handlers
  tree.globals = state?.globals || (await coreGlobals());

  return tree;
}
dropbox.needsState = true;

/**
 * Given Dropbox credentials, get an access token.
 *
 * @returns {Promise<string>} The access token
 */
async function getAccessToken(app_key, app_secret, refresh_token) {
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
