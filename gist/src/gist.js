import { ObjectTree, isUnpackable, toString } from "@weborigami/async-tree";
import { HandleExtensionsTransform } from "@weborigami/language";

/**
 * Returns a tree for a gist.
 *
 * The token parameter must be a string containing a GitHub personal access
 * token, or a packed form (e.g., a Buffer) containing such a token.
 *
 * If a gistId is provided, the tree will be fetched immediately. Otherwise,
 * this returns a function that can be called with a gistId to fetch the tree.
 *
 * @param {string|Packed} token
 * @param {string?} gistId
 */
export default async function gist(token, gistId) {
  if (isUnpackable(token)) {
    token = await token.unpack();
  }
  token = toString(token);
  if (!token) {
    throw new Error("gist: The GitHub personal access token was not defined.");
  }
  return gistId ? treeForGist(token, gistId) : treeForGist.bind(this, token);
}

async function treeForGist(token, gistId) {
  const gistIdRegex = /[a-f0-9]{32}/;
  if (!gistIdRegex.test(gistId)) {
    throw `gist: Invalid gist ID: ${gistId}`;
  }
  const gistUrl = `https://api.github.com/gists/${gistId}`;
  const headers = new Headers({
    Accept: "application/vnd.github.v3+json",
    Authorization: `Bearer ${token}`,
  });
  const response = await fetch(gistUrl, { headers });
  if (!response.ok) {
    throw `Failed to fetch gist ${gistId}: ${response.statusText}`;
  }

  const { files } = await response.json();
  // Top-level `files` has the actual file content in `content` properties.
  const contents = {};
  for (const [name, file] of Object.entries(files)) {
    contents[name] = file.content;
  }

  // Add file extension handling
  const tree = new (HandleExtensionsTransform(ObjectTree))(contents);
  return tree;
}
