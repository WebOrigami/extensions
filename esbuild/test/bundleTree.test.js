import assert from "node:assert";
import { describe, test } from "node:test";
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
});
