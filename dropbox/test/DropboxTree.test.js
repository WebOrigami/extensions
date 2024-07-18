import { toString } from "@weborigami/async-tree";
import assert from "node:assert";
import { promises as fs } from "node:fs";
import { describe, test } from "node:test";
import auth from "../src/auth.js";

const credsPath = new URL("../creds.json", import.meta.url);
const creds = JSON.parse(await fs.readFile(credsPath));
const fixture = await auth(creds, "Test");

describe("DropboxTree", () => {
  test("can get keys", async () => {
    const keys = await fixture.keys();
    assert.deepEqual(keys, ["images", "ReadMe.md"]);
  });

  test("can get a value", async () => {
    const value = await fixture.get("ReadMe.md");
    const text = toString(value);
    assert.equal(
      text,
      "This folder is used to test the Origami Dropbox extension.\n"
    );
  });

  test("can test whether a key is for a subtree", async () => {
    assert(await fixture.isKeyForSubtree("images"));
    assert(!(await fixture.isKeyForSubtree("ReadMe.md")));
  });
});
