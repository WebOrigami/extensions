import { Tree } from "@weborigami/async-tree";
import { HandleExtensionsTransform } from "@weborigami/language";
import * as googleApis from "googleapis";
import GoogleDriveTree from "./GoogleDriveTree.js";

const scopes = [
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/spreadsheets.readonly",
];

export default async function auth(credentialsTreelike) {
  const credentials = await Tree.plain(credentialsTreelike);
  const auth = new googleApis.google.auth.GoogleAuth({ credentials, scopes });

  // Because of latency, we don't want to include Dropbox trees in scope.
  // We give the tree the same scope as the calling scope.
  const scope = this;

  return (folderId) => {
    const tree = new (HandleExtensionsTransform(GoogleDriveTree))(
      auth,
      folderId
    );
    tree.scope = scope;
    return tree;
  };
}
