import { FileMap, toString, Tree } from "@weborigami/async-tree";
import assert from "node:assert";
import { before, describe, test } from "node:test";
import dropbox from "../src/dropbox.js";
import DropboxMap from "../src/DropboxMap.js";

describe("DropboxMap", () => {
  let fixture;

  before(async () => {
    const projectUrl = new URL("..", import.meta.url);
    const parent = new FileMap(projectUrl);
    const credsBuffer = await parent.get("creds.json");
    const creds = JSON.parse(toString(credsBuffer));
    fixture = await dropbox(creds, { parent });
  });

  test("apply", async () => {
    // Create a temp text file we can delete
    await fixture.set("temp.txt", "This file was created by a unit test.");

    // Apply updates to the fixture
    const updates = {
      assets: {
        "temp.css": "/* This file was created by a unit test. */",
      },
      "temp.txt": undefined, // Mark temp.txt for deletion
    };
    await fixture.apply(updates);

    // Check updates
    const assets = await fixture.get("assets/");
    const tempCss = await assets.get("temp.css");
    assert.equal(toString(tempCss), updates.assets["temp.css"]);
    const tempTxt = await fixture.get("temp.txt");
    assert.equal(tempTxt, undefined);

    // Remove remaining temp file
    await assets.delete("temp.css");
  });

  describe("child", () => {
    test("child returns existing subdirectory", async () => {
      const child = await fixture.child("posts");
      assert(child instanceof DropboxMap);
    });

    test("child creates a new subdirectory if it does not exist", async () => {
      const child = await fixture.child("sub");
      const keys = await Tree.keys(fixture);
      assert(keys.includes("sub/"));
      assert(child instanceof DropboxMap);
      const childKeys = await Tree.keys(child);
      assert.equal(childKeys.length, 0);
      await fixture.delete("sub");
    });

    test("child creates a new subdirectory even if file exists with that name", async () => {
      await fixture.set(
        "sub",
        "This is a file with the same name as the subdirectory.",
      );
      const child = await fixture.child("sub");
      const keys = await Tree.keys(fixture);
      assert(keys.includes("sub/"));
      assert(child instanceof DropboxMap);
      const childKeys = await Tree.keys(child);
      assert.equal(childKeys.length, 0);
      await fixture.delete("sub");
    });
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

  describe("set and delete", () => {
    test("set and delete a file", async () => {
      await fixture.set("newfile.txt", "This is a new file.");
      const buffer = await fixture.get("newfile.txt");
      const text = new TextDecoder().decode(buffer);
      assert.equal(text, "This is a new file.");
      const deleted = await fixture.delete("newfile.txt");
      assert(deleted);
    });

    test("set and delete a subdirectory", async () => {
      const subdir = await fixture.get("subdir/");
      await subdir.set("nested.txt", "This is a nested file.");
      const deleted = await fixture.delete("subdir/");
      assert(deleted);
      const keys = await Tree.keys(fixture);
      assert(!keys.includes("subdir/"));
    });
  });
});
