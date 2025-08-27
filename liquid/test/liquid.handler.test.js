import { ObjectTree } from "@weborigami/async-tree";
import assert from "node:assert";
import { describe, test } from "node:test";
import liquidHandler from "../src/liquid.handler.js";

describe("Liquid extension handler", () => {
  test("returns a function that applies a Liquid template", async () => {
    const template = `Hello, {{ name }}!`;
    const fn = await liquidHandler.unpack(template);
    const tree = new ObjectTree({ name: "world" });
    const result = await fn(tree);
    assert.equal(result, "Hello, world!");
  });

  test("uses parent scope to resolve partials", async () => {
    const parent = new ObjectTree({
      "bold.liquid": `<strong>{{name}}</strong>`,
    });
    const template = `Hello, {% render "bold.liquid", name: name %}!`;
    const fn = await liquidHandler.unpack(template, { parent });
    const result = await fn({ name: "world" });
    assert.equal(result, "Hello, <strong>world</strong>!");
  });
});
