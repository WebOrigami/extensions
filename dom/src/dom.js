import { toString } from "@weborigami/async-tree";
import jsdom from "jsdom";

const { JSDOM } = jsdom;

export default function dom(html) {
  html = toString(html);
  const { window } = new JSDOM(html);
  const { document } = window;

  // Patch methods that return a NodeList to return a regular array
  const methods = [
    "querySelectorAll",
    "getElementsByTagName",
    "getElementsByClassName",
  ];
  methods.forEach((method) => {
    const original = document[method];
    document[method] = function (...args) {
      const nodeList = original.call(document, ...args);
      return Array.from(nodeList);
    };
  });

  return document;
}
