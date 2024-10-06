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
        return message;
      });
      throw new Error("Validation failed:\n" + messages.join("\n"));
    }
    return data;
  };
}
