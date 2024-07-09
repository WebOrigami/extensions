import { ObjectTree } from "@weborigami/async-tree";
import assert from "node:assert";
import { describe, test } from "node:test";
import hbsHandler from "../src/hbs_handler.js";

describe("Handlebars hbs extension handler", () => {
  test("returns a function that applies a Handlebars template", async () => {
    const template = `Hello, {{ name }}!`;
    const fn = await hbsHandler.unpack(template);
    const tree = new ObjectTree({ name: "world" });
    const result = await fn(tree);
    assert.equal(result, "Hello, world!");
  });

  test("uses parent scope to resolve partials", async () => {
    const parent = new ObjectTree({
      ["bold.hbs"]: `<strong>{{this}}</strong>`,
    });
    const template = `Hello, {{#> bold}}{{ name }}{{/bold}}!`;
    const fn = await hbsHandler.unpack(template, { parent });
    const result = await fn("world");
    assert.equal(result, "Hello, <strong>world</strong>!");
  });
});
