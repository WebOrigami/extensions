import assert from "node:assert";
import { promises as fs } from "node:fs";
import { describe, test } from "node:test";
import auth from "../src/auth.js";

const credsPath = new URL("../creds.json", import.meta.url);
const creds = JSON.parse(await fs.readFile(credsPath));
const folderFn = await auth(creds);
const fixture = folderFn("1X3MWPXwwYXWarhNiCBIxCvGTyiBqISAF");

describe("gsheet", () => {
  test("returns a sheet as JSON text that can be unpacked to data", async () => {
    const sheet = await fixture.get("Team.gsheet");
    const expectedPath = new URL("expectedTeam.json", import.meta.url);
    const expectedText = await fs.readFile(expectedPath);
    assert.equal(String(sheet), expectedText);
    const actualData = await sheet.unpack();
    const expectedData = JSON.parse(expectedText);
    assert.deepEqual(actualData, expectedData);
  });
});
