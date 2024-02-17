import Zip from "adm-zip";
import assert from "node:assert";
import { describe, test } from "node:test";
import zip from "../src/zip.js";

describe("zip", () => {
  test("creates a ZIP file as Buffer", async () => {
    const tree = {
      "ReadMe.md": "This is a ReadMe file.",
      sub: {
        "file.txt": "This is a text file in a subfolder.",
      },
    };
    const buffer = await zip(tree);
    const unzipped = new Zip(buffer);
    const entries = unzipped.getEntries();
    assert.equal(entries.length, 2);
    assert.equal(entries[0].entryName, "ReadMe.md");
    assert.equal(
      entries[0].getData().toString("utf8"),
      "This is a ReadMe file."
    );
    assert.equal(entries[1].entryName, "sub/file.txt");
    assert.equal(
      entries[1].getData().toString("utf8"),
      "This is a text file in a subfolder."
    );
  });
});
