This package defines a handler for [Handlebars](https://handlebarsjs.com) templates that can be used in [Origami](https://weborigami.org) programs.

This is intended to be useful to Handlebars users, and also as a reference implementation of writing a handler for a new file type in Origami. (Also see the [Liquid template extension](../liquid/).)

## Installation

1. Add the `@weborigami/handlebars` package as a dependency in your project's `package.json`.
1. At the root of your project, create a file called `config.ori` that includes:

```
{
  hbs_handler = package:@weborigami/handlebars
}
```

This tells Origami to use the indicated package whenever it needs to process a Handlebars file with a `.hbs` extension.

You can then apply Handlebars templates as functions in Origami site definitions and in the terminal via the [ori](https://weborigami.org/cli) command-line interface.

The following use demos in the `demos` folder.

## Invoking templates in the shell

Suppose a Handlebars template `greet.hbs` contains:

```hbs
Hello, {{name}}!
```

You can invoke this Handlebars template as a function in the shell:

```console
$ ori "greet.hbs('Alice')"
Hello, Alice!
```

Since the input here is a simple string, you can also using Origami's slash syntax:

```console
$ ori greet.hbs/Bob
Hello, Bob!
```

## Applying templates to data in data files

You can reference other files and pass those as input to a Handlebars template. Before invoking the template, Origami loads the data from a file if the file is a known [built-in file type](https://weborigami.org/language/filetypes) or known custom file type.

The `demos/list` directory has a data file `countries.yaml` that contains:

```yaml
- name: France
  flag: 🇫🇷
- name: Greece
  flag: 🇬🇷
- name: Italy
  flag: 🇮🇹
- name: Portugal
  flag: 🇵🇹
- name: Spain
  flag: 🇪🇸
```

and a Handlebars template `countries.hbs` that contains

```hbs
<ul>
  {{#each this}}
    <li>{{flag}} {{name}}</li>
  {{/each}}
</ul>
```

You can apply the template as a function to the data with

```console
$ ori "countries.hbs(countries.yaml)"
```

Or take advantage of Origami's support for implicit parentheses to avoid the quotes:

```console
$ ori countries.hbs countries.yaml
```

In either case, the output is

```html
<ul>
  <li>🇫🇷 France</li>
  <li>🇬🇷 Greece</li>
  <li>🇮🇹 Italy</li>
  <li>🇵🇹 Portugal</li>
  <li>🇪🇸 Spain</li>
</ul>
```

You could also pull the data directly from a web server:

```console
$ ori countries.hbs https://raw.githubusercontent.com/WebOrigami/extensions/main/handlebars/demos/list/countries.yaml
```

## Applying templates to the file system

Because Origami treats the file system as a tree of resources, you can also feed a folder tree to a Handlebars template.

The `demos/files` folder has a folder of HTML files called `pages`.

```console
$ ls pages
Alice.html Bob.html   Carol.html
$ cat pages/Alice.html
<p>Hello, <strong>Alice</strong>.</p>
```

The folder also contains a `links.hbs` template:

```hbs
<ul>
  {{#each this}}
    <li>
      <a href="{{@key}}">{{this}}</a>
    </li>
  {{/each}}
</ul>
```

This `pages` folder can be passed as input to this template to generate a list of links to the files:

```console
$ ori links.hbs pages
```

Origami loads all the files in the `pages` folder into an in-memory object, then passes that to the Handlebars template to produce:

```html
<ul>
  <li>
    <a href="Alice.html">Alice.html</a>
  </li>
  <li>
    <a href="Bob.html">Bob.html</a>
  </li>
  <li>
    <a href="Carol.html">Carol.html</a>
  </li>
</ul>
```

## Partial templates

Handlebars templates can reference [partials](https://handlebarsjs.com/guide/partials.html): other templates that can be called by name. This Handlebars feature lets you break complex templates down into smaller parts.

Before invoking a Handlebars template, Origami resolves any partial templates it references.

The `demos/partials` folder contains a simple `greet.hbs` template:

```hbs
Hello, {{#> bold }}{{this}}{{/bold}}!
```

Origami will resolve the `bold` reference by looking in [scope](https://weborigami.org/language/scope) for `bold.hbs`. In this case, Origami finds `bold.hbs` in that same folder:

```hbs
<b>{{this}}</b>
```

Invoking the top-level `greet.hbs` template will then invoke the partial `bold.hbs` template to produce the final result:

```console
$ ori greet.hbs/Carol
Hello, <b>Carol</b>!
```

## Using Handlebars templates in an Origami site

You can reference Handlebars templates in Origami site definitions.

The `demos/aboutUs` folder contains the complete source for a simple About Us site. This is a variation of the sample About Us site developed in the Web Origami [tutorial](https://weborigami.org/language/tutorial); see the tutorial for an explanation of how the site works.

In the Handlebars variation here, the tutorial's Origami templates are rewritten as equivalent Handlebars templates: the `index.hbs` template defines a team home page, and the `person.hbs` template defines a page for an individual team member.

Those templates are invoked by the top-level `site.ori` Origami program that defines the structure of the site.

```
// This file defines the site structure, using Handlebars templates to generate
// the index page and team member pages.
{
  index.html = index.hbs(teamData.yaml)
  team = @map(teamData.yaml, {
    key: (person) => `${person/name}.html`
    value: person.hbs
  })
  assets
  images
  thumbnails = @map(images, @image/resize({ width: 200 }))
}
```

The formula for `index.html` indicates that the `index.hbs` template should be applied to the data about team members in `teamData.yaml`. The formula for the `team` area indicates that Origami should generate a page for each team member using the `person.hbs` template.

You can run this site from the `demos/aboutUs` folder:

```console
$ ori @serve site.ori
```

## Larger example

The [Aventour Expeditions](https://github.com/WebOrigami/aventour-expeditions) sample site uses Handlebars to create a site for an adventure trekking company.
