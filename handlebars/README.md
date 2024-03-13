This package defines a loader for [Handlebars](https://handlebarsjs.com) templates that can be used in [Origami](https://weborigami.org) programs.

This is intended to be useful to Handlebars users, and also as a reference implementation of writing a loader for any new file type in Origami.

## Installation

1. Add the `@weborigami/handlebars` package as a dependency in your project's `package.json`.
1. At the root of your project, create a file called `config.ori` that includes:

```
{
  hbs.unpack = package:@weborigami/handlebars
}
```

This tells Origami to use the indicated package whenever it needs to process a Handlebars file with a `.hbs` extension.

You can then apply Handlebars templates as functions in Origami site definitions and in the terminal via the [ori](https://weborigami.org/cli) command-line interface.

## Example

After installing, you can add a Handlebars template `sample.hbs`:

```hbs
Hello, {{name}}!
```

and define data in a YAML (or JSON, or any other format supported by Origami) called `data.yaml`:

```yaml
name: Alice
```

You can then apply the template to the data in the shell:

```console
$ ori "sample.hbs(data.yaml)"
Hello, Alice!
```

Or take advantage of Origami's support for implicit parentheses to avoid the quotes:

```console
$ ori sample.hbs data.yaml
Hello, Alice!
```

The data can also be pulled directly from a non-local source:

```console
$ ori sample.hbs https://example.com/data.yaml
Hello, Alice!
```
