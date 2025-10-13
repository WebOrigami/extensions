import assert from "node:assert";
import { promises as fs } from "node:fs";
import { describe, test } from "node:test";
import auth from "../src/auth.js";

const credsPath = new URL("../creds.json", import.meta.url);
const creds = JSON.parse(await fs.readFile(credsPath));
const folderFn = await auth(creds);
const fixture = folderFn("1X3MWPXwwYXWarhNiCBIxCvGTyiBqISAF");

describe("gdoc", () => {
  test("returns a document as JSON text that can be unpacked to data", async () => {
    const sheet = await fixture.get("Sample.gdoc");
    const sheetText = String(sheet);
    const expectedPath = new URL("expectedSample.json", import.meta.url);
    const expectedText = String(await fs.readFile(expectedPath));
    assert.equal(sheetText, expectedText);
    const actualData = await sheet.unpack();
    const expectedData = JSON.parse(expectedText);
    assert.deepEqual(actualData, expectedData);
  });
});
