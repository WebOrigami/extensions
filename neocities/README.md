This [Web Origami](https://weborigami.org) extension gives you a way to publish local files to [Neocities](https://neocities.org), a popular free site hosting service. The package also offers a way to directly read the contents of your Neocities project.

## Obtaining a Neocities token

Writing or reading files via this extension requires first obtaining a Neocities _token_ using a command line.

In a terminal window, enter the following command

```console
curl -u "USER:PASSWORD" "https://neocities.org/api/key"
```

Replace `USER` and `PASSWORD` with your own Neocities user name and password. This should display a result like:

```json
{
  "result": "success",
  "api_key": "da77c3530c30593663bf7b797323e48c"
}
```

The value of the `api_key` field (in this example, `da77c3530c30593663bf7b797323e48c`) is your Neocities token.

For security reasons, Neocities won’t display this token again, so you'll want to save it in a file. Copy and paste that string of letters and numbers — without the surrounding quotes — and save that in a new text file called `token.txt`. The file will look like:

```
da77c3530c30593663bf7b797323e48c
```

Because this token gives anyone programmatic access to your Neocities project, **do not store this file in a source control system**. If you use git for source control, create a file (or open the file) called `.gitignore`, then add `token.txt` on a line by itself and save this file. This step is critical so that you don’t accidentally add this token to source control where others might see it.

## Publishing your site to Neocities

Once you have a Neocities token saved in `token.txt`, create a file called `publish.ori` with the following:

```
() => package:@weborigami/neocities/publish(src/site.ori, { token: token.txt })
```

If your site is an Origami project and you define your site in a file other than `src/site.ori`, update that path to point to your site definition file. If you create your HTML and other resources by hand, update that path to point to the folder that contains those resources.

## Create an npm command to publish your site

The final step is to add a `publish` script to your `package.json` that calls `publish.ori`.

Your package.json will look something like:

```json
{
  "name": "alice-andrews-blog",
  "version": "0.0.1",
  "type": "module",
  "dependencies": {
    "@weborigami/origami": "0.7.1",
    "@weborigami/neocities": "0.0.19"
  },
  "scripts": {
    "publish": "ori publish.ori"
  }
}
```

For the `@weborigami/origami` and `@weborigami/neocities` version numbers, use the latest versions of those projects.

With that, if you run

```console
$ npm run publish
```

the publish process will:

1. Compare your local site resources with the resources currently on Neocities.
1. Upload any files that have changed.

## Reading files

You can also use this extension to read your site files on Neocities.

Follow the instructions above to obtain a Neocities access token and save it in `token.txt`. Also update your `package.json` to include `@weborigami/origami` and `@weborigami/neocities` as `dependencies` (see the previous section for an example).

Then create an Origami file called `neocities.ori`:

```
package:@weborigami/neocities/auth(token.txt)
```

With that, you can then use the [`ori`](https://weborigami.org/cli) command line interface to read the contents of your site on the Neocities server. For example, to get a list of the files at the top level:

```console
ori keys neocities.ori
```
