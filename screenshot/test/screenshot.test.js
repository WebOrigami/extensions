import assert from "node:assert";
import fs from "node:fs/promises";
import { describe, test } from "node:test";
import screenshotHtml from "../src/screenshotHtml.js";

describe("screenshot", () => {
  test("html: generates a PNG screenshot for the given HTML input", async () => {
    const htmlPath = new URL("test.html", import.meta.url);
    const htmlBuffer = await fs.readFile(htmlPath);
    const html = String(htmlBuffer);
    const actualBuffer = await screenshotHtml(html);
    const expectedPath = new URL("test.png", import.meta.url);
    const expectedBuffer = await fs.readFile(expectedPath);
    assert.deepEqual(actualBuffer, expectedBuffer);
  });
});
