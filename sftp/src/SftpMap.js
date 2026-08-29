import {
  AsyncMap,
  naturalOrder,
  setParent,
  trailingSlash,
} from "@weborigami/async-tree";
import path from "node:path";

/**
 * Map driver for an SFTP server path
 */
export default class SftpMap extends AsyncMap {
  constructor(options) {
    super();

    this.client = options.client;
    this.connect = options.connect;
    this.path = trailingSlash.add(options.path);
    this.scheduleDisconnect = options.scheduleDisconnect;
    this.serialized = options.serialized;
  }

  async child(key) {
    const valuePath = this.pathForKey(key);

    const existingChild = await this.get(key);
    if (existingChild) {
      if (existingChild instanceof SftpMap) {
        return existingChild;
      } else {
        // File exists, not a directory; delete it
        await this.delete(key);
      }
    }

    await this.connect();
    try {
      // await this.client.mkdir(valuePath);
      await this.serialized("mkdir", valuePath);
    } finally {
      this.scheduleDisconnect();
    }

    const child = Reflect.construct(this.constructor, [
      {
        client: this.client,
        connect: this.connect,
        path: valuePath,
        scheduleDisconnect: this.scheduleDisconnect,
        serialized: this.serialized,
      },
    ]);

    setParent(child, this);

    return child;
  }

  async delete(key) {
    const valuePath = this.pathForKey(key);
    await this.connect();
    try {
      // await this.client.delete(valuePath);
      await this.serialized("delete", valuePath);
    } finally {
      this.scheduleDisconnect();
    }
  }

  async get(key) {
    const valuePath = this.pathForKey(key);

    let value;
    if (trailingSlash.has(valuePath)) {
      // Trailing slash: return a new SftpMap immediately
      value = Reflect.construct(this.constructor, [
        {
          client: this.client,
          connect: this.connect,
          path: valuePath,
          scheduleDisconnect: this.scheduleDisconnect,
          serialized: this.serialized,
        },
      ]);
    } else {
      // File
      await this.connect();
      try {
        // value = await this.client.get(valuePath);
        value = await this.serialized("get", valuePath);
      } catch (error) {
        const { code } = error;
        if (code === 2) {
          // File not found
          return undefined;
        } else if (code === 4) {
          // Asked for a file but it's a directory
          value = Reflect.construct(this.constructor, [
            {
              client: this.client,
              connect: this.connect,
              path: valuePath,
              scheduleDisconnect: this.scheduleDisconnect,
              serialized: this.serialized,
            },
          ]);
        } else {
          // Some other error
          throw error;
        }
      } finally {
        this.scheduleDisconnect();
      }
    }

    setParent(value, this);

    return value;
  }

  async *keys() {
    await this.connect();
    try {
      // const fileList = await this.client.list(this.path);
      const fileList = await this.serialized("list", this.path);
      const keys = fileList.map((file) =>
        trailingSlash.toggle(file.name, file.type === "d"),
      );
      keys.sort(naturalOrder);
      yield* keys;
    } finally {
      this.scheduleDisconnect();
    }
  }

  // Return the full path for the given key
  pathForKey(key) {
    if (!key.startsWith("..")) {
      // Normal traversal
      return `${this.path}${key}`;
    } else if (this.parent) {
      // Traversal to parent
      return trailingSlash.add(path.resolve(this.path, key));
    }

    // Traversal above the root is not allowed
    throw new Error(`SftpMap: cannot traverse above root to reach '${key}'`);
  }

  async set(key, value) {
    console.log("start set", key);
    const valuePath = this.pathForKey(key);

    if (!(value instanceof Buffer)) {
      // Pack as a Node Buffer because that's what the SFTP client expects, and
      // also to avoid having a string value interpreted as a local file path.
      value = Buffer.from(value);
    }

    await this.connect();
    try {
      // await this.client.put(value, valuePath);
      await this.serialized("put", value, valuePath);
    } finally {
      this.scheduleDisconnect();
    }

    console.log("finish set", key);
  }

  trailingSlashKeys = true;
}
