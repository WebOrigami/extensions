import { FileMap, toString, Tree } from "@weborigami/async-tree";
import assert from "node:assert";
import { before, describe, test } from "node:test";
import connect from "../src/connect.js";

describe("DropboxMap", () => {
  let fixture;

  before(async () => {
    const projectUrl = new URL("..", import.meta.url);
    const parent = new FileMap(projectUrl);
    const credsBuffer = await parent.get("creds.json");
    const creds = JSON.parse(toString(credsBuffer));
    fixture = await connect(creds, { parent });
  });

  describe("get", () => {
    test("get file", async () => {
      const buffer = await fixture.get("feed.json");
      const text = toString(buffer);
      assert(text.includes("#pondlife"));
      // Can unpack value
      const value = await Tree.traverse(buffer, "title");
      assert.equal(value, "#pondlife");
    });

    test("get method with trailing slash returns a subdirectory", async () => {
      const assets = await fixture.get("assets/");
      const keys = await Tree.keys(assets);
      assert(keys.includes("styles.css"));
    });

    test("get method without a trailing slash returns a subdirectory", async () => {
      // Note: This only works if `assets` contains files
      const assets = await fixture.get("assets");
      const keys = await Tree.keys(assets);
      assert(keys.includes("styles.css"));
    });

    test("get non-existent key", async () => {
      const result = await fixture.get("nonexistent.txt");
      assert.equal(result, undefined);
    });
  });

  describe("keys", () => {
    test("keys method yields top-level keys", async () => {
      const keys = await Tree.keys(fixture);
      assert(keys.includes("index.html"));
      assert(keys.includes("assets/"));
    });

    test("keys method yields keys in subdirectory", async () => {
      const assets = await fixture.get("assets/");
      const keys = await Tree.keys(assets);
      assert(keys.includes("styles.css"));
    });
  });

  describe("set", () => {
    test.skip("set method can create a new file", async () => {
      await fixture.set("newfile.txt", "This is a new file.");
      const buffer = await fixture.get("newfile.txt");
      const text = new TextDecoder().decode(buffer);
      assert.equal(text, "This is a new file.");
      await fixture.delete("newfile.txt");
    });
  });
});
