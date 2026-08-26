import { AsyncMap, naturalOrder, trailingSlash } from "@weborigami/async-tree";

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
  }

  async get(key) {
    const path = `${this.path}${key}`;
    let value;
    if (trailingSlash.has(path)) {
      // Trailing slash: return a new SftpMap immediately
      value = Reflect.construct(this.constructor, [
        {
          client: this.client,
          connect: this.connect,
          path,
          scheduleDisconnect: this.scheduleDisconnect,
        },
      ]);
    } else {
      // File
      await this.connect();
      try {
        value = await this.client.get(path);
      } catch (error) {
        const { code } = error;
        if (code === 2) {
          // File not found
          return undefined;
        } else if (code === 4) {
          // Asked for file but it's a directory
          value = Reflect.construct(this.constructor, [
            {
              client: this.client,
              connect: this.connect,
              path,
              scheduleDisconnect: this.scheduleDisconnect,
            },
          ]);
        } else {
          throw error;
        }
      } finally {
        this.scheduleDisconnect();
      }
    }
    return value;
  }

  async *keys() {
    await this.connect();
    try {
      const fileList = await this.client.list(this.path);
      const keys = fileList.map((file) =>
        trailingSlash.toggle(file.name, file.type === "d"),
      );
      keys.sort(naturalOrder);
      yield* keys;
    } finally {
      this.scheduleDisconnect();
    }
  }

  trailingSlashKeys = true;
}
