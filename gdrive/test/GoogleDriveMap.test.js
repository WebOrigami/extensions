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
    const keys = [];
    for await (const key of fixture.keys()) {
      keys.push(key);
    }
    assert.deepEqual(keys, [
      "images/",
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

  test("can create and delete a value", async () => {
    const key = "NewFile.txt";
    const value = "Hello, world!";

    if (await fixture.has(key)) {
      // We want to test creation, delete existing file
      await fixture.delete(key);
    }

    await fixture.set(key, value);
    const actualValue = await fixture.get(key);
    const text = String(actualValue);
    assert.equal(text, value);

    const deleted = await fixture.delete(key);
    assert(deleted);

    assert(!(await fixture.has(key)));
  });

  test("can create a subfolder", async () => {
    const key = "New Folder";

    if (await fixture.has(key)) {
      // We want to test creation, delete existing folder
      await fixture.delete(key);
    }

    await fixture.set(key, fixture.constructor.EMPTY);
    assert(await fixture.has(key));

    const deleted = await fixture.delete(key);
    assert(deleted);
  });
});
