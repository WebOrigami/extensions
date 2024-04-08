This [Origami](https://weborigami) package provides functions for packing any [treelike object](https://weborigami.org/async-tree/treelike) into a ZIP file, or unpacking a ZIP file in order to treat it as a tree.

## Usage

After installing via npm, in the root of your Origami project create a `config.ori` file:

```
{
  zip_handler = package:@weborigami/zip/zip_handler
}
```

This will instruct Origami to use the `.zip` extension handler in this package to process files that end with the `.zip` extension. (You can also use the related `.epub` extension handler.)

For example, you can use this to get a listing of the contents in the sample `test/fixtures/test.zip` file, extract a file, or copy all files out of the ZIP archive:

```console
$ ori @keys test.zip
- ReadMe.md
- sub
$ ori test.zip/ReadMe.md
This is a ReadMe file.
$ ori @copy test.zip, @mkdir/extracted
$ ls extracted
ReadMe.md sub
```
