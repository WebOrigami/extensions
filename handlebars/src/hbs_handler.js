import { Scope } from "@weborigami/language";
import { toString, toValue } from "@weborigami/origami";
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
    const scope = Scope.getScope(options.parent);
    const partials = await getPartials(scope, template);
    const templateFn = Handlebars.compile(template);
    const fn = async (input) => {
      const data = input ? await toValue(input) : null;
      return templateFn(data, { partials });
    };
    return fn;
  },
};

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
