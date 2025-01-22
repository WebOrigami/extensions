import { FileTree } from "@weborigami/async-tree";
import assert from "node:assert";
import path from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import bundleTree from "../src/bundleTree.js";

describe("bundleTree", () => {
  test("bundles JS modules", async () => {
    const result = await bundleTree(
      {
        "app.js": `
          import message from "./hello.js";
          console.log(message);
        `,
        "hello.js": `
          export default "Hello, world!";
        `,
      },
      "app.js"
    );
    assert(result.length > 0);
  });

  test("resolves node paths using project's node_modules", async () => {
    const rootPath = path.resolve(fileURLToPath(import.meta.url), "../../");
    const rootFiles = new FileTree(rootPath);
    const result = await bundleTree.call(
      rootFiles,
      {
        "app.js": `
          import { hello } from "mjs-example";
          console.log(hello);
        `,
      },
      "app.js"
    );
    // Confirm the import was resolved by looking for an expected string
    assert(result.includes("Hello world!"));
  });
});
