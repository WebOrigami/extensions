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

  const wrapper = new ClientWrapper({
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

/**
 * Wrap the ssh2-sftp-client to ensure that only one connection is active at a
 * time, that any client calls are serialized, that the connection is reused
 * during a given active period of time, and that the connection is closed after
 * a period of inactivity.
 *
 * Note that ssh2-sftp-client itself is a wrapper around ssh2.
 */
class ClientWrapper {
  constructor(connectionOptions) {
    this.client = new SftpClient("@weborigami/sftp");
    this.connectionCount = 0;
    this.connectionOptions = connectionOptions;
    this.disconnectTimeout = null;
    this.connectionPromise = null;
    this.endPromise = null;
    this.pending = Promise.resolve();
  }

  async callClient(fnName, ...args) {
    await this.connect();
    try {
      return this.serialized(fnName, ...args);
    } finally {
      this.scheduleDisconnect();
    }
  }

  async connect() {
    this.connectionCount++;
    if (this.disconnectTimeout) {
      clearTimeout(this.disconnectTimeout);
      this.disconnectTimeout = null;
    }
    if (this.connectionCount > 0 && this.connectionPromise === null) {
      if (this.endPromise) {
        await this.endPromise;
      }
      this.connectionPromise = this.client.connect(this.connectionOptions);
    }
    return this.connectionPromise;
  }

  async delete(path) {
    return this.callClient("delete", path);
  }

  async get(path) {
    return this.callClient("get", path);
  }

  async list(path) {
    return this.callClient("list", path);
  }

  async mkdir(path, recursive = false) {
    await this.callClient("mkdir", path, recursive);
  }

  async put(value, path) {
    return this.callClient("put", value, path);
  }

  async scheduleDisconnect() {
    if (this.connectionCount > 0) {
      this.connectionCount--;
    }
    if (this.disconnectTimeout) {
      clearTimeout(this.disconnectTimeout);
    }
    this.disconnectTimeout = setTimeout(async () => {
      if (
        this.connectionCount === 0 &&
        this.connectionPromise &&
        !this.endPromise
      ) {
        this.endPromise = this.client.end();
        await this.endPromise;
        this.connectionPromise = null;
        this.endPromise = null;
      }
      this.disconnectTimeout = null;
    }, 10);
  }

  /**
   * The ssh2-sftp-client docs indicate that we should avoid making multiple
   * async calls to the client and trying to resolve them all with Promise.all.
   * That's exactly what the Origami `copy` and `assign` functions do, so we
   * need to serialize the calls to the client.
   */
  async serialized(fnName, ...args) {
    const result = this.pending.then(async () => {
      return this.client[fnName](...args);
    });

    // Keep the chain alive even if this call rejects.
    this.pending = result.catch(() => {});

    return result;
  }
}
