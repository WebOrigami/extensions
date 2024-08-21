import { Tree } from "@weborigami/async-tree";
import assert from "node:assert";
import { promises as fs } from "node:fs";
import { describe, test } from "node:test";
import gist from "../src/gist.js";

const tokenPath = new URL("../githubToken", import.meta.url);
const token = await fs.readFile(tokenPath);

describe("gist", () => {
  test("can get a gist as a tree", async () => {
    const tree = await gist(token, "2d6e386378732c01110e2c61c3dadb76");
    assert.deepEqual(await Tree.plain(tree), {
      "README.md": "This is the Read Me file.",
      "data.json": '{\n  "message": "Hello, world!"\n}',
    });
  });
});
