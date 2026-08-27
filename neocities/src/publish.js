import { isUnpackable, Tree } from "@weborigami/async-tree";
import { fetchWithBackoff } from "@weborigami/origami";
import crypto from "node:crypto";

/**
 * Upload the given maplike to the indicated Neocities site.
 *
 * @typedef {import("@weborigami/async-tree").Maplike} Maplike
 *
 * @param {Maplike} maplike
 * @param {{ token: string }} options
 */
export default async function publish(maplike, options) {
  // Process and validate arguments
  if (isUnpackable(maplike)) {
    maplike = await maplike.unpack();
  }
  const tree = Tree.from(maplike, { deep: true });

  if (isUnpackable(options)) {
    options = await options.unpack();
  }
  let { token } = options;
  if (isUnpackable(token)) {
    token = await token.unpack();
  }
  token = token?.trim();

  if (typeof token !== "string" || token.length === 0) {
    throw new TypeError("Neocities token was not provided");
  }

  // Get a plain Map of local paths to buffers
  const localBuffers = await buffers(tree);

  // Get the files currently on the Neocities site
  const serverHashes = await getFileData(token);

  // Compare the hashes to determine which files need to be uploaded
  const upload = Object.fromEntries(
    Object.entries(localBuffers).filter(
      ([path, value]) => serverHashes[path] !== hash(value),
    ),
  );

  if (Object.keys(upload).length > 0) {
    await uploadFiles(upload, token);
  }

  // Determine which files need to be deleted from the server. For directories
  // (which have a null hash), delete them if there is no local path that
  // extends the directory.
  const localPaths = Object.keys(localBuffers);
  const deletePaths = Object.keys(serverHashes).filter((serverPath) =>
    serverHashes[serverPath] === null
      ? !localPaths.some((localPath) => localPath.startsWith(serverPath + "/"))
      : !localBuffers.hasOwnProperty(serverPath),
  );

  if (deletePaths.length > 0) {
    await deleteFiles(deletePaths, token);
  }
}

// Given a Maplike, return an object mapping paths to buffers
async function buffers(maplike) {
  const deflated = await Tree.deflatePaths(maplike);
  const result = {};
  for await (const [path, value] of deflated) {
    result[path] = toBuffer(value, path);
  }
  return result;
}

async function deleteFiles(paths, token) {
  const body = new FormData();
  for (const path of paths) {
    body.append("filenames[]", path);
  }

  const response = await fetchWithBackoff(`https://neocities.org/api/delete`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body,
  });

  if (!response.ok) {
    throw new Error(
      `Neocities delete failed: ${response.status} ${response.statusText}`,
    );
  }
}

// Get file data from Neocities API
async function getFileData(token) {
  const url = `https://neocities.org/api/list`;
  const response = await fetchWithBackoff(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(
      `Neocities API request failed: ${response.status} ${response.statusText}`,
    );
  }

  const data = await response.json();

  // Convert from Neocities format to an object mapping path to hash.
  // For directories, use null as the value.
  const mapped = data.files.map((file) => [
    file.path,
    file.is_directory ? null : file.sha1_hash,
  ]);

  return Object.fromEntries(mapped);
}

function hash(buffer) {
  return crypto.createHash("sha1").update(buffer).digest("hex");
}

export function toBuffer(value, descriptor) {
  if (value instanceof String || typeof value === "string") {
    return new TextEncoder().encode(value);
  } else if (value instanceof ArrayBuffer) {
    return new Uint8Array(value);
  } else if (value instanceof Uint8Array) {
    return value;
  } else {
    throw new TypeError(`Couldn't convert to buffer: ${descriptor}`);
  }
}

// Upload the indicates files
async function uploadFiles(files, token) {
  const body = new FormData();
  for (const [path, buffer] of Object.entries(files)) {
    const blob = new Blob([buffer]);
    body.append(path, blob, path);
  }

  const response = await fetchWithBackoff(`https://neocities.org/api/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body,
  });

  if (!response.ok) {
    throw new Error(
      `Neocities upload failed: ${response.status} ${response.statusText}`,
    );
  }
}
