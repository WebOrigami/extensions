import { FileMap, toString, Tree } from "@weborigami/async-tree";
import assert from "node:assert";
import { before, describe, test } from "node:test";
import auth from "../src/connect.js";

describe("DropboxMap", () => {
  let fixture;

  before(async () => {
    const projectUrl = new URL("..", import.meta.url);
    const parent = new FileMap(projectUrl);
    const credsBuffer = await parent.get("creds.json");
    const creds = JSON.parse(toString(credsBuffer));
    const tree = await auth(creds, { parent });
    fixture = await tree.get("Test/");
  });

  describe("get", () => {
    test("get file", async () => {
      const buffer = await fixture.get("teamData.yaml");
      const text = toString(buffer);
      assert(text.includes("Alice"));
      // Can unpack value
      const value = await Tree.traverse(buffer, "0/", "name");
      assert.equal(value, "Alice");
    });

    test("get subtree for a key that ends in a slash", async () => {
      const subtree = await fixture.get("images/");
      assert(Tree.isMap(subtree));
      assert.equal(subtree.path, "/Test/images/");
    });

    test("get subtree even if key doesn't end in slash", async () => {
      const subtree = await fixture.get("images");
      assert(Tree.isMap(subtree));
      assert.equal(subtree.path, "/Test/images/");
    });
  });

  test("keys", async () => {
    const keys = [];
    for await (const key of fixture.keys()) {
      keys.push(key);
    }
    assert.deepEqual(keys, ["images/", "ReadMe.md", "teamData.yaml"]);
  });

  describe("set", () => {
    test.only("set method can create a new file", async () => {
      await fixture.set("newfile.txt", "This is a new file.");
      const buffer = await fixture.get("newfile.txt");
      const text = new TextDecoder().decode(buffer);
      assert.equal(text, "This is a new file.");
      await fixture.delete("newfile.txt");
    });
  });
});
