import assert from "node:assert";
import { describe, test } from "node:test";
import validator from "../src/validator.js";

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
});
