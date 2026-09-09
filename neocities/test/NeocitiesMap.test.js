import { FileMap, Tree } from "@weborigami/async-tree";
import assert from "node:assert";
import { promises as fs } from "node:fs";
import { describe, test } from "node:test";
import connect from "../src/connect.js";
import NeocitiesMap from "../src/NeocitiesMap.js";

const parentUrl = new URL("..", import.meta.url);
const parent = new FileMap(parentUrl);
const tokenPath = new URL("../token.txt", import.meta.url);
const tokenBuffer = await fs.readFile(tokenPath);
const token = new TextDecoder().decode(tokenBuffer).trim();
const fixture = await connect({ token }, { parent });

describe("NeocitiesMap", () => {
  test("apply method can upload and delete files", async () => {
    const source1 = {
      "test.txt": "This is a test file.",
      subdir: {
        "nested.txt": "This is a nested file.",
      },
    };
    await fixture.apply(source1);

    const keys1 = await Tree.keys(fixture);
    assert(keys1.includes("test.txt"));
    assert(keys1.includes("subdir/"));

    const source2 = {
      "test.txt": undefined, // Delete this file
      subdir: undefined, // Delete this directory
    };
    await fixture.apply(source2);

    const keys2 = await Tree.keys(fixture);
    assert(!keys2.includes("test.txt"));
    assert(!keys2.includes("subdir/"));
  });

  describe("child", () => {
    test("child returns existing subdirectory", async () => {
      const child = await fixture.child("posts");
      assert(child instanceof NeocitiesMap);
    });

    test("child creates a new subdirectory if it does not exist", async () => {
      const child = await fixture.child("sub");
      const keys = await Tree.keys(fixture);
      assert(keys.includes("sub/"));
      assert(child instanceof NeocitiesMap);
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
      assert(child instanceof NeocitiesMap);
      const childKeys = await Tree.keys(child);
      assert.equal(childKeys.length, 0);
      await fixture.delete("sub");
    });
  });

  describe("delete", () => {
    test("delete method can delete a file", async () => {
      await fixture.apply({
        "test.txt": "This is a test file.",
      });
      await fixture.delete("test.txt");
      const keys = await Tree.keys(fixture);
      assert(!keys.includes("test.txt"));
    });

    test("delete method can delete a subdirectory", async () => {
      await fixture.apply({
        subdir: {
          "nested.txt": "This is a nested file.",
        },
      });
      await fixture.delete("subdir/");
      const keys = await Tree.keys(fixture);
      assert(!keys.includes("subdir/"));
    });
  });

  describe("get", () => {
    test("get method returns a file", async () => {
      const indexBuffer = await fixture.get("index.html");
      const indexHtml = new TextDecoder().decode(indexBuffer);
      assert(indexHtml.includes("<!DOCTYPE html>"));
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

  test("manifest", async () => {
    const manifest = await fixture.manifest();
    assert(manifest);
    assert(manifest.has("index.html"));
  });

  describe("set", () => {
    test("set method can create a new file", async () => {
      await fixture.set("newfile.txt", "This is a new file.");
      const buffer = await fixture.get("newfile.txt");
      const text = new TextDecoder().decode(buffer);
      assert.equal(text, "This is a new file.");
      await fixture.delete("newfile.txt");
    });
  });
});
