import { Tree } from "@weborigami/async-tree";
import { HandleExtensionsTransform } from "@weborigami/language";
import * as googleApis from "googleapis";
import GoogleDriveMap from "./GoogleDriveMap.js";

const scopes = [
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/spreadsheets.readonly",
];

export default async function auth(credentialsTreelike) {
  const credentials = await Tree.plain(credentialsTreelike);
  const auth = new googleApis.google.auth.GoogleAuth({ credentials, scopes });
  return (folderId) => {
    const tree = new (HandleExtensionsTransform(GoogleDriveMap))(
      auth,
      folderId
    );
    return tree;
  };
}
