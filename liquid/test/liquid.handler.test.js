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

  test("makes front matter available as `layout` property", async () => {
    const template = `---
title: Home
---
<h1>{{ layout.title }}</h1>`;
    const fn = await liquidHandler.unpack(template);
    const result = await fn();
    assert.equal(result, "<h1>Home</h1>");
  });

  test("can invoke a base template indicated by the `layout` front matter property", async () => {
    const parent = new ObjectTree({
      "base.liquid": `<html><body>{{ content }}</body></html>`,
    });
    const template = `---
layout: base
---
<h1>Hello, {{ name }}!</h1>`;
    const fn = await liquidHandler.unpack(template, {
      parent,
    });
    const result = await fn({ name: "world" });
    assert.equal(result, "<html><body><h1>Hello, world!</h1></body></html>");
  });

  test.skip("can use an include directive", async () => {
    const parent = new ObjectTree({
      "included.liquid": `{{ greeting }}, {{ name }}!`,
    });
    const template = `{% include "included.liquid" with person %}`;
    const fn = await liquidHandler.unpack(template, { parent });
    const result = await fn({ person: { greeting: "Hello", name: "world" } });
    assert.equal(result, "Hello, world!");
  });
});
