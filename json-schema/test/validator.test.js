import { FileTree } from "@weborigami/async-tree";
import assert from "node:assert";
import path from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import validator from "../src/validator.js";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtures = new FileTree(path.join(dirname, "fixtures"));

describe("validator", () => {
  test("returns input data as is if it is valid", async () => {
    const schema = {
      type: "object",
      properties: {
        name: { type: "string" },
        age: { type: "number" },
      },
      required: ["name"],
    };
    const validate = await validator(schema);
    const input = { name: "Alice", age: 30 };
    const output = await validate(input);
    assert.deepEqual(output, input);
  });

  test("throws an error if input data is invalid", async () => {
    const schema = {
      type: "object",
      properties: {
        name: { type: "string" },
        age: { type: "number" },
      },
      required: ["name"],
    };
    const validate = await validator(schema);
    const input = { age: 30 };
    await assert.rejects(
      () => validate(input, "foo.json"),
      new Error(
        "Validation failed:\nfoo.json: must have required property 'name'"
      )
    );
  });

  test("can validate file system folder", async () => {
    const markdown = await fixtures.get("markdown");
    const schema = {
      type: "object",
      patternProperties: {
        // File names should end in .md
        "\\.md$": {
          type: "object", // File values will be Buffer objects
        },
      },
      additionalProperties: false, // Don't allow other file names
    };
    const validate = await validator(schema);
    await assert.rejects(
      () => validate(markdown, "markdown"),
      new Error(
        "Validation failed:\nmarkdown: must NOT have additional properties"
      )
    );
  });
});
