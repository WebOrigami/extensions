This package defines a handler for [Liquid](https://shopify.github.io/liquid/) templates in [Origami](https://weborigami.org) programs.

This is based on the [LiquidJS](https://liquidjs.com/) dialect of Liquid templates, the same one used by the [Jekyll](https://jekyllrb.com/) static site generator.

This is intended to be useful to people migrating from Jekyll or otherwise want to continue using Liquid templates in Origami. It also serves as a reference implementation of writing a handler for a new file type in Origami. (Also see the [Handlebars extension](../handlebars/).)

## Installation

1. Add the `@weborigami/liquid` package as a dependency in your project's `package.json`.
1. At the root of your project, create a file called `config.ori` that includes:

```
{
  liquid_handler = package:@weborigami/liquid
}
```

This tells Origami to use the indicated package whenever it needs to process a Liquid file with a `.liquid` extension.

You can then apply Liquid templates as functions in Origami site definitions and in the terminal via the [ori](https://weborigami.org/cli) command-line interface.

The following use demos in the `demos` folder.

## Features

Jekyll style front matter, layout front matter available in `layout.` property

This extension is _not_ meant to turn Origami into a drop-in replacement for Jekyll. This does not support, for example, the full list of [template variables supported by Jekyll](https://jekyllrb.com/docs/variables/).
