import { isUnpackable, toString, Tree } from "@weborigami/async-tree";
import { constructResponse } from "@weborigami/origami";
import screenshot from "./screenshot.js";

const fakeHost = "http://screenshot.local";

/**
 * Return a screenshot of the given input HTML.
 *
 * @typedef {import("@weborigami/async-tree").SyncOrAsyncTree} SyncOrAsyncTree
 *
 * @param {string|ArrayBuffer|TypedArray|{ toString: function }} input
 * @param {{ deviceScaleFactor: number, height: number, resources: SyncOrAsyncTree, width: number }} options
 */
export default async function screenshotHtml(input, options = {}) {
  const html = toString(input);

  let { resources } = options;
  if (resources) {
    if (isUnpackable(resources)) {
      resources = await resources.unpack();
    }
    resources = Tree.from(resources);
  }

  return screenshot(async (page) => {
    await page.setRequestInterception(true);
    page.on("request", (request) => respondToRequest(request, resources));

    // This initial navigation is needed to set the correct origin.
    await page.goto(fakeHost, { waitUntil: "domcontentloaded" });

    // Set the HTML content
    await page.setContent(html);

    // Wait for things to be ready
    await page.waitForNetworkIdle();
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
  }, options);
}

/**
 * Given a fake puppeteer request, respond with a resource from the tree.
 */
async function respondToRequest(request, resources) {
  const url = new URL(request.url());
  if (url.origin === fakeHost) {
    if (url.pathname === "/") {
      // Initial request, return empty HTML document.
      request.respond({
        body: "",
        contentType: "text/html",
        status: 200,
      });
      return;
    }

    if (resources) {
      // See if we have a matching resource in the tree.
      const path = url.pathname.slice(1);
      const resource = await Tree.traversePath(resources, path);
      if (resource) {
        // Convert fake request to an object closer to a real Request.
        const req = {
          headers: request.headers(),
          method: request.method(),
          url: request.url(),
        };

        // Use Origami server logic to construct a standard Response.
        const response = await constructResponse(req, resource);

        // Convert standard Response to a fake puppeteer response.
        const arrayBuffer = await response.arrayBuffer();
        const body = Buffer.from(arrayBuffer);
        const headers = Object.fromEntries(response.headers.entries());

        // Add a CORS header to allow, e.g., fonts to load.
        headers["Access-Control-Allow-Origin"] = "*";

        request.respond({
          body,
          headers,
          status: response.status,
        });
        return;
      }
    }
  }

  // Let puppeteer handle request.
  request.continue();
}

screenshotHtml.keyMap = (sourceKey) =>
  replaceExtension(sourceKey, ".html", ".png");
screenshotHtml.inverseKeyMap = (resultKey) =>
  replaceExtension(resultKey, ".png", ".html");
