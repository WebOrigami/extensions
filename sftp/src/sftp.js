import {
  AsyncMap,
  isPacked,
  naturalOrder,
  toString,
  trailingSlash,
} from "@weborigami/async-tree";
import SftpClient from "ssh2-sftp-client";

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

  const sftp = new SftpClient();
  let connected = false;
  let disconnectTimeout = null;

  return Object.assign(new AsyncMap(), {
    async connect() {
      if (disconnectTimeout) {
        clearImmediate(disconnectTimeout);
        disconnectTimeout = null;
      }
      if (!connected) {
        await sftp.connect({
          host,
          ...options,
          passphrase,
          password,
          privateKey,
        });
        connected = true;
      }
    },

    async get(path) {},

    async *keys() {
      await this.connect();
      try {
        const fileList = await sftp.list("/");
        const keys = fileList.map((file) =>
          trailingSlash.toggle(file.name, file.type === "d"),
        );
        keys.sort(naturalOrder);
        yield* keys;
      } finally {
        this.scheduleDisconnect();
      }
    },

    // Close the connection once nothing else calls in before the next tick; any
    // new call cancels this via connect().
    scheduleDisconnect() {
      if (disconnectTimeout) {
        clearImmediate(disconnectTimeout);
      }
      disconnectTimeout = setImmediate(async () => {
        disconnectTimeout = null;
        if (connected) {
          connected = false;
          await sftp.end();
        }
      });
    },
  });
}
