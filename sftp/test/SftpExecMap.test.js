import { FileMap } from "@weborigami/async-tree";
import assert from "node:assert";
import { describe, test } from "node:test";
import auth from "../src/auth.js";

const parentUrl = new URL(".", import.meta.url);
const parent = new FileMap(parentUrl);

// Traverse to the fixture directory in the SFTP server
const fixturePath = new URL("fixture", import.meta.url).pathname;
const fixtureFiles = new FileMap(fixturePath);
const fixture = await auth(
  {
    exec: true,
    host: "localhost",
    path: fixturePath,
  },
  { parent },
);

describe("SftpExecMap", () => {
  test("child calls mkdir", async () => {
    const child = await fixture.child("newdir");
    assert.equal(child.path, fixture.path + "newdir/");
    assert(await fixtureFiles.get("newdir/"));
    await fixtureFiles.delete("newdir/");
  });

  test("child removes preexisting file before calling mkdir", async () => {
    await fixtureFiles.set("newdir", "some content");
    const child = await fixture.child("newdir");
    assert.equal(child.path, fixture.path + "newdir/");
    assert(await fixtureFiles.get("newdir/"));
    await fixtureFiles.delete("newdir/");
  });

  test("manifest", async () => {
    const manifest = await fixture.manifest();
    const greetingsHash = manifest.get("greetings.yaml");
    assert.equal(greetingsHash, "7227b6f0c50442a4396a230665f505568642094f");
  });
});
