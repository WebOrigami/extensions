import { Tree } from "@weborigami/async-tree";
import { FileLoadersTransform } from "@weborigami/language";
import * as googleApis from "googleapis";
import GoogleDriveTree from "./GoogleDriveTree.js";

const scopes = [
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/spreadsheets.readonly",
];

export default async function auth(credentialsTreelike) {
  const credentials = await Tree.plain(credentialsTreelike);
  const auth = new googleApis.google.auth.GoogleAuth({ credentials, scopes });
  return (folderId) =>
    new (FileLoadersTransform(GoogleDriveTree))(auth, folderId);
}
