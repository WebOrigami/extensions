import { GraphHelpers } from "@graphorigami/origami";
import * as googleApis from "googleapis";
import GoogleDriveGraph from "./GoogleDriveGraph.js";

const scopes = [
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/spreadsheets.readonly",
];

export default async function gdrive(credentialsGraph) {
  const credentials = await GraphHelpers.plain(credentialsGraph);
  const auth = new googleApis.google.auth.GoogleAuth({ credentials, scopes });
  return (folderId) => new GoogleDriveGraph(auth, folderId);
}
