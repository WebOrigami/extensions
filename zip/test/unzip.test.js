import { Tree } from "@weborigami/async-tree";
import assert from "node:assert";
import fs from "node:fs/promises";
import { describe, test } from "node:test";
import unzip from "../src/unzip.js";

describe("unzip", () => {
  test("reads a ZIP file", async () => {
    const fixturePath = new URL("fixtures/test.zip", import.meta.url);
    const buffer = await fs.readFile(fixturePath);
    const tree = await unzip(buffer);
    const plain = await Tree.plain(tree);
    assert.deepEqual(Object.keys(plain), ["ReadMe.md", "sub"]);
    assert.deepEqual(Object.keys(plain.sub), ["file.txt"]);
    assert.equal(String(plain["ReadMe.md"]), "This is a ReadMe file.\n");
    assert.equal(
      String(plain.sub["file.txt"]),
      "This is a text file in a subfolder.\n"
    );
  });
});
