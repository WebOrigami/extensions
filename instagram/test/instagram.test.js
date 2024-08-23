import assert from "node:assert";
import { promises as fs } from "node:fs";
import { describe, test } from "node:test";
import instagram from "../src/instagram.js";

const tokenPath = new URL("../token", import.meta.url);
const token = await fs.readFile(tokenPath);
const userId = "7920122544752391";
const fixture = await instagram(token, userId);
const album = await fixture.get("2020-08-04 16.06.46");

describe("instagram", () => {
  test("can get album keys", async () => {
    const keys = await album.keys();
    assert.deepEqual(keys, [
      "0.jpeg",
      "1.jpeg",
      "2.jpeg",
      "3.jpeg",
      "4.jpeg",
      "5.jpeg",
      "6.jpeg",
      "7.jpeg",
      "8.jpeg",
      "9.jpeg",
    ]);
  });

  test("can get an image from an album", async () => {
    const actual = Buffer.from(await album.get("2.jpeg"));
    const testImagePath = new URL("test.jpeg", import.meta.url);
    const expected = await fs.readFile(testImagePath);
    assert.deepEqual(actual, expected);
  });
});
