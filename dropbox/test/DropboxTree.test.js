import { FileTree, toString, Tree } from "@weborigami/async-tree";
import assert from "node:assert";
import { before, describe, test } from "node:test";
import auth from "../src/auth.js";

describe("DropboxTree", () => {
  let fixture;

  before(async () => {
    const projectUrl = new URL("..", import.meta.url);
    const projectTree = new FileTree(projectUrl);
    const credsBuffer = await projectTree.get("creds.json");
    const creds = JSON.parse(toString(credsBuffer));
    const tree = await auth(creds);
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
