import { FileMap, Tree } from "@weborigami/async-tree";
import assert from "node:assert";
import { describe, test } from "node:test";
import auth from "../src/auth2.js";

const parentUrl = new URL(".", import.meta.url);
const parent = new FileMap(parentUrl);

// Traverse to the fixture directory in the SFTP server
const fixturePath = new URL("fixture", import.meta.url).pathname;
const fixtureFiles = new FileMap(fixturePath);
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

  test("can get the value for a key", async () => {
    const buffer = await Tree.traverse(fixture, "sub/", "hello.txt");
    const text = new TextDecoder().decode(buffer);
    assert.equal(text, "Hello, world!");
  });

  test("getting an unsupported key returns undefined", async () => {
    const value = await fixture.get("xyz");
    assert.equal(value, undefined);
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
    await assert.rejects(async () => fixture.get(".."), {
      name: "Error",
      message: /cannot traverse above root/,
    });
  });

  test("can set a value", async () => {
    const text = "Hello, Origami!";
    await fixture.set("temp.txt", text);
    const value = await fixture.get("temp.txt");
    const resultText = new TextDecoder().decode(value);
    assert.equal(resultText, text);

    // Clean up by deleting file directly
    await fixtureFiles.delete("temp.txt");
  });

  test("can delete a file", async () => {
    // Create the file directly
    await fixtureFiles.set("temp.txt", "Hello, Origami!");

    await fixture.delete("temp.txt");
    const value = await fixture.get("temp.txt");
    assert.equal(value, undefined);
  });

  test("can delete a directory with trailing slash", async () => {
    // Create the directory directly
    await fixtureFiles.child("temp");
    await fixture.delete("temp/");
    const value = await fixtureFiles.get("temp");
    assert.equal(value, undefined);
  });

  test("can delete a directory without trailing slash", async () => {
    // Create the directory directly
    await fixtureFiles.child("temp");
    await fixture.delete("temp");
    const value = await fixtureFiles.get("temp");
    assert.equal(value, undefined);
  });

  test("can create a child map", async () => {
    const child = await fixture.child("child");
    assert.equal(child.path, `${fixture.path}child/`);

    // Verify child directory was created
    const created = await fixtureFiles.has("child/");
    assert(created);

    // Clean up by deleting directory directly
    await fixtureFiles.delete("child");
  });
});
