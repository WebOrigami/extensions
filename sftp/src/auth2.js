import { isPacked, toString } from "@weborigami/async-tree";
import { coreGlobals, HandleExtensionsTransform } from "@weborigami/language";
import SftpClient from "./SftpClient.js";
import SftpMap from "./SftpMap.js";

/**
 * Return an AsyncMap for the files in a remote SFTP server.
 *
 * @param {{ host: string, username: string, passphrase?: string, password?: string, privateKey?: string, port?: number }} options
 */
export default async function sftp(options = {}, state = {}) {
  // Validate options
  let { agent, host, passphrase, password, path, privateKey, port, username } =
    options;

  if (!host) {
    throw new Error("sftp: You must specify a host option");
  }

  if (!username) {
    // Default to current user
    username = process.env.USER || process.env.LOGNAME || process.env.USERNAME;
  }

  if (isPacked(passphrase)) {
    passphrase = toString(passphrase);
    passphrase = passphrase.trim();
  }
  if (isPacked(password)) {
    password = toString(password);
    password = password.trim();
  }

  if (
    !(
      agent ||
      (typeof password === "string" && password.length > 0) ||
      (typeof privateKey === "string" && privateKey.length > 0)
    )
  ) {
    // Use SSH agent
    agent = process.env.SSH_AUTH_SOCK;
  }

  const wrapper = new SftpClient({
    agent,
    host,
    passphrase,
    password,
    privateKey,
    port,
    username,
  });

  const tree = new (HandleExtensionsTransform(SftpMap))({
    client: wrapper,
    path,
  });

  // Set globals for extension handlers
  tree.globals = state?.globals || (await coreGlobals());

  return tree;
}
sftp.needsState = true;
