import {
  SyncMap,
  Tree,
  keysFromPath,
  trailingSlash,
} from "@weborigami/async-tree";
import { HandleExtensionsTransform } from "@weborigami/language";
import Zip from "adm-zip";

/**
 * Handler for ZIP files
 */
export default {
  mediaType: "application/zip",

  /**
   * Pack a tree of files as a ZIP file in Buffer form.
   *
   * @param {import("@weborigami/async-tree").Treelike} treelike
   */
  async pack(treelike) {
    // The ZIP file should leave the files in tree order.
    const zip = new Zip({ noSort: true });
    await traversePaths(treelike, (value, path) => {
      if (value instanceof String) {
        value = String(value);
      }
      zip.addFile(path, value);
    });
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

    const files = new SyncMap();
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
      addToMap(files, path, value);
    }

    // The final tree will include extension handlers and have functions invoked
    // to retrieve data from the ZIP file. While the base map is a SyncMap, the
    // final tree will be async.
    const withFunctions = Tree.invokeFunctions(
      new (HandleExtensionsTransform(SyncMap))(files)
    );
    withFunctions.parent = options?.parent;

    return withFunctions;
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
    if (!current.has(key)) {
      /** @type {any} */
      const mapClass = current.constructor;
      const empty = mapClass.EMPTY ?? new mapClass();
      current.set(key, empty);
    }
    current = current.get(key);
  }

  // Set the value in the final map.
  current.set(filename, value);
}

/**
 * Traverse the tree, invoking the given callback function for each
 * value. Pass the value and path to the callback function.
 *
 * @param {import("@weborigami/types").Treelike} tree
 * @param {Function} fn
 * @param {string} [base]
 */
async function traversePaths(treelike, fn, base = "") {
  const tree = Tree.from(treelike, { deep: true });
  for await (const key of tree.keys()) {
    const path = base ? `${trailingSlash.remove(base)}/${key}` : key;
    const value = await tree.get(key);
    if (Tree.isMaplike(value)) {
      await traversePaths(value, fn, path);
    } else {
      await fn(value, path);
    }
  }
}
