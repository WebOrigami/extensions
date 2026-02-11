import { isUnpackable } from "@weborigami/async-tree";

/**
 * Given a Netlify site ID, return the list of files Netlify has for it.
 *
 * @param {{ id: string, token: string }} options
 */
export default async function files(options) {
  if (isUnpackable(options)) {
    options = await options.unpack();
  }

  let { id, token } = options;

  if (id !== undefined && (typeof id !== "string" || id.length === 0)) {
    throw new ReferenceError("deploy: site id must be a non-empty string.");
  }
  if (isUnpackable(token)) {
    token = await token.unpack();
    token = token.trim();
  }
  if (typeof token !== "string" || token.length === 0) {
    throw new ReferenceError("deploy: token was not provided");
  }

  const url = `https://api.netlify.com/api/v1/sites/${id}/files`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Netlify API request failed with status ${response.status}: ${errorText}`,
    );
  }

  const data = await response.json();
  return data;
}
