import posix from "node:path/posix";
import { Client as SshClient } from "ssh2";

/**
 * An SFTP client backed by ssh2
 *
 * This ensures that only one connection is active at a time, that the
 * connection is reused during a given active period of time, and that the
 * connection is closed after a period of inactivity.
 */
export default class SftpClient {
  constructor(options) {
    this.options = options;

    this.client = new SshClient();
    this.sftp = null;

    this.connectionCount = 0;
    this.disconnectTimeout = null;
    this.connectionPromise = null;
    this.endPromise = null;
    this.pending = Promise.resolve();
  }

  async callSftp(fnName, ...args) {
    await this.connect();
    try {
      // return this.serialized(fnName, ...args);
      return new Promise((resolve, reject) => {
        this.sftp[fnName](...args, (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        });
      });
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
      this.connectionPromise = new Promise((resolve, reject) => {
        this.client.once("ready", () => {
          this.client.sftp((error, sftp) => {
            if (error) {
              reject(error);
            } else {
              this.sftp = sftp;
              resolve(sftp);
            }
          });
        });
        this.client.once("error", reject);
        this.client.connect(this.options);
      });
    }
    return this.connectionPromise;
  }

  async get(path) {
    await this.connect();
    try {
      const chunks = [];
      for await (const chunk of this.sftp.createReadStream(path)) {
        chunks.push(chunk);
      }
      return Buffer.concat(chunks);
    } catch (error) {
      if (error.code === 2) {
        // No such file or directory
        return undefined;
      }
      throw error;
    } finally {
      this.scheduleDisconnect();
    }
  }

  async readdir(path) {
    return this.callSftp("readdir", path);
  }

  async mkdir(path) {
    const parts = path.split("/").filter(Boolean);
    let current = path.startsWith("/") ? "/" : "";

    for (const part of parts) {
      current = posix.join(current, part);

      try {
        await this.callSftp("mkdir", current);
      } catch (error) {
        if (error.code === 4) {
          // SSH_FX_FAILURE: directory already exists; ignore
        } else {
          throw error;
        }
      }
    }
  }

  async put(value, path) {
    await this.connect();
    try {
      const stream = this.sftp.createWriteStream(path);
      await new Promise((resolve, reject) => {
        stream.on("error", reject);
        stream.on("close", resolve);
        stream.end(value);
      });
    } finally {
      this.scheduleDisconnect();
    }
  }

  async rmdir(path) {
    // SSH does not support recursive directory deletion, so we need to
    // implement it ourselves.
    const entries = await this.readdir(path);
    for (const entry of entries) {
      const child = `${path.replace(/\/$/, "")}/${entry.filename}`;
      if (entry.attrs.isDirectory()) {
        await this.rmdir(child);
      } else {
        await this.unlink(child);
      }
    }
    return this.callSftp("rmdir", path);
  }

  scheduleDisconnect() {
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

  // /**
  //  * The ssh2-sftp-client docs indicate that we should avoid making multiple
  //  * async calls to the client and trying to resolve them all with Promise.all.
  //  * That's exactly what the Origami `copy` and `assign` functions do, so we
  //  * need to serialize the calls to the client.
  //  */
  // async serialized(fnName, ...args) {
  //   const result = this.pending.then(async () => {
  //     return this.client[fnName](...args);
  //   });

  //   // Keep the chain alive even if this call rejects.
  //   this.pending = result.catch(() => {});

  //   return result;
  // }

  async unlink(path) {
    return this.callSftp("unlink", path);
  }
}
