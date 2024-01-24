import assert from "node:assert";
import fs from "node:fs/promises";
import { describe, test } from "node:test";
import screenshot from "../src/screenshot.js";

describe("screenshot", () => {
  test("generates a PNG screenshot for an HTML page", async () => {
    const htmlPath = new URL("test.html", import.meta.url);
    const htmlBuffer = await fs.readFile(htmlPath);
    const html = String(htmlBuffer);
    const actualBuffer = await screenshot(html);
    const expectedPath = new URL("test.png", import.meta.url);
    const expectedBuffer = await fs.readFile(expectedPath);
    assert.deepEqual(actualBuffer, expectedBuffer);
  });
});
