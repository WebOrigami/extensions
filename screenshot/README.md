This extension is a screenshot function that accepts an HTML page and returns a PNG image of the rendered page.

The extension uses [Puppeteer](https://pptr.dev/), a headless Chrome browser, to render HTML. The Puppeteer package is wonderful but quite heavy in size (~100MB).

# Usage

Install this package in your project:

```console
$ npm install --save @weborigami/screenshot
```

You can then convert HTML pages to PNG screenshots in a .ori file:

```
{
  index.html = "Hello, world."
  index.png = package:@weborigami/screenshot(index.html)
}
```

The `screenshot` function accepts an optional second `options` parameter in which you can specify:

- `deviceScaleFactor`: the device scale factor: 1 (the default) for a classic 96 DPI display. Set this to 2 for HiDPI/Retina displays; this will double both the height and width of the resulting screenshot.
- `height`: the height of the viewport in pixels.
- `width`: the width of the viewport in pixels.

in which you can specify a `height` and/or `width` in pixels. This determines the viewport size that will be used to render the page.
