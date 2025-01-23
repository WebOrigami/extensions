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
    assert(result.includes("Hello, world!"));
  });

  test("resolves node paths using project's node_modules", async () => {
    const rootPath = path.resolve(fileURLToPath(import.meta.url), "../../");
    const rootFiles = new FileTree(rootPath);
    // The app.js references a sample module in devDependencies
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

  test("creates a default entry point if none is provided", async () => {
    const result = await bundleTree({
      "app.js": `
          import message from "./hello.js";
          console.log(message);
        `,
      "hello.js": `
          export default "Hello, world!";
        `,
    });
    assert(result.includes("Hello, world!"));
  });

  test("multiple entry points returns tree", async () => {
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
      ["app.js", "hello.js"]
    );
    assert(result["hello.js"].includes("Hello, world!"));
  });
});
