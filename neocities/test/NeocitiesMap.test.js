import { FileMap, Tree } from "@weborigami/async-tree";
import assert from "node:assert";
import { promises as fs } from "node:fs";
import { describe, test } from "node:test";
import auth from "../src/auth.js";

const parentUrl = new URL("..", import.meta.url);
const parent = new FileMap(parentUrl);
const tokenPath = new URL("../token.txt", import.meta.url);
const tokenBuffer = await fs.readFile(tokenPath);
const token = new TextDecoder().decode(tokenBuffer).trim();
const root = await auth({ token }, { parent });

describe("NeocitiesMap", () => {
  test("get method returns a file", async () => {
    const indexBuffer = await root.get("index.html");
    const indexHtml = new TextDecoder().decode(indexBuffer);
    assert(indexHtml.includes("<!DOCTYPE html>"));
  });

  test("get method with trailing slash returns a subdirectory", async () => {
    const assets = await root.get("assets/");
    const keys = await Tree.keys(assets);
    assert(keys.includes("styles.css"));
  });

  test("get method without a trailing slash returns a subdirectory", async () => {
    const assets = await root.get("assets");
    const keys = await Tree.keys(assets);
    assert(keys.includes("styles.css"));
  });

  test("keys method yields top-level keys", async () => {
    const keys = await Tree.keys(root);
    assert(keys.includes("index.html"));
    assert(keys.includes("assets/"));
  });

  test("keys method yields keys in subdirectory", async () => {
    const assets = await root.get("assets/");
    const keys = await Tree.keys(assets);
    assert(keys.includes("styles.css"));
  });

  test("apply method can upload and delete files", async () => {
    const source1 = {
      "test.txt": "This is a test file.",
      subdir: {
        "nested.txt": "This is a nested file.",
      },
    };
    await root.apply(source1);

    const keys1 = await Tree.keys(root);
    assert(keys1.includes("test.txt"));
    assert(keys1.includes("subdir/"));

    const source2 = {
      "test.txt": undefined, // Delete this file
      subdir: undefined, // Delete this directory
    };
    await root.apply(source2);

    const keys2 = await Tree.keys(root);
    assert(!keys2.includes("test.txt"));
    assert(!keys2.includes("subdir/"));
  });
});
