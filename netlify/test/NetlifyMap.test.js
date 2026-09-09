import { Tree } from "@weborigami/async-tree";
import assert from "node:assert";
import fs from "node:fs/promises";
import { describe, test } from "node:test";
import netlify from "../src/netlify.js";

const tokenPath = new URL("../token.txt", import.meta.url);
const tokenBuffer = await fs.readFile(tokenPath);
const token = new TextDecoder().decode(tokenBuffer).trim();

const fixture = await netlify({
  projectId: "59bca707-6a99-44b0-827d-024ba7d2ec73",
  projectName: "origami-netlify-test",
  token,
});

describe("NetlifyMap", () => {
  test("get", async () => {
    const buffer = await fixture.get("index.html");
    const text = new TextDecoder().decode(buffer);
    assert(text.includes("<!DOCTYPE html>"));
  });

  test("keys", async () => {
    const keys = await Tree.keys(fixture);
    assert(keys.includes("assets/"));
    assert(keys.includes("index.html"));
  });
});
