import assert from "node:assert";
import { describe, test } from "node:test";
import hbs_handler from "../src/hbs_handler.js";

describe("Handlebars hbs extension handler", () => {
  test("returns a function that applies a Handlebars template", async () => {
    const template = `Hello, {{ name }}!`;
    const fn = await hbs_handler.unpack(template);
    const map = new Map([["name", "world"]]);
    const result = await fn(map);
    assert.equal(result, "Hello, world!");
  });

  test("uses parent scope to resolve partials", async () => {
    const parent = new Map([["bold.hbs", `<strong>{{this}}</strong>`]]);
    const template = `Hello, {{#> bold}}{{ name }}{{/bold}}!`;
    const fn = await hbs_handler.unpack(template, { parent });
    const result = await fn("world");
    assert.equal(result, "Hello, <strong>world</strong>!");
  });
});
