import { toString } from "@weborigami/origami";
import screenshot from "./screenshot.js";

export default async function screenshotHtml(input, options) {
  const html = toString(input);
  return screenshot((page) => page.setContent(html), options);
}

screenshotHtml.keyMap = (sourceKey) =>
  replaceExtension(sourceKey, ".html", ".png");
screenshotHtml.inverseKeyMap = (resultKey) =>
  replaceExtension(resultKey, ".png", ".html");
