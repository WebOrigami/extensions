import { FileMap, Tree } from "@weborigami/async-tree";
import assert from "node:assert";
import { describe, test } from "node:test";
import auth from "../src/auth.js";

const parentUrl = new URL(".", import.meta.url);
const parent = new FileMap(parentUrl);

// Traverse to the fixture directory in the SFTP server
const fixturePath = new URL("fixture", import.meta.url).pathname;
const fixture = await auth(
  {
    host: "localhost",
    path: fixturePath,
  },
  { parent },
);

describe("SftpMap", () => {
  test("returns keys", async () => {
    const keys = await Tree.keys(fixture);
    assert.deepEqual(keys, ["greetings.yaml", "sub/"]);
  });

  test("can get a value", async () => {
    const buffer = await Tree.traverse(fixture, "sub/", "hello.txt");
    const text = new TextDecoder().decode(buffer);
    assert.equal(text, "Hello, world!");
  });

  test("adds extension handler", async () => {
    const buffer = await fixture.get("greetings.yaml");
    const data = await buffer.unpack();
    assert.deepEqual(data, {
      Alice: "Hello, Alice.",
      Bob: "Hello, Bob.",
      Carol: "Hello, Carol.",
    });
  });

  test("can get '..' to navigate to parent", async () => {
    const sub = await fixture.get("sub/");
    const parent = await sub.get("..");
    assert.equal(parent.path, fixture.path);
  });

  test("can't get '..' from root", async () => {
    const parent = await fixture.get("..");
    assert.equal(parent, undefined);
  });
});
