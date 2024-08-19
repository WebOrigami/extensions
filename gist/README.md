This [Origami](https://weborigami.org) extension returns an async tree for a [GitHub gist](https://docs.github.com/en/get-started/writing-on-github/editing-and-sharing-content-with-gists/creating-gists#about-gists).

To use this, you will need to first obtain a GitHub [fine-grained personal access token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens#creating-a-fine-grained-personal-access-token).

1. Follow those instructions to obtain a token, which will be a sequence of letters and numbers. Copy the token.
1. Paste the token into a new local file called, e.g., `githubToken`.
1. It's important to _not_ check that file into source control. Create a `.gitignore` file and add the file's name to it.

## Usage

1. Use npm to install the main `@weborigami/origami` package and this `@weborigami/gist` extension.
1. Obtain a GitHub token (above).
1. Identify the ID at the end of the GitHub gist you want to read. Example: for the gist at
   https://gist.github.com/JanMiksovsky/2d6e386378732c01110e2c61c3dadb76, then ID is `2d6e386378732c01110e2c61c3dadb76`.

You can then use the [Origami CLI](https://weborigami.org/cli) to display all the files in the gist:

```console
$ ori package:@weborigami/gist(githubToken)/2d6e386378732c01110e2c61c3dadb76
README.md: This is the Read Me file.
data.json: |-
  {
    "message": "Hello, world!"
  }
```

Or traverse a specific file and value in the gist:

```console
$ ori "src/gist.js(githubToken)/2d6e386378732c01110e2c61c3dadb76/data.json/message"
Hello, world!
```
