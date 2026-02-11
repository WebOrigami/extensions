This package provides a function that will upload anything (an Origami site, static files, files defined in a data object, etc.) directly to [Netlify](https://netlify.com).

This can be faster and significantly less hassle than trying to link a Netlify project to a GitHub repository and get your project to build on one of Netlify's server. You can test your project on your local machine and, once you've got it the way you want, directly update your site on Netlify where it will be available a few seconds later.

This is like the [Manual Deploy](https://docs.netlify.com/api-and-cli-guides/cli-guides/get-started-with-cli/#manual-deploys) feature of the Netlify CLI, which allows you to upload local files (a `build` folder, for example) directly to Netlify.

The primary difference here is that this package can upload virtual files defined in an Origami `.ori` file or by other means without requiring a separate build step (although you could also have a build step).

The instructions below assume you are uploading a site defined in `src/site.ori`.

## Installing

Add the `@weborigami/netlify-deploy` package as a dependency in your project's `package.json`, then

```console
$ npm install
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
1. On the same tab, you'll also see a Project ID, a string of characters that looks like `69cd69f789-a780-b327-89cb078afe8b`. You can use this ID later if you want to speed up deployments.

The rest of this process arranges things so that you can deploy further updates to your site.

### Create a file to hold deployment options

To deploy your site with Origami’s `netlify-deploy` package, you will need to pass it some configuration options. A convenient way to do that is to put those options in a file.

1. Create a file called, for example, `deploy.yaml`. (You could also use JSON or some other format that Origami understands.)
1. Paste in the following template text, substituting your project name (e.g., `alice-andrews-blog`):

```yaml
name: <your project name>
site: !ori src/site.ori
token: !ori token.json
```

The `!ori` lines will pull in content from the indicated files. If your site is defined in a file other than `src/site.ori`, update the `site` field to point to it. You’ll create `token.json` in the next step.

If you’d prefer, you can also add an `id` field with the Project ID (e.g., `69cd69f789-a780-b327-89cb078afe8b`). This makes deployments slightly faster as they will avoid having to look up your project by name. (If you define both `name` and `id`, only the `id` is used, but the name can still be useful to you as a meaningful identifier.)

### Get a Netlify personal access token

From Netlify you will need to obtain a “personal access token”: a little string of text that the `netlify-deploy` package will use to prove to Netlify that you’ve given it permission to update your site.

1. If you use git, create a file (or open the existing file) called `.gitignore`, then add `token.json` on a line by itself and save this file. **This step is important** so that you don’t accidentally add this personal access token to source control where others might see it.
1. In the Netlify site, select your account (your avatar), then **User Settings**.
1. Select **Applications**.
1. Under “Personal access tokens”, click **New access token**.
1. Enter any text to describe your token (“Token for deploying blog”, say). Set the expiration date for some length of time, e.g., a year, after which you will need to update the token.
1. Click **Generate token**.
1. Netlify will display the token, which will look something like `ajnDlk6sdHIEUYfgiaklaj3n32dsilwn_lfdsijn `.
1. Copy the token to the clipboard now. For security reasons, after you close this page, Netlify won’t display this token again.
1. Create a file called `token.json`.
1. Inside the `token.json` file, paste in your token and surround it with quotes so that it looks like

```json
"ajnDlk6sdHIEUYfgiaklaj3n32dsilwn_lfdsijn"
```

This arrangement gives you a local copy of this token, makes that token available to the deployment step, but prevents the token from being checked into source control.

If you have more than one Netlify project, you can reuse your personal access token across multiple projects.

## Create a deployment script

The final step is to add a `deploy` script to your `package.json` that calls the `netlify-deploy` extension, passing in the configuration options in `deploy.yaml`.

Your package.json will look something like:

```json
{
  "name": "alice-andrews-blog",
  "version": "0.0.1",
  "type": "module",
  "dependencies": {
    "@weborigami/origami": "0.6.9",
    "@weborigami/netlify-deploy": "0.6.9"
  },
  "scripts": {
    "deploy": "ori package:@weborigami/netlify-deploy deploy.yaml",
  }
}
```

(Instead of `0.6.9`, use the latest version numbers of `origami` and `netlify-project` packages.)

With that, if you run

```console
$ npm run deploy
```

The deployment process will run. It will

1. Read the configuration options from `deploy.yaml`.
1. Compare the site resources defined in `site.ori` with the resources currently on Netlify
1. Upload any files that have changed.

If the process completes successfully, you’ll see one of two things:

* A count of how many files were uploaded.
* Or a statement that the site is up to date. This message is intentionally ambiguous: it means that either nothing changed in the site, or that your `site.ori` was the same as an earlier state. In the latter case, Netlify will revert your site to that earlier state without the need for any uploads.
