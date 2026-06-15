This extension provides screenshot functions that can render a web page as a PNG, JPEG, WebP, or PDF image.

The extension uses [Puppeteer](https://pptr.dev/), a headless Chrome browser, to render pages. The Puppeteer package is wonderful but quite heavy in size (~100MB).

# Usage in Origami

Install this package in your [Origami](https://weborigami.org) project:

```console
$ npm install --save @weborigami/screenshot
```

You can convert HTML to a PNG screenshot in a .ori file:

```
{
  index.html = "Hello, world."
  index.png = package:@weborigami/screenshot/html(index.html)
}
```

Or you can load and capture screenshots of a publicly-visible URL:

```
{
  example.png = package:@weborigami/screenshot/url("https://example.com")
}
```

The `screenshot` functions accept an optional second `options` parameter in which you can specify:

- `deviceScaleFactor`: the device scale factor: 1 (the default) for a classic 96 DPI display. Set this to 2 for HiDPI/Retina displays; this will double both the height and width of the resulting screenshot.
- `format`: if the `type` is `"pdf"`, this specifies the page size of the output; see below.
- `height`: the height of the viewport in pixels.
- `resources`: the `html` function accepts an additional, optional `resources` option; see below.
- `type`: the format of the resulting image: "png" (the default), "jpeg", "webp", or "pdf".
- `width`: the width of the viewport in pixels.

The valid values for the `format` page size option are:

- "A0"
- "A1"
- "A2"
- "A3"
- "A4"
- "A5"
- "A6"
- "Ledger"
- "Legal"
- "Letter"
- "Tabloid"

## Providing resources

When using the `html` function, you can provide optional `resources`: a [map-based tree](https://weborigami.org/async-tree/mapbasedtree) of resources that should be used for local paths.

If you have the following site:

```
// site.ori
{
  index.html: `
    <link rel="stylesheeet" href="styles.css">
    <p>This text should be read.
  `

  styles.css: `body { color: red; }`
}
```

Then you can create a screenshot of `index.html` that uses the local stylesheet with:

```
package:@weborigami/screenshot/html(site.ori/index.html, { resources: site.ori })
```
