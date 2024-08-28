import { Tree } from "@weborigami/async-tree";
import assert from "node:assert";
import { describe, test } from "node:test";
import ts from "typescript";
import treeCompilerHost from "../src/host.js";

describe("host", () => {
  test("can be fed to TypeScript compiler", async () => {
    const tree = {
      "index.ts": "console.log('Hello, world!');",
    };
    const host = await treeCompilerHost(tree);
    const paths = await Tree.paths(tree);
    const options = {
      allowJs: true,
      module: ts.ModuleKind.ESNext,
    };
    const program = ts.createProgram(paths, options, host);
    program.emit();

    const sourceFile = program.getSourceFile("index.ts");
    assert(sourceFile);
    const statements = sourceFile.statements;
    assert.equal(statements.length, 1);
    assert.equal(
      statements[0].getText(sourceFile),
      "console.log('Hello, world!');"
    );
  });
});
