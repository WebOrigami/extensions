import assert from "node:assert";
import fs from "node:fs/promises";
import { describe, test } from "node:test";
import screenshotHtml from "../src/screenshotHtml.js";

describe("screenshotHtml", () => {
  test("generates a PNG screenshot for the given HTML input", async () => {
    const htmlPath = new URL("test.html", import.meta.url);
    const htmlBuffer = await fs.readFile(htmlPath);
    const html = String(htmlBuffer);
    const actualBuffer = await screenshotHtml(html);
    const expectedPath = new URL("test.png", import.meta.url);
    const expectedBuffer = await fs.readFile(expectedPath);
    assert.deepEqual(actualBuffer, expectedBuffer);
  });

  test("can load resources from an optional resources tree", async () => {
    const resources = new Map([
      ["assets", new Map([["styles.css", "body { color: red; }"]])],
    ]);
    const html = `
      <link rel="stylesheet" href="assets/styles.css">
      <p>This text should be red.</p>
    `;
    const actualBuffer = await screenshotHtml(html, { resources });
    const expectedPath = new URL("test-resources.png", import.meta.url);
    // await fs.writeFile(expectedPath, actualBuffer);
    const expectedBuffer = await fs.readFile(expectedPath);
    assert.deepEqual(actualBuffer, expectedBuffer);
  });
});
