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
    const loader = googleFileTypes[item.mimeType] || getGoogleDriveFile;
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

  async isKeyForSubtree(key) {
    const items = await this.getItems();
    const item = items[key];
    return item?.mimeType === "application/vnd.google-apps.folder";
  }

  async *keys() {
    const items = await this.getItems();
    const keys = Object.keys(items);
    // Origami tree drivers generally use natural sort order. For reference,
    // Google Drive's own UI uses what seems to be natural sort order.
    keys.sort(naturalOrder);
    yield* keys;
  }
}

async function getGoogleDriveFile(auth, fileId) {
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
