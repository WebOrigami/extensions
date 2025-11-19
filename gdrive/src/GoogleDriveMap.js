import { AsyncMap, naturalOrder } from "@weborigami/async-tree";
import { google } from "googleapis";
import gdoc from "./gdoc.js";
import gsheet from "./gsheet.js";

const googleExtensions = {
  "application/vnd.google-apps.document": ".gdoc",
  "application/vnd.google-apps.spreadsheet": ".gsheet",
};

/**
 * A Google Drive folder as an async map.
 *
 * @implements {import("@weborigami/async-tree").AsyncTree}
 */
export default class GoogleDriveMap extends AsyncMap {
  constructor(auth, folderId) {
    super();
    this.auth = auth;
    this.service = google.drive({ version: "v3", auth });
    this.folderId = folderId;
    this.itemsPromise = null;
  }

  // We override the base implementation of clear() so that we can delete all
  // files in the folder with parallel requests, and so that we only invalidate
  // the cached items once.
  async clear() {
    const items = await this.getItems();
    const promises = items.map((item) => deleteFile(this.service, item.id));
    await Promise.all(promises);
    this.itemsPromise = null; // Invalidate cached items
  }

  async delete(key) {
    const items = await this.getItems();
    const item = items[key];
    if (!item) {
      return false;
    }

    await deleteFile(this.service, item.id);
    this.itemsPromise = null; // Invalidate cached items
    return true;
  }

  async get(key) {
    if (key == null) {
      // Reject nullish key.
      throw new ReferenceError(
        `${this.constructor.name}: Cannot get a null or undefined key.`
      );
    }

    const items = await this.getItems();
    const item = items[key];
    if (!item) {
      return undefined;
    }

    const googleFileTypes = {
      "application/vnd.google-apps.document": gdoc,
      "application/vnd.google-apps.spreadsheet": gsheet,
      "application/vnd.google-apps.folder": (auth, id) =>
        Reflect.construct(this.constructor, [auth, id]),
    };
    const loader = googleFileTypes[item.mimeType] || getFile;
    const value = await loader(this.auth, item.id);
    return value;
  }

  async getItems() {
    if (this.itemsPromise) {
      return this.itemsPromise;
    }

    const params = {
      q: `'${this.folderId}' in parents and trashed = false`,
      fields: "files/id,files/name,files/mimeType",
      orderBy: "name",
    };

    this.itemsPromise = this.service.files.list(params).then((response) => {
      const items = {};
      for (const file of response.data.files) {
        const { id, mimeType } = file;
        const extension = googleExtensions[mimeType] || "";
        const name = file.name + extension;
        items[name] = { id, mimeType };
      }
      return items;
    });

    return this.itemsPromise;
  }

  async *keys() {
    const items = await this.getItems();
    const keys = Object.keys(items);
    // Origami tree drivers generally use natural sort order. For reference,
    // Google Drive's own UI uses what seems to be natural sort order.
    keys.sort(naturalOrder);
    yield* keys;
  }

  async set(key, value) {
    // Does the file already exist?
    const items = await this.getItems();
    const item = items[key];

    if (item) {
      await updateFile(this.service, item.id, key, value);
    } else {
      await createFile(this.service, this.folderId, key, value);
    }

    return this;
  }
}

async function createFile(service, folderId, name, body) {
  try {
    await service.files.create({
      requestBody: {
        name: name,
        parents: [folderId],
      },
      media: {
        body,
      },
      uploadType: "media",
    });
  } catch (e) {
    const message = `Error ${e.code} ${e.response.statusText} creating file ${name}: ${e.message}`;
    console.error(message);
  }
}

async function getFile(auth, fileId) {
  const params = {
    alt: "media",
    fileId,
  };
  const options = {
    responseType: "arraybuffer",
  };
  let response;
  try {
    const service = google.drive({ version: "v3", auth });
    response = await service.files.get(params, options);
  } catch (e) {
    const message = `Error ${e.code}  ${e.response.statusText} getting file ${fileId}: ${e.message}`;
    console.error(message);
    return undefined;
  }
  let buffer = response.data;
  if (buffer instanceof ArrayBuffer) {
    buffer = Buffer.from(buffer);
  }
  return buffer;
}

async function deleteFile(service, fileId) {
  try {
    await service.files.delete({
      fileId,
    });
  } catch (e) {
    const message = `Error ${e.code} ${e.response.statusText} deleting file ${fileId}: ${e.message}`;
    console.error(message);
  }
}

async function updateFile(service, fileId, name, body) {
  try {
    await service.files.update({
      fileId,
      media: {
        body,
      },
      uploadType: "media",
    });
  } catch (e) {
    const message = `Error ${e.code} ${e.response.statusText} updating file ${name}: ${e.message}`;
    console.error(message);
  }
}
