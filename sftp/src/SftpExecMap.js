import { Tree } from "@weborigami/async-tree";
import fs from "node:fs/promises";
import SftpMap from "./SftpMap.js";

// Read the script used for generating the manifest. This is always executed
// inline via `exec` (never invoked as a named script file), so it must avoid
// `#` comments and bash-only syntax: some remote shells (e.g. tcsh on pair.com)
// only treat `#` as a comment when running a named script file, and stray
// `(`/`)` inside would-be comment text can corrupt the whole command.
// Additionally, manifest.sh should be a single line to avoid parsing issues
// when executed by tcsh.
const manifestShPath = new URL("./manifest.sh", import.meta.url);
const manifestShBufer = await fs.readFile(manifestShPath);
const manifestSh = new TextDecoder().decode(manifestShBufer);

/**
 * Map driver for an SFTP server that supports command execution
 */
export default class SftpExecMap extends SftpMap {
  async manifest() {
    const listing = await this.client.exec(manifestSh, this.path);

    // Listing is in a rudimentary YAML format of `<path>: <hash>` for files and
    // `<path>: {}` for empty directories. Convert to Origami's flat format.
    const flat = new Map();
    const lines = listing.split("\n");
    for (const line of lines) {
      if (!line) continue;
      const [path, hash] = line.split(": ");
      flat.set(path, hash === "{}" ? new Map() : hash);
    }

    const manifest = await Tree.inflatePaths(flat);
    return manifest;
  }
}
