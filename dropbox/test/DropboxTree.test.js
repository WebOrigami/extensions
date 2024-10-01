import { toString, Tree } from "@weborigami/async-tree";
import { builtins } from "@weborigami/origami";
import assert from "node:assert";
import { promises as fs } from "node:fs";
import { before, describe, test } from "node:test";
import auth from "../src/auth.js";

describe("DropboxTree", () => {
  let fixture;

  before(async () => {
    const credsPath = new URL("../creds.json", import.meta.url);
    const creds = JSON.parse(await fs.readFile(credsPath));
    const scope = builtins;
    const tree = await auth.call(scope, creds);
    fixture = await tree.get("Test/");
  });

  test("can get keys", async () => {
    const keys = await fixture.keys();
    assert.deepEqual(keys, ["images/", "ReadMe.md", "teamData.yaml"]);
  });

  test("returns a subtree for a key that ends in a slash", async () => {
    const subtree = await fixture.get("images/");
    assert(Tree.isAsyncTree(subtree));
    assert.equal(subtree.path, "/Test/images/");
  });

  test("returns a subtree even if key doesn't end in slash", async () => {
    const subtree = await fixture.get("images");
    assert(Tree.isAsyncTree(subtree));
    assert.equal(subtree.path, "/Test/images/");
  });

  test("can get a value", async () => {
    const value = await fixture.get("ReadMe.md");
    const text = toString(value);
    assert.equal(
      text,
      "This folder is used to test the Origami Dropbox extension.\n"
    );
  });

  test("can traverse into a file that has a handler", async () => {
    const value = await Tree.traverse(fixture, "teamData.yaml/", "0/", "name");
    assert.equal(value, "Alice");
  });
});
