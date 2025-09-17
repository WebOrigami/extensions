import {
  isUnpackable,
  toPlainValue,
  toString,
  Tree,
} from "@weborigami/async-tree";
import Handlebars from "handlebars";

/**
 * A Handlebars template file
 *
 * Unpacking a Handlebars template returns a function that applies the template.
 */
export default {
  /** @type {import("@weborigami/language").UnpackFunction} */
  async unpack(packed, options = {}) {
    const template = toString(packed);
    let partials;
    if (options.parent) {
      const templateScope = await Tree.scope(options.parent);
      partials = await getPartials(templateScope, template);
    } else {
      partials = [];
    }
    const templateFn = Handlebars.compile(template);
    const fn = async (input) => {
      if (isUnpackable(input)) {
        input = await input.unpack();
      }
      const data = input ? await toPlainValue(input) : null;
      return templateFn(data, { partials });
    };
    return fn;
  },
};

/**
 * Returns the names of all the partials referenced in a Handlebars template.
 *
 * @param {string} template
 */
function findPartialReferences(template) {
  // Partials:
  // start with "{{>" or "{{#>"
  // then have optional whitespace
  // then start with a character that's not a "@" (like the special @partial-block)
  // then continue with any number of characters that aren't whitespace or a "}"
  // and aren't a reference to `partial-block`
  const regex = /{{#?>\s*(?<name>[^@\s][^\s}]+)/g;
  const matches = [...template.matchAll(regex)];
  const names = matches.map((match) => match.groups.name);
  const unique = [...new Set(names)];
  return unique;
}

/**
 * The most complex part of supporting Handlebars templates is handling
 * [partials](https://handlebarsjs.com/guide/partials.html): Handlebars
 * templates that can be reused inside other templates.
 *
 * This function finds the names of the partials used in a template, and then
 * looks in the Origami scope for the definition of those partials. If it finds
 * a reference to a partial called `foo`, it expects to find a definition for
 * that partial in a file called `foo.hbs`.
 */
async function getPartials(scope, template, partials = {}) {
  // Find the names of the partials used in the template.
  const partialReferences = findPartialReferences(template);

  // Which partials have we not already collected?
  const newPartials = partialReferences.filter((name) => !partials[name]);

  // Map those to corresponding .hbs filenames.
  const partialKeys = newPartials.map((name) => `${name}.hbs`);

  if (partialKeys.length > 0) {
    if (!scope) {
      throw `A Handlebars template references partials (${partialKeys}), but no scope was provided in which to search for them.`;
    }

    // Get the partials from scope.
    const partialPromises = partialKeys.map(async (name) => scope.get(name));
    let partialValues = await Promise.all(partialPromises);

    // Check to see whether any partials are missing.
    partialValues
      .filter((value) => value === undefined)
      .forEach((value, index) => {
        console.warn(`Partial ${partialKeys[index]} not found in scope.`);
      });

    // Get the text of the partials.
    partialValues = partialValues.map((value) => toString(value));

    // Save the partials we found for any recursive calls.
    partialValues.forEach((value, index) => {
      if (value) {
        partials[newPartials[index]] = value;
      }
    });

    // The partials may themselves reference other partials; collect those too.
    await Promise.all(
      partialValues.map(async (value) => {
        if (value) {
          const nestedPartials = await getPartials(scope, value, partials);
          Object.assign(partials, nestedPartials);
        }
      })
    );
  }
  return partials;
}
