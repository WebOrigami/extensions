import screenshot from "./screenshot.js";

/**
 * Return a screenshot of the page at the given URL.
 *
 * @param {string} url
 * @param {{ deviceScaleFactor: number, height: number, width: number }} options
 */
export default async function screenshotUrl(url, options) {
  return screenshot((page) => page.goto(url), options);
}
