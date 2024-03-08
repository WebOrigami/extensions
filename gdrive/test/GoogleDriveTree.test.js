import assert from "node:assert";
import { promises as fs } from "node:fs";
import { describe, test } from "node:test";
import auth from "../src/auth.js";

const credsPath = new URL("../creds.json", import.meta.url);
const creds = JSON.parse(await fs.readFile(credsPath));
const folderFn = await auth(creds);
const fixture = folderFn("1X3MWPXwwYXWarhNiCBIxCvGTyiBqISAF");

describe("GoogleDriveTree", () => {
  test("can get keys", async () => {
    const keys = await fixture.keys();
    assert.deepEqual(keys, [
      "images",
      "ReadMe.md",
      "Sample.gdoc",
      "Team.gsheet",
    ]);
  });

  test("can get a value", async () => {
    const value = await fixture.get("ReadMe.md");
    const text = String(value);
    assert.equal(text, "This folder is used to test the gdrive extension.\n");
  });
});
