import { Tree } from "@weborigami/async-tree";
import {
  HandleExtensionsTransform,
  initializeGlobalsForTree,
} from "@weborigami/language";
import * as googleApis from "googleapis";
import GoogleDriveMap from "./GoogleDriveMap.js";

const scopes = [
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/documents.readonly",
  "https://www.googleapis.com/auth/spreadsheets.readonly",
];

export default async function auth(credentialsTreelike, state) {
  const credentials = await Tree.plain(credentialsTreelike);
  const auth = new googleApis.google.auth.GoogleAuth({ credentials, scopes });
  const parent = state?.parent;
  await initializeGlobalsForTree(parent);
  return (folderId) => {
    const tree = new (HandleExtensionsTransform(GoogleDriveMap))(
      auth,
      folderId,
    );
    tree.globals = parent.globals;
    return tree;
  };
}
auth.needsState = true;
