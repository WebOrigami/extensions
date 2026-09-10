This [Web Origami](https://weborigami.org) extension gives you a way to read and write files hosted on [Neocities](https://neocities.org), a popular free site hosting service. You can represent your Neocities account as a [network host connection](https://weborigami.org/cli/network.html) so that you can read and write files directly to it.

## Install the extension

In the command line, install the extension in your project with:

```console
$ npm install @weborigami/neocities
```

## Obtaining a Neocities token

Writing or reading files via this extension requires first obtaining a Neocities _token_ using a command line.

In a terminal window, enter the following command

```console
$ curl -u "USER:PASSWORD" "https://neocities.org/api/key"
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

## Create a network connection file

Once you have a Neocities token saved in `token.txt`, create a file called `neocities.ori` with the following:

```
package:@weborigami/neocities({
  token: token.txt
  url: "<your Neocities user name>.neocities.org"
})
```

Update the `url` to be your Neocities URL, e.g., `aliceandrews.neocities.org`.

## Test your connection

After creating the `neocities.ori` file to represent your Neocities site, you can test it by using [`Tree.keys`](https://weborigami.org/builtins/tree/keys.html) to list out the top level files and subfolders:

```console
$ ori keys host.ori
assets/
posts/
feed.json
index.html
README.md
```

Once you've tested that your connection works, you can read and write files; see [using the network connection](/cli/network.html#using-the-network-connection-in-origami-commands).

## Create an npm command to publish your site

The final step is to add a `publish` command to the `scripts` portion of your `package.json`:

```json
  "scripts": {
    "publish": "ori publish src/site.ori, neocities.ori"
  }
```

This example `publish` command assumes your site is defined in `src/site.ori`; update that with the path of the top-level Origami file that defines your site.

With that, if you run:

```console
$ npm run publish
```

the `publish` process will:

1. Compare your local site resources with the resources currently on Neocities.
1. Upload any files that have changed.
