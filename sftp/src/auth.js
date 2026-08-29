import { isPacked, toString } from "@weborigami/async-tree";
import { coreGlobals, HandleExtensionsTransform } from "@weborigami/language";
import SftpClient from "ssh2-sftp-client";
import SftpMap from "./SftpMap.js";

/**
 * Return an AsyncMap for the files in a remote SFTP server.
 *
 * @param {{ host: string, username: string, passphrase?: string, password?: string, privateKey?: string, port?: number }} options
 */
export default async function sftp(options = {}, state = {}) {
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

  let connectionPromise = null;
  let connectionCount = 0;
  let disconnectTimeout = null;
  let endPromise = null;

  const client = new SftpClient("@weborigami/sftp", {
    close: () => console.log("CLOSE"),
  });

  async function connect() {
    connectionCount++;
    console.log("connect", connectionCount);
    if (disconnectTimeout) {
      clearTimeout(disconnectTimeout);
      disconnectTimeout = null;
    }
    if (connectionCount > 0 && connectionPromise === null) {
      if (endPromise) {
        await endPromise;
        endPromise = null;
      }
      connectionPromise = client.connect({
        agent,
        host,
        passphrase,
        password,
        privateKey,
        port,
        username,
      });
      console.log("connected");
    }
    return connectionPromise;
  }

  // Close the connection once nothing else calls in; any new call cancels this
  // via connect().
  async function scheduleDisconnect() {
    if (connectionCount > 0) {
      connectionCount--;
    }
    console.log("scheduleDisconnect", connectionCount);
    if (disconnectTimeout) {
      clearTimeout(disconnectTimeout);
    }
    disconnectTimeout = setTimeout(async () => {
      if (connectionCount === 0 && connectionPromise && !endPromise) {
        console.log("disconnecting");
        endPromise = client.end();
        await endPromise;
        connectionPromise = null;
        endPromise = null;
      }
      disconnectTimeout = null;
    }, 10);
  }

  let pending = Promise.resolve();

  function serialized(fnName, ...args) {
    const result = pending.then(async () => {
      console.log("calling client", fnName);
      return client[fnName](...args);
    });

    // Keep the chain alive even if this call rejects.
    pending = result.catch(() => {});

    return result;
  }

  async function callClient(fnName, ...args) {
    await connect();
    try {
      return serialized(fnName, ...args);
    } finally {
      scheduleDisconnect();
    }
  }

  const tree = new (HandleExtensionsTransform(SftpMap))({
    callClient,
    path,
  });

  // Set globals for extension handlers
  tree.globals = state?.globals || (await coreGlobals());

  return tree;
}
sftp.needsState = true;
