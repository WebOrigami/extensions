This is a tree driver for the [Instagram Basic Display API](https://developers.facebook.com/docs/instagram-basic-display-api).

## Authentication

Authentication with the Instagram API is even more tiresome than with most services.

See Instagram's [Getting Started](https://developers.facebook.com/docs/instagram-basic-display-api/getting-started) page for an overview and a walkthrough of creating an application and obtaining an Instagram "short-lived access token". Then follow the steps to get a [long-lived access token](https://developers.facebook.com/docs/instagram-basic-display-api/guides/long-lived-access-tokens).

At the end of that process, you should have an access token (a string of letters and numbers) that you can save in a file.

Bear in mind that (as of August 2024) even a "long-lived" Instagram token will only be good for 60 days.

## Usage

1. Use npm to install the main `@weborigami/origami` package and this `@weborigami/instagram` extension.
1. Obtain an access token (above).
1. Save the access token in a file called `token`.
1. Add the name of that `token` file to `.gitignore` so that your token will _not_ be stored in source control.

With that, you can then use the [Origami CLI](https://weborigami.org/cli) to display a list of your top-level Instagram albums, images, and videos:

```console
$ ori "@keys package:@weborigami/instagram(token)"
```

Each top-level file or folder will have a name with the item's date and time.

You can copy a top-level image (or video) locally:

```console
$ ori "package:@weborigami/instagram(token)/<imageName>" > fileName.jpg
```

You can ask `ori` to display a list of the images in an album with a given name:

```console
$ ori "@keys package:@weborigami/instagram(token)/<albumName>"
```

You can copy an album locally with:

```console
$ ori "@copy package:@weborigami/instagram(token)/<albumName>, @files/album"
```

This will create a folder called `album` containing copies of all the images and videos in the indicated album.

You can archive your whole Instagram profile to a folder called `archive` with:

```console
$ ori "@copy package:@weborigami/instagram(token), @files/archive"
```
