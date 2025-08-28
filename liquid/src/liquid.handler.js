import { isUnpackable, toPlainValue, toString } from "@weborigami/async-tree";
import { Liquid } from "liquidjs";
import * as YAMLModule from "yaml";
import getParent from "./getParent.js";

// The "yaml" package doesn't seem to provide a default export that the browser can
// recognize, so we have to handle two ways to accommodate Node and the browser.
// @ts-ignore
const YAML = YAMLModule.default ?? YAMLModule.YAML;

// Return a Liquid virtual file system backed by the given tree.
// See https://liquidjs.com/api/interfaces/FS.html
function liquidFs(tree) {
  return {
    // TODO
    contains(root, file) {
      return true;
    },

    // TODO
    dirname(filePath) {
      debugger;
      return filePath.substring(0, filePath.lastIndexOf("/"));
    },

    // TODO
    async exists(filePath) {
      return true;
    },

    async readFile(filePath) {
      const value = await tree.get(filePath);
      return value ? toString(value) : undefined;
    },

    // TODO
    resolve(dir, file, ext) {
      return file;
    },

    sep: "/",
  };
}

/** @type {import("@weborigami/language").UnpackFunction} */
function unpack(packed, options = {}) {
  // If a parent was supplied, provide a virtual file system for it
  const parent = getParent(packed, options);
  const liquidOptions = parent ? { fs: liquidFs(parent) } : {};
  const engine = new Liquid(liquidOptions);

  const text = toString(packed);

  // Does the text contain YAML front matter?
  const regex =
    /^(---\r?\n(?<frontText>[\s\S]*?\r?\n?)---\r?\n)(?<body>[\s\S]*$)/;
  const match = regex.exec(text);
  const layoutData = match ? YAML.parse(match.groups.frontText) : null;
  const content = match?.groups.body ?? text;

  const templateFn = engine.parse(content);

  return async (input) => {
    if (isUnpackable(input)) {
      input = await input.unpack();
    }
    const inputData = input ? await toPlainValue(input) : {};
    const data = layoutData ? { ...inputData, layout: layoutData } : inputData;

    // Render this template
    let result = await engine.render(templateFn, data);

    if (layoutData?.layout) {
      // Wrap result in base template
      let baseTemplateName = layoutData.layout;
      if (!baseTemplateName.endsWith(".liquid")) {
        baseTemplateName += ".liquid";
      }
      const layoutTemplate = await parent.get(baseTemplateName);
      if (!layoutTemplate) {
        throw new Error(
          `A Liquid template layout references "${baseTemplateName}", but that file can't be found.`
        );
      }
      const layoutFn = unpack(layoutTemplate);
      result = await layoutFn({
        content: result,
      });
    }

    return result;
  };
}

export default {
  mediaType: "text/plain",
  unpack,
};
