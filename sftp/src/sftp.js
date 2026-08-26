import { isPacked, toString } from "@weborigami/async-tree";
import { coreGlobals, HandleExtensionsTransform } from "@weborigami/language";
import SftpClient from "ssh2-sftp-client";
import SftpMap from "./SftpMap.js";

/**
 * Return an AsyncMap for the files in a remote SFTP server.
 *
 * @param {{ host: string, username: string, passphrase?: string, password?: string, privateKey?: string, port?: number }} options
 */
export default async function sftp(options, state) {
  let { agent, passphrase, password, privateKey } = options;

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

  const client = new SftpClient();
  let connected = false;
  let disconnectTimeout = null;

  async function connect() {
    if (disconnectTimeout) {
      clearImmediate(disconnectTimeout);
      disconnectTimeout = null;
    }
    if (!connected) {
      await client.connect({
        ...options,
        agent,
        passphrase,
        password,
      });
      connected = true;
    }
  }

  // Close the connection once nothing else calls in before the next tick; any
  // new call cancels this via connect().
  async function scheduleDisconnect() {
    if (disconnectTimeout) {
      clearImmediate(disconnectTimeout);
    }
    disconnectTimeout = setImmediate(async () => {
      disconnectTimeout = null;
      if (connected) {
        connected = false;
        await client.end();
      }
    });
  }

  const tree = new (HandleExtensionsTransform(SftpMap))({
    client,
    connect,
    path: "/",
    scheduleDisconnect,
  });

  // Set globals for extension handlers
  tree.globals = state?.globals || (await coreGlobals());

  return tree;
}
sftp.needsState = true;
