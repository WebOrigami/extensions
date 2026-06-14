import { keysFromPath, SyncMap, Tree } from "@weborigami/async-tree";
import {
  getGlobalsForTree,
  HandleExtensionsTransform,
} from "@weborigami/language";
import Zip from "adm-zip";

/**
 * Handler for ZIP files
 */
export default {
  mediaType: "application/zip",

  /**
   * Pack a tree of files as a ZIP file in Buffer form.
   *
   * @param {import("@weborigami/async-tree").Maplike} maplike
   */
  async pack(maplike) {
    // The ZIP file should leave the files in tree order.
    const zip = new Zip({ noSort: true });
    const deflated = await Tree.deflatePaths(maplike);
    for (const [path, value] of deflated) {
      zip.addFile(path, value);
    }
    const buffer = zip.toBuffer();
    return buffer;
  },

  /**
   * Unpack a ZIP file
   */
  async unpack(buffer, options) {
    // Origami generally prefers keeping things as an Uint8Array or ArrayBuffer,
    // but adm-zip only accepts a Buffer.
    if (buffer instanceof Uint8Array || buffer instanceof ArrayBuffer) {
      buffer = Buffer.from(buffer);
    }

    const zip = new Zip(buffer);

    // The final tree will include extension handlers and have functions invoked
    // to retrieve data from the ZIP file. While the base map is a SyncMap, the
    // final tree will be async.
    const result = new (HandleExtensionsTransform(
      InvokeFunctionsTransform(SyncMap),
    ))();
    result.trailingSlashKeys = true;

    for (const entry of zip.getEntries()) {
      const path = entry.entryName;

      // macOS adds a __MACOSX directory to ZIP files, which we don't want.
      if (path.startsWith("__MACOSX/")) {
        continue;
      }

      // Skip directory entries -- we'll create them as needed.
      if (path.endsWith("/")) {
        continue;
      }

      // Defer loading of actual data
      const value = () => entry.getData();
      addToMap(result, path, value);
    }

    const parent = options?.parent;
    const globals = parent ? getGlobalsForTree(parent) : null;
    if (globals) {
      result.globals = globals;
    }

    return result;
  },
};

/**
 * Add the given value to the map at the given path.
 *
 * @param {Map} map
 * @param {string} path
 * @param {any} value
 */
function addToMap(map, path, value) {
  // Turn the path into a list of keys.
  const keys = keysFromPath(path);

  const filename = keys.pop();

  // Traverse to the appropriate parent, creating submaps as needed.
  let current = map;
  for (const key of keys) {
    current = current.child(key);
  }

  // Set the value in the final map.
  current.set(filename, value);
}

function InvokeFunctionsTransform(Base) {
  return class InvokeFunctions extends Base {
    delete(key) {
      return super.delete(key);
    }

    get(key) {
      const value = super.get(key);
      return typeof value === "function" ? value() : value;
    }

    set(key, value) {
      return super.set(key, value);
    }
  };
}
