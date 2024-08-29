import { Tree } from "@weborigami/async-tree";
import assert from "node:assert";
import { describe, test } from "node:test";
import ts from "typescript";
import tsc from "../src/tsc.js";

describe("tsc", () => {
  test("can compile tree", async () => {
    const tree = {
      "index.ts": "console.log('Hello, world!');",
    };
    const options = {
      allowJs: true,
      module: ts.ModuleKind.ESNext,
    };
    const dist = await tsc(tree, options);
    assert.deepEqual(await Tree.plain(dist), {
      "index.js": "console.log('Hello, world!');\n",
    });
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
    const dist = await tsc(tree);
    assert.deepEqual(await Tree.plain(dist), {
      "index.js": "console.log('Hello, world!');\n",
    });
  });
});
