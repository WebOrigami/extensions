import { Tree } from "@weborigami/async-tree";
import Ajv from "ajv";

export default async function validator(schemaTreelike) {
  const schema = await Tree.plain(schemaTreelike);
  const ajv = new Ajv();
  const validate = ajv.compile(schema);

  return async (dataTree, key) => {
    // If the input tree contains unpacked files, unpack them
    const unpacked = await Tree.map(dataTree, async (item) =>
      typeof item === "object" && "unpack" in item ? await item.unpack() : item
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
