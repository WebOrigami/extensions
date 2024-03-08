import { google } from "googleapis";
const docs = google.docs("v1");

export default async function gdoc(auth, key) {
  // Remove .gdoc extension if present
  const documentId = key.replace(/\.gdoc$/, "");
  const request = { documentId, auth };
  let response;
  try {
    response = (await docs.documents.get(request)).data;
  } catch (err) {
    console.error(err);
    return undefined;
  }

  const text = JSON.stringify(response, null, 2);
  const result = new String(text);
  result.unpack = () => response;
  return result;
}
