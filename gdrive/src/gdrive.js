import { args, Tree } from "@weborigami/async-tree";
import { coreGlobals, HandleExtensionsTransform } from "@weborigami/language";
import * as googleApis from "googleapis";
import GoogleDriveMap from "./GoogleDriveMap.js";

const scopes = [
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/documents.readonly",
  "https://www.googleapis.com/auth/spreadsheets.readonly",
];

/**
 * Return an AsyncMap for files on Google Drive.
 *
 * @param {*} options
 * @param {*} state
 * @returns {Promise<GoogleDriveMap>}
 */
export default async function gdrive(options, state) {
  const optionsMap = await args.map(options, "gdrive");
  const optionsPlain = await Tree.plain(optionsMap);

  const auth = new googleApis.google.auth.GoogleAuth({
    credentials: optionsPlain,
    scopes,
  });

  // Get globals for extension handlers
  const globals = state?.globals || (await coreGlobals());

  // We can't create a GoogleDriveMap without knowing what folder ID the user
  // wants, so we return a function that takes the folder ID as an argument.
  return (folderId) => {
    const tree = new (HandleExtensionsTransform(GoogleDriveMap))(
      auth,
      folderId,
    );
    tree.globals = globals;
    return tree;
  };
}
gdrive.needsState = true;
