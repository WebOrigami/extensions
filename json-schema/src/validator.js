import { isUnpackable, Tree } from "@weborigami/async-tree";

// Uses 2020 draft JSON Schema, contains breaking changes from earlier drafts
import Ajv from "ajv/dist/2020.js";

/**
 * Return a validator function that validates input data against the given
 * schema. The returned function returns the input data if valid, and throws an
 * exception if the data is invalid.
 *
 * @typedef {import("@weborigami/async-tree").AsyncTree} AsyncTree
 * @typedef {import("@weborigami/async-tree").Treelike} Treelike
 *
 * @this {AsyncTree|null}
 * @param {Treelike} schemaTreelike
 * @param {any} [options]
 * @returns {function}
 */
export default async function validator(schemaTreelike, options) {
  const context = this;

  const schema = await Tree.plain(schemaTreelike);
  const loadSchema = async (uri) => getSchema(context, uri);
  const ajv = new Ajv(Object.assign({ loadSchema }, options));
  const validate = await ajv.compileAsync(schema);

  return async (dataTree, key) => {
    // If the input tree contains unpacked files, unpack them
    const unpacked = await Tree.map(dataTree, async (item) =>
      isUnpackable(item) ? await item.unpack() : item
    );

    // Resolve to an in-memory object and validate
    const data = await Tree.plain(unpacked);
    const valid = validate(data);

    if (!valid) {
      // Display error messages
      const messages = validate.errors.map((error) => {
        let message = key ? `${key}: ` : "";
        message += error.instancePath ? `${error.instancePath}: ` : "";
        message += error.message;
        if (error.params.additionalProperty) {
          message += ` (${error.params.additionalProperty})`;
        }
        message += error.instancePath
          ? ": " + formatInstance(getInstance(data, error.instancePath))
          : "";
        return message;
      });
      throw new Error("Validation failed:\n" + messages.join("\n\n"));
    }

    return dataTree;
  };
}

function formatInstance(object) {
  let text =
    typeof object === "object" ? JSON.stringify(object) : object.toString();
  if (text.length > 255) {
    text = text.slice(0, 255) + "…";
  }
  return text;
}

function getInstance(data, instancePath) {
  const path = instancePath.split("/");
  let current = data;
  for (let i = 1; i < path.length; i++) {
    const key = path[i];
    if (key === "") continue;
    if (key in current) {
      current = current[key];
    } else {
      return undefined;
    }
  }
  return current;
}

async function getSchema(context, uri) {
  if (!context) {
    return null;
  }
  const keys = uri.split("/");
  if (keys[0]?.endsWith(":")) {
    // Protocol like `https:`, don't handle
    return null;
  }
  if (keys[0] === "#" || keys[0] === ".") {
    keys.shift();
  }
  let schema = await Tree.traverseOrThrow(context, ...keys);
  if (isUnpackable(schema)) {
    schema = await schema.unpack();
  }
  return schema;
}
