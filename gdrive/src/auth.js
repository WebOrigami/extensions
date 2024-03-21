import { Tree } from "@weborigami/async-tree";
import { OrigamiTransform, Scope } from "@weborigami/language";
import * as googleApis from "googleapis";
import GoogleDriveTree from "./GoogleDriveTree.js";

const scopes = [
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/spreadsheets.readonly",
];

export default async function auth(credentialsTreelike) {
  const credentials = await Tree.plain(credentialsTreelike);
  const auth = new googleApis.google.auth.GoogleAuth({ credentials, scopes });
  const scope = this;
  return (folderId) => {
    let tree = new (OrigamiTransform(GoogleDriveTree))(auth, folderId);
    tree = Scope.treeWithScope(tree, scope);
    return tree;
  };
}
