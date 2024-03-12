import { ObjectTree } from "@weborigami/async-tree";
import assert from "node:assert";
import { describe, test } from "node:test";
import unpackHandlebarsTemplate from "../src/unpack.hbs.js";

describe("Unpack Handlebars template", () => {
  test("returns a function that applies a Handlebars template", async () => {
    const template = `Hello, {{ name }}!`;
    const fn = await unpackHandlebarsTemplate(template);
    const tree = new ObjectTree({ name: "world" });
    const result = await fn(tree);
    assert.equal(result, "Hello, world!");
  });
});
