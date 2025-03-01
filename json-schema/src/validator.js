import { Tree } from "@weborigami/async-tree";
import Ajv from "ajv";

export default async function validator(treelike) {
  const schema = await Tree.plain(treelike);
  const ajv = new Ajv();
  const validate = ajv.compile(schema);

  return async (value, key) => {
    const data = await Tree.plain(value);
    const valid = validate(data);
    if (!valid) {
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
    return data;
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
