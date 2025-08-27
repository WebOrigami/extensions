import { isUnpackable, toPlainValue, toString } from "@weborigami/async-tree";
import matter from "gray-matter";
import { Liquid } from "liquidjs";

const engine = new Liquid();
// jekyll post_url engine
// TODO: generate the correct url
engine.registerTag("post_url", {
  parse(tagToken) {
    this.value = tagToken.args;
  },
  *render(ctx) {
    return this.value;
  },
});

console.error("loading, running");
export default {
  // mediaType: 'text/liquid',
  /** @type {import("@weborigami/language").UnpackFunction} */
  async unpack(packed, options = {}) {
    const templateDocument = toString(packed);

    // TODO: partials
    console.error("temp", templateDocument, options);

    const templateWithData = matter(templateDocument);
    console.error("data:", templateWithData);

    const parsedTemplate = engine.parse(templateWithData.content);
    // const parsedTemplate = engine.parse(templateDocument);

    return async (input) => {
      console.error("data -----------");
      // console.dir(data, { depth: 1,  });
      if (isUnpackable(input)) input = await input.unpack();
      const data = input ? await toPlainValue(input) : null;
      return engine.renderSync(parsedTemplate, data);
      // does this help me?
      // return {
      //   ...templateWithData.data,
      //   '_body': engine.renderSync(parsedTemplate, data)
      // }
    };
  },
};
