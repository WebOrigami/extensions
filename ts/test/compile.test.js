import assert from "node:assert";
import { describe, test } from "node:test";
import ts from "typescript";
import compile from "../src/compile.js";

describe("compile", () => {
  test("can compile tree", async () => {
    const tree = {
      "index.ts": "console.log('Hello, world!');",
    };
    const options = {
      allowJs: true,
      module: ts.ModuleKind.ESNext,
    };
    const host = await compile(tree, options);
    const indexJs = await host.get("index.js");
    assert.equal(indexJs, "console.log('Hello, world!');\n");
  });

  test("if no config supplied, reads one from tree", async () => {
    const options = {
      allowJs: true,
      module: ts.ModuleKind.ESNext,
    };
    const tree = {
      "index.ts": "console.log('Hello, world!');",
      "tsconfig.json": JSON.stringify(options),
    };
    const host = await compile(tree);
    const indexJs = await host.get("index.js");
    assert.equal(indexJs, "console.log('Hello, world!');\n");
  });
});
