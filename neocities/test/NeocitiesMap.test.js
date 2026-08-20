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
const root = await auth(token, { parent });

describe("NeocitiesMap", () => {
  test("get method returns a file", async () => {
    const indexBuffer = await root.get("index.html");
    const indexHtml = new TextDecoder().decode(indexBuffer);
    assert(indexHtml.includes("<h1>Welcome</h1>"));
  });

  test("get method with trailing slash returns a subdirectory", async () => {
    const src = await root.get("src/");
    const keys = await Tree.keys(src);
    assert(keys.includes("test.txt"));
  });

  test("get method without a trailing slash returns a subdirectory", async () => {
    const src = await root.get("src");
    const keys = await Tree.keys(src);
    assert(keys.includes("test.txt"));
  });

  test("keys method yields top-level keys", async () => {
    const keys = await Tree.keys(root);
    assert(keys.includes("index.html"));
    assert(keys.includes("images/"));
  });

  test("keys method yields keys in subdirectory", async () => {
    const src = await root.get("src/");
    const keys = await Tree.keys(src);
    assert(keys.includes("test.txt"));
  });
});
