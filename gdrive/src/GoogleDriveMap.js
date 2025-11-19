import { AsyncMap, naturalOrder, trailingSlash } from "@weborigami/async-tree";
import { google } from "googleapis";
import gdoc from "./gdoc.js";
import gsheet from "./gsheet.js";

const googleExtensions = {
  "application/vnd.google-apps.document": ".gdoc",
  "application/vnd.google-apps.spreadsheet": ".gsheet",
};

/**
 * A Google Drive folder as an async map
 *
 * Google Drive requires that all folders and files be accessed by ID. This is
 * cumbersome, since we want to enable access by name. Therefore, this class
 * maintains an internal map of file names to file IDs for the folder it
 * represents. This map is loaded on demand the first time it is needed, and
 * cached for subsequent access. If files are added or removed outside of this
 * class, the cache will become out of date.
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
    this.items = null;
  }

  async delete(key) {
    const items = await this.getItems();
    const item = items.get(key);
    if (!item) {
      return false;
    }

    await deleteFile(this.service, item.id);
    this.items.delete(key);
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
    const normalized = trailingSlash.remove(key);
    const item = items.get(normalized);
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
    if (this.items) {
      // Return cached items
      return this.items;
    } else if (this.itemsPromise) {
      // Return pending promise
      return this.itemsPromise;
    }

    const params = {
      q: `'${this.folderId}' in parents and trashed = false`,
      fields: "files/id,files/name,files/mimeType",
      orderBy: "name",
    };

    this.itemsPromise = this.service.files.list(params).then((response) => {
      const items = new Map();
      for (const file of response.data.files) {
        const { id, mimeType } = file;
        const extension = googleExtensions[mimeType] || "";
        const name = file.name + extension;
        items.set(name, { id, mimeType });
      }
      return items;
    });

    this.items = await this.itemsPromise;
    return this.items;
  }

  async *keys() {
    const items = await this.getItems();
    // Add trailing slashes to folder keys
    const keys = Array.from(items.entries()).map(([key, item]) =>
      trailingSlash.toggle(
        key,
        item.mimeType === "application/vnd.google-apps.folder"
      )
    );
    // Origami tree drivers generally use natural sort order. For reference,
    // Google Drive's own UI uses what seems to be natural sort order.
    keys.sort(naturalOrder);
    yield* keys;
  }

  async set(key, value) {
    // Does the file already exist?
    const items = await this.getItems();
    const normalized = trailingSlash.remove(key);
    const item = items.get(normalized);

    if (value === this.constructor.EMPTY) {
      // Create subfolder
      if (item && item.mimeType !== "application/vnd.google-apps.folder") {
        throw new Error(
          `${this.constructor.name}: Cannot create folder ${key}, a file with that name already exists.`
        );
      } else if (!item) {
        const data = await createFolder(
          this.service,
          this.folderId,
          normalized
        );
        if (data) {
          const { id, mimeType } = data;
          this.items.set(normalized, { id, mimeType });
        }
      }
    } else if (item) {
      // Update existing file
      await updateFile(this.service, item.id, key, value);
    } else {
      // Create new file
      const data = await createFile(this.service, this.folderId, key, value);
      if (data) {
        const { id, mimeType } = data;
        this.items.set(normalized, { id, mimeType });
      }
    }

    return this;
  }

  get trailingSlashKeys() {
    return true;
  }
}

async function createFile(service, folderId, name, body) {
  try {
    const response = await service.files.create({
      requestBody: {
        name: name,
        parents: [folderId],
      },
      media: {
        body,
      },
      uploadType: "media",
    });
    return response?.data;
  } catch (e) {
    const message = `Error ${e.code} ${e.response.statusText} creating file ${name}: ${e.message}`;
    console.error(message);
    return null;
  }
}

async function createFolder(service, parentFolderId, name) {
  try {
    const response = await service.files.create({
      requestBody: {
        name: name,
        mimeType: "application/vnd.google-apps.folder",
        parents: [parentFolderId],
      },
    });
    return response?.data;
  } catch (e) {
    const message = `Error ${e.code} ${e.response.statusText} creating folder ${name}: ${e.message}`;
    console.error(message);
    return null;
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
