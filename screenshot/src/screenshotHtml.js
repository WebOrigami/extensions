import screenshot from "./screenshot.js";

/**
 * Return a screenshot of the given input HTML.
 *
 * @param {string|ArrayBuffer|TypedArray|{ toString: function }} input
 * @param {{ deviceScaleFactor: number, height: number, width: number }} options
 */
export default async function screenshotHtml(input, options) {
  const html = toString(input);
  return screenshot((page) => page.setContent(html), options);
}

// Accept HTML as an ArrayBuffer or TypedArray.
export function toString(input) {
  const TypedArray = Object.getPrototypeOf(Uint8Array);
  if (input instanceof ArrayBuffer || input instanceof TypedArray) {
    // Serialize data as UTF-8.
    const textDecoder = new TextDecoder();
    return textDecoder.decode(input);
  } else {
    return String(input);
  }
}

screenshotHtml.keyMap = (sourceKey) =>
  replaceExtension(sourceKey, ".html", ".png");
screenshotHtml.inverseKeyMap = (resultKey) =>
  replaceExtension(resultKey, ".png", ".html");
