This [Origami](https://weborigami) package provides functions for extracting [Exif](https://en.wikipedia.org/wiki/Exif) metadata from image files.

# Usage in Origami

Install this package in your [Origami](https://weborigami.org) project:

```console
$ npm install --save @weborigami/exif
```

You can then use this to extract Exif data from an image file:

```console
$ ori "package:@weborigami/exif(image1.jpg)/tags/ImageDescription"
This is a sample caption in an image file
```
