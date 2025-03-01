This [Origami](https://weborigami) package provides a way to bundle JavaScript
and TypeScript resources with [esbuild](https://esbuild.github.io/). This
effectively turns esbuild into a function:

```
esbuild(tree) → bundles
```

This function accepts a tree defined in any way (files, data file, in memory object, server resources, etc.) and return one or more bundles. This gives you a flexible way of defining where the esbuild input is coming from, it also lets you incorporate the esbuild output into your Origami project without a separate build step.

## Usage

1. Add this `@weborigami/esbuild` extension to your Origami project's dependencies and `npm install`.
2. In your site definition, call the extension and pass in the tree of JavaScript you want to bundle.

```ori
// site.ori
{
  index.js: package:@weborigami/esbuild(js)
}
```

As shown above, by default the `esbuild` function bundles all `.js` files in the given tree into a single JavaScript file.

The `esbuild` function accepts a second `options` parameter that will be passed to esbuild; see esbuild's [options documentation](https://esbuild.github.io/api/#general-options) for details. This can be used to, for example, set `entryPoints` and other bundling options. The `esbuild` function itself sets the `outdir` and `write` options to enable virtual files; those cannot be overridden. It also sets the default value of `bundle` to `true` and `format` to "esm".

Another example is to ask for source maps:

```ori
{
  ...package:@weborigami/esbuild(js, { sourcemap: true })
}
```

In a situation like this, `esbuild` will return multiple files. The Origami `...` spread operator can be used to incorporate the multiple files into the tree for the site. Here `esbuild` will return `index.js` and `index.js.map` files, so both will be added to the site.

Because Origami treats all trees equally, you can use Origami's many [tree operations](https://weborigami.org/builtins/tree) to compose, filter, or otherwise organize the input files before passing them to `esbuild`.

You can also obtain the tree of JavaScript or TypeScript from other locations. For example, [js.yaml](./demo/js.yaml) demonstrates a tiny set of JavaScript modules defined in a YAML file. This could be passed to the `esbuild` function directly:

```ori
{
  index.js: package@weborigami/esbuild(js.yaml)
}
```

Similarly, the [ts.yaml](./demo/ts.yaml) file can be substituted to show the bundling of TypeScript files.
