import { isPacked, toString } from "@weborigami/async-tree";
import SftpClient from "ssh2-sftp-client";
import SftpMap from "./SftpMap.js";

/**
 * Return an AsyncMap for the files in a remote SFTP server.
 *
 * @param {string} host
 * @param {{ username: string, passphrase?: string, password?: string, privateKey?: string, port?: number }} options
 */
export default async function sftp(host, options) {
  let { passphrase, password, privateKey } = options;

  if (isPacked(passphrase)) {
    passphrase = toString(passphrase);
    passphrase = passphrase.trim();
  }
  if (isPacked(password)) {
    password = toString(password);
    password = password.trim();
  }
  if (isPacked(privateKey)) {
    privateKey = toString(privateKey);
    privateKey = privateKey.trim();
  }

  if (
    !(
      (typeof password === "string" && password.length > 0) ||
      (typeof privateKey === "string" && privateKey.length > 0)
    )
  ) {
    throw new ReferenceError(
      "sftp: either password or privateKey must be provided",
    );
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
        host,
        ...options,
        passphrase,
        password,
        privateKey,
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

  return new SftpMap({
    client,
    connect,
    path: "/",
    scheduleDisconnect,
  });
}
