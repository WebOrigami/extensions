import { toString } from "@weborigami/origami";
import screenshot from "./screenshot.js";

export default async function screenshotUrl(input, options) {
  const url = toString(input);
  return screenshot((page) => page.goto(url), options);
}
