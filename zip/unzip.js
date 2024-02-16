import { ObjectTree, keysFromPath } from "@weborigami/async-tree";
import { OrigamiTransform } from "@weborigami/language";
import yauzl from "yauzl-promise";

export default async function zip(buffer) {
  const zip = await yauzl.fromBuffer(buffer);
  const files = {};
  try {
    for await (const entry of zip) {
      if (entry.filename.endsWith("/")) {
        // Skip directory entries -- we'll create them as needed.
        continue;
      }

      // Turn the file path into a list of keys.
      const keys = keysFromPath(entry.filename);

      // Determine the parent of the new file.
      const filename = keys.pop();
      let parent = files;
      for (const key of keys) {
        if (!parent[key]) {
          parent[key] = {};
        }
        parent = parent[key];
      }

      const readStream = await entry.openReadStream();

      // Read the entire stream into a Buffer
      const buffer = await new Promise((resolve, reject) => {
        const chunks = [];
        readStream.on("data", (chunk) => chunks.push(chunk));
        readStream.on("error", reject);
        readStream.on("end", () => resolve(Buffer.concat(chunks)));
      });

      parent[filename] = buffer;
    }
  } catch (e) {
    throw e;
  } finally {
    await zip.close();
  }

  return new (OrigamiTransform(ObjectTree))(files);
}
