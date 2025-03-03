This [Origami](https://weborigami.org) extension validates that the data for your site conforms to expectations expressed in [JSON Schema](https://json-schema.org) format.

This extension relies on the [AJV JSON schema validator](https://ajv.js.org) to interpret the JSON Schema and validate the data. Origami and this extension augment what is possible with validators like AJV so that you can:

- Validate any treelike structure, including folders in the the file system or cloud storage containers.
- Define your schema in other formats like YAML.
- Define your schema anywhere, not just the file system.
- Schemas can be dynamically generated.

## Installation

1. Add this `@weborigami/json-schema` extension to your Origami project's dependencies and `npm install`.

## Usage

You use this extension in two steps:

1. Call the `@weborigami/json-schema` extension to compile your JSON Schema definition into a validation function.
2. Now call that validation function, passing in the data you want to validate.

If the data passes the tests, the validation function returns the data as is. You can transform that result into, e.g., HTML, knowing that the data will have the required properties, the properties will be of the correct type, etc.

If the data does _not_ comply with the schema, the validation function displays an error message indicating the errors it found.

## Example

The [demo](./demo) folder uses this json-schema extension to define a tiny schema for a blog's `posts` folder that enforces the following fules:

1. Only files with `.md` extension are allowed in the `posts` folder.
2. Each markdown post must have a `title` property and a body.
3. The title and body must be non-empty strings.

Rule #1 is implemented in [folderSchema.yaml](./demo/folderSchema.yaml). This uses a JSON Schema `$ref` reference to load a separate schema in [postSchema.yaml](./demo/postSchema.yaml) for the individual post files. That post schema implements rules #2 and #3.

Note that, because Origami treats all treelike structures equally, you can write JSON Schema in YAML or other formats for readability.

To apply the folder schema to the `posts` folder, you can write an Origami expression that proceeds in the two steps outlined above: it turns the schema into a function, then applies that function to the data (here, a folder).

```
package:@weborigami/json-schema(folderSchema.yaml)(posts)
```

This expression can be saved in an Origami file `posts.ori`. (Because the demo folder is inside the extension project itself, the demo's [posts.ori](./demo/posts.ori) file must use of a JavaScript helper function.)

Evaluating `posts.ori` runs the validator:

```console
$ cd demo
$ ori posts.ori/
… contents of all posts …
```

You can edit the posts to introduce an error. For example, if you create a file in `posts` with the name `foo.txt`, evaluating `posts.ori` will display an error:

```console
$ ori posts.ori/
Error:
must NOT have additional properties (foo.txt)
    at OrigamiFiles.<anonymous>…
```

This indicates that the `posts` folder has an additional "property" (a file) whose name `foo.txt` doesn't comply with the expected `.md` file name format.

The validated `posts.ori` data can then be transformed via other Origami expressions into HTML, feeds, etc.

## Options

The `json-schema` extension takes an optional second `options` argument that will be passed to the underlying AJV library. See [AJV options](https://ajv.js.org/options.html) for details. By default, this extension sets the `allErrors` option to `true` and sets the `loadSchema` option to load schemas referenced via `$ref` using Origami scope.
