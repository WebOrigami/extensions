import { coreGlobals, HandleExtensionsTransform } from "@weborigami/language";
import SftpClient from "./SftpClient.js";
import SftpMap from "./SftpMap.js";

/**
 * Return an AsyncMap for the files in a remote SFTP server.
 *
 * @param {{ agent?: string, host: string, passphrase?: string, password?: string, path?: string, port?: number, privateKey?: string, username: string }} options
 */
export default async function sftp(options = {}, state = {}) {
  const {
    agent,
    host,
    passphrase,
    password,
    path,
    port,
    privateKey,
    username,
  } = options;

  const client = new SftpClient({
    agent,
    host,
    passphrase,
    password,
    privateKey,
    port,
    username,
  });

  const tree = new (HandleExtensionsTransform(SftpMap))({
    client,
    path,
  });

  // Set globals for extension handlers
  tree.globals = state?.globals || (await coreGlobals());

  return tree;
}
sftp.needsState = true;
