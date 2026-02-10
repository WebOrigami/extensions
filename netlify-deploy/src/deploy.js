import { isUnpackable, Tree } from "@weborigami/async-tree";
import pathHashes from "./pathHashes.js";

const TypedArray = Object.getPrototypeOf(Uint8Array);

/**
 * Upload the given maplike to the indicated Netlify site.
 *
 * @param {import("@weborigami/async-tree").Maplike} maplike
 * @param {{ siteId: string, token: string }} options
 */
export default async function deploy(maplike, options) {
  if (isUnpackable(maplike)) {
    maplike = await maplike.unpack();
  }
  let { siteId, token } = options;
  if (!siteId) {
    throw new ReferenceError("deploy: siteId was not provided");
  }
  if (isUnpackable(token)) {
    token = await token.unpack();
  }
  if (!token) {
    throw new ReferenceError("deploy: token was not provided");
  }

  // Send Netlify the hashes of all files in the tree to see what it wants us to upload.
  const files = await pathHashes(maplike);
  const response = await fetch(
    `https://api.netlify.com/api/v1/sites/${siteId}/deploys`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ files }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Netlify API request failed with status ${response.status}: ${errorText}`,
    );
  }

  const data = await response.json();

  // console.log(data);

  // See what we need to upload.
  const { id, required, ssl_url } = data;
  if (required.length === 0) {
    console.log("No files needed to be uploaded.");
    return;
  }

  // Netlify gives us a set of hashes. For each one, find the first path in our
  // tree that has that hash.
  const uploadPaths = required.map((hash) => {
    const path = Object.keys(files).find((path) => files[path] === hash);
    if (!path) {
      throw new Error(
        `Netlify requested a file with hash ${hash} that we don't have!`,
      );
    }
    return path;
  });

  // Upload each required file.
  const deployUrl = `https://api.netlify.com/api/v1/deploys/${id}/files`;
  for (const path of uploadPaths) {
    const value = await Tree.traversePath(maplike, path);
    const body =
      typeof value === "string" || value instanceof String
        ? new TextEncoder().encode(value)
        : value;
    const uploadUrl = `${deployUrl}/${encodePath(path)}`;
    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Length": body.length,
        Authorization: `Bearer ${token}`,
      },
      body,
    });
    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(
        `Failed to upload ${path} to Netlify with status ${uploadResponse.status}: ${errorText}`,
      );
    }
  }

  console.log(
    `Uploaded ${uploadPaths.length} files to Netlify.\nDeploy should be live at: ${ssl_url}`,
  );
}

function encodePath(path) {
  return path.split("/").map(encodeURIComponent).join("/");
}
