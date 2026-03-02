import { JSDOM } from "jsdom";
import assert from "node:assert";
import fs from "node:fs/promises";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

let pagefind;
let originalFetch;

/**
 * Tests for the pagefind extension
 *
 * These assume that the test site has already been created at `./build`.
 *
 * While Pagefind's indexer is designed to be invoked in Node.js, its search
 * feature is meant to be used in the browser. This makes it hard to test. We
 * work around this by creating an emulated browser environment using JSDOM, and
 * patching `fetch()` to read files directly from the file system. This appears
 * to be sufficient.
 *
 * Caution: because these tests are async and patch globals, they could cause
 * problems if run in parallel with other tests.
 */
describe("pagefind extension", () => {
  before(async () => {
    // Create an emulated browser window to meet Pagefind's expectations
    const dom = new JSDOM(`<!doctype html><html lang="en"></html>`, {
      url: "fake://test/",
      pretendToBeVisual: true,
    });
    globalThis.document = dom.window.document;
    globalThis.window = dom.window;

    // Patch fetch() to read files directly
    originalFetch = globalThis.fetch;
    globalThis.fetch = async (resource, options) => {
      const pathname = new URL(resource).pathname;
      if (pathname.startsWith(dirname)) {
        const data = await fs.readFile(pathname);
        return new Response(data);
      }
    };

    const pagefindPath = path.join(dirname, "build/pagefind/pagefind.js");
    pagefind = await import(pagefindPath);
    await pagefind.init();
  });

  test("can find expected word", async () => {
    const search = await pagefind.search("world");
    const results = search.results;
    assert.equal(results.length, 2);
    const datas = await Promise.all(
      search.results.map((result) => result.data()),
    );
    const contents = datas.map((data) => data.raw_content);
    assert(contents.every((c) => c.includes("world")));
  });

  after(() => {
    // Clean up the global scope
    delete globalThis.document;
    delete globalThis.window;
    if (originalFetch) {
      globalThis.fetch = originalFetch;
    }
  });
});
