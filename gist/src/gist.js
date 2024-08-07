import { ObjectTree } from "@weborigami/async-tree";
import { HandleExtensionsTransform } from "@weborigami/language";

export default async function gist(gistId) {
  const gistIdRegex = /[a-f0-9]{32}/;
  if (!gistIdRegex.test(gistId)) {
    return undefined;
  }
  const gistUrl = `https://api.github.com/gists/${gistId}`;
  const headers = new Headers({
    Accept: "application/vnd.github.v3+json",
    Authorization: `Bearer ${token}`,
  });
  const response = await fetch(gistUrl, { headers });
  if (!response.ok) {
    return undefined;
  }

  const { files } = await response.json();
  // Top-level `files` has the actual file content in `content` properties.
  const contents = {};
  for (const [name, file] of Object.entries(files)) {
    contents[name] = file.content;
  }

  // Add file extension handling
  const tree = new (HandleExtensionsTransform(ObjectTree))(contents);
  tree.parent = this;
  return tree;
}
