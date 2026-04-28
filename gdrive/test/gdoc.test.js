import { FileMap } from "@weborigami/async-tree";
import assert from "node:assert";
import { promises as fs } from "node:fs";
import { describe, test } from "node:test";
import auth from "../src/auth.js";

const parentUrl = new URL("..", import.meta.url);
const parent = new FileMap(parentUrl);
const credsPath = new URL("../creds.json", import.meta.url);
const creds = JSON.parse(await fs.readFile(credsPath));
const folderFn = await auth(creds, { parent });
const fixture = folderFn("1X3MWPXwwYXWarhNiCBIxCvGTyiBqISAF");

describe("gdoc", () => {
  test("returns a document as JSON text that can be unpacked to data", async () => {
    const sheet = await fixture.get("Sample.gdoc");
    const sheetText = String(sheet);
    const excerpt = sheetText.slice(0, 23);
    assert.equal(excerpt, '{\n  "title": "Sample",\n');
    const data = await sheet.unpack();
    const firstParagraph =
      data.body.content[1].paragraph.elements[0].textRun.content;
    assert.equal(firstParagraph, "This is a sample Google Docs document.\n");
  });
});
