import {
  getParent,
  isUnpackable,
  toPlainValue,
  toString,
  Tree,
} from "@weborigami/async-tree";
import { Liquid } from "liquidjs";
import path from "node:path";
import * as YAMLModule from "yaml";

// The "yaml" package doesn't seem to provide a default export that the browser can
// recognize, so we have to handle two ways to accommodate Node and the browser.
// @ts-ignore
const YAML = YAMLModule.default ?? YAMLModule.YAML;

/**
 * Wrap the compiled template function to handle the parsing of input, the
 * inclusion of layout data, and the invocation of any base layout template.
 */
function wrapTemplateFunction(engine, parent, templateFn, layoutData) {
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
      if (!parent) {
        throw new Error(
          `A Liquid template layout without a parent folder can't load a base layout like "${baseTemplatePath}".`
        );
      }
      let baseTemplatePath = layoutData.layout;
      if (!baseTemplatePath.endsWith(".liquid")) {
        baseTemplatePath += ".liquid";
      }
      const layoutTemplate = await Tree.traversePath(parent, baseTemplatePath);
      if (!layoutTemplate) {
        throw new Error(
          `A Liquid template layout references "${baseTemplatePath}", but that file can't be found.`
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

// Return a Liquid virtual file system backed by the given tree.
// See https://liquidjs.com/api/interfaces/FS.html
function liquidFs(tree) {
  return {
    // This appears to be a sync method; return true and rely on readFile to
    // actually look for the file.
    contains(root, file) {
      return true;
    },

    dirname(filePath) {
      return path.dirname(filePath);
    },

    // TODO
    async exists(filePath) {
      return true;
    },

    async readFile(filePath) {
      if (filePath.startsWith("./")) {
        filePath = filePath.substring(2);
      }
      const value = await Tree.traversePath(tree, filePath);
      return value ? toString(value) : undefined;
    },

    resolve(dir, file, ext) {
      return `${dir}/${file}${ext}`;
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

  return wrapTemplateFunction(engine, parent, templateFn, layoutData);
}

export default {
  mediaType: "text/plain",
  unpack,
};
