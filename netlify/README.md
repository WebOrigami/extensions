This package provides a function that will upload anything (an Origami site, static files, files defined in a data object, etc.) directly to [Netlify](https://netlify.com). You can represent your Netlify account as a [network host connection](https://weborigami.org/cli/network.html) so that you can read and write files directly to it.

This can be faster and significantly less hassle than trying to link a Netlify project to a GitHub repository and get your project to build on one of Netlify's server. You can test your project on your local machine and, once you've got it the way you want, directly update your site on Netlify where it will be available a few seconds later.

This is like the [Manual Deploy](https://docs.netlify.com/api-and-cli-guides/cli-guides/get-started-with-cli/#manual-deploys) feature of the Netlify CLI, which allows you to upload local files (a `build` folder, for example) directly to Netlify. The primary difference here is that this package can upload virtual files defined in an Origami `.ori` file or by other means without requiring a separate build step (although you could also have a build step).

## Install the extension

In the command line, install the extension in your project with:

```console
$ npm install @weborigami/netlify
```

## Netlify setup

You will need a few things:

- A Netlify account. They offer a good free tier which is usually fine for personal projects.
- A Netlify project to deploy to. The project will have a project name and a project ID (also called a site ID).
- A Netlify personal access token (see below)

The following instructions guide you through all three of these steps. (The instructions were last updated in February 2026. Netlify's documentation and user interface may have changed since then.)

### Create a Netlify project

The easiest way to create a new Netlify project is to upload an initial set of files to the [Netlify Drop](https://app.netlify.com/drop) page.

1. If your Origami site is defined in `src/site.ori`, then you could build the site to create an output folder (e.g., `build`). Alternatively, create an empty folder with any test file in it; anything should do.
1. Drag that folder onto the Netlify Drop page. Netlify will create and deploy a new project for you with a generated name like `fanciful-sprocket-749123`.
1. In the Netlify Projects area, open your new project.
1. On the **Project configuration** tab, give your project a meaningful name. For this example, we'll use `alice-andrews-blog`.
1. On the same tab, you'll also see a Netlify project ID, a string of characters that looks like `69cd69f789-a780-b327-89cb078afe8b`.

The rest of this process arranges things so that you can deploy further updates to your site.

### Get a Netlify personal access token

From Netlify you will need to obtain a “personal access token”: a little string of text that the `netlify` package will use to prove to Netlify that you’ve given it permission to update your site.

1. If you use git, create a file (or open the existing file) called `.gitignore`, then add `token.txt` on a line by itself and save this file. **This step is important** so that you don’t accidentally add this personal access token to source control where others might see it.
1. In the Netlify site, select your account (your avatar), then **User Settings**.
1. Select **Applications**.
1. Under “Personal access tokens”, click **New access token**.
1. Enter any text to describe your token (“Token for deploying blog”, say). Set the expiration date for some length of time, e.g., a year, after which you will need to update the token.
1. Click **Generate token**.
1. Netlify will display the token, which will look something like `ajnDlk6sdHIEUYfgiaklaj3n32dsilwn_lfdsijn`.
1. Copy the token to the clipboard now. For security reasons, after you close this page, Netlify won’t display this token again.
1. Create a file called `token.txt`.
1. Inside the `token.txt` file, paste in your token so that it looks like

```
ajnDlk6sdHIEUYfgiaklaj3n32dsilwn_lfdsijn
```

This arrangement gives you a local copy of this token and makes that token available to the deployment step, but prevents the token from being checked into source control.

If you have more than one Netlify project, you can reuse your personal access token across multiple projects.

### Create a file to represent your network host

To publish your site with Origami’s `netlify` extension, you will need to pass it some configuration options. A convenient way to do that is to put those options in a file.

1. Create a file called, for example, `netlify.ori`.

## Create a network connection file

Once you have a Netlify token saved in `token.txt`, create a file called `netlify.ori` with the following:

```
package:@weborigami/netlify({
  projectId: "<your project ID here>"
  projectName: "<your project name here>"
  token: token.txt
})
```

Update these with your project's Netlify ID (e.g., `69cd69f789-a780-b327-89cb078afe8b`) and project name (e.g., `alice-andrews-blog`). The `netlify.ori` file will end up looking like this _example_:

```
package:@weborigami/netlify({
  projectId: "69cd69f789-a780-b327-89cb078afe8b"
  projectName: "alice-andrews-blog"
  token: token.txt
})
```

## Test your connection

After creating the `netlify.ori` file to represent your Netlify project, you can test it by using [`Tree.keys`](https://weborigami.org/builtins/tree/keys.html) to list out the top level files and subfolders:

```console
$ ori keys netlify.ori
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
    "publish": "ori publish src/site.ori, netlify.ori"
  }
```

This example `publish` command assumes your site is defined in `src/site.ori`; update that with the path of the top-level Origami file that defines your site.

With that, if you run:

```console
$ npm run publish
```

the `publish` process will:

1. Compare your local site resources with the resources currently on Netlify.
1. Upload any files that have changed.
