import { isUnpackable, Tree } from "@weborigami/async-tree";
import fetchWithBackoff from "./fetchWithBackoff.js";
import mapLimit from "./mapLimit.js";
import pathHashes from "./pathHashes.js";
import toBuffer from "./toBuffer.js";

/**
 * Upload the given maplike to the indicated Netlify site.
 *
 * @typedef {import("@weborigami/async-tree").Maplike} Maplike
 *
 * @param {{ site: Maplike, id?: string, name?: string, token: string }} options
 */
export default async function deploy(options) {
  if (isUnpackable(options)) {
    options = await options.unpack();
  }

  let { site, id, name, token } = options;

  if (isUnpackable(site)) {
    site = await site.unpack();
  }

  if (id === undefined && name === undefined) {
    throw new Error(
      "deploy: You must provide either a project name or a project/site id.",
    );
  }
  if (id !== undefined && (typeof id !== "string" || id.length === 0)) {
    throw new ReferenceError("deploy: site id must be a non-empty string.");
  }
  if (name !== undefined && (typeof name !== "string" || name.length === 0)) {
    throw new ReferenceError(
      "deploy: project name must be a non-empty string.",
    );
  }

  if (isUnpackable(token)) {
    token = await token.unpack();
    token = token.trim();
  }
  if (typeof token !== "string" || token.length === 0) {
    throw new ReferenceError("deploy: token was not provided");
  }

  id ??= await getSiteId(name, token);

  const files = await pathHashes(site);
  const body = JSON.stringify({ files });
  const response = await fetch(
    `https://api.netlify.com/api/v1/sites/${id}/deploys`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body,
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

  // See what files Netlify wants.
  const { id: deployId, required, ssl_url } = data;
  if (required.length === 0) {
    console.log(`Site is up to date: ${ssl_url}`);
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
  const deployUrl = `https://api.netlify.com/api/v1/deploys/${deployId}/files`;
  await mapLimit(
    uploadPaths,
    (path) => uploadFile(site, path, deployUrl, token),
    8,
  );

  console.log(`Uploaded ${uploadPaths.length} file(s) to ${ssl_url}`);
}

function encodePath(path) {
  return path.split("/").map(encodeURIComponent).join("/");
}

async function getSiteId(name, token) {
  const response = await fetch(`https://api.netlify.com/api/v1/sites`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to look up site id for project name ${name} with status ${response.status}: ${errorText}`,
    );
  }
  const data = await response.json();
  const site = data.find((site) => site.name === name);
  if (!site) {
    throw new Error(`No Netlify site found with name ${name}`);
  }

  return site.id;
}

// Upload the file at the given path to Netlify
async function uploadFile(site, path, deployUrl, token) {
  const value = await Tree.traversePath(site, path);
  const body = toBuffer(value, path);
  const uploadUrl = `${deployUrl}/${encodePath(path)}`;
  const uploadResponse = await fetchWithBackoff(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": "application/octet-stream",
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
