import { toJsonValue, toString } from "@weborigami/origami";
import Handlebars from "handlebars";

/**
 * A Handlebars template file
 *
 * Unpacking a Handlebars template returns a function that applies the template.
 */
export default {
  /** @type {import("@weborigami/language").FileUnpackFunction} */
  async unpack(input, options = {}) {
    const text = toString(input);
    const templateFn = Handlebars.compile(text);
    const fn = async (input) => {
      const data = input ? await toJsonValue(input) : null;
      return templateFn(data);
    };
    return fn;
  },
};
