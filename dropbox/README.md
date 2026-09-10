This package provides functions for treating a [Dropbox](https://www.dropbox.com) folder as an [asynchronous map-based tree](https://weborigami.org/async-tree/interface). You can represent your Dropbox folder as a [network host connection](https://weborigami.org/cli/network.html) so that you can read and write files directly to it.

## Install the extension

In the command line, install the extension in your project with:

```console
$ npm install @weborigami/dropbox
```

## Obtaining Dropbox credentials

This extension requires an API key from Dropbox. Like most cloud platforms, gaining programmatic access is ridiculously complicated and requires you to navigate a little maze of twisting passages.

As of June 2024, the process to obtain a key is roughly:

1. Open https://www.dropbox.com/developers.
2. Click "Create apps".
3. Fill out the fields to create a new app. As of June 2024, there is only one API choice; "Scoped access". For "type of access you need", select "Full dropbox". Give your app a name. Then click "Create app".
4. Dropbox will show the settings page for your new app. Click the Permissions tab.
5. Check the boxes for `files.metadata.read` and `files.content.read`. If you want to be able to write files to Dropbox, also check `files.content.write`. Then click Submit to save your changes.
6. Return to the Settings tab.
7. In your code editor, create a new file called `creds.json`, which will store the information you need to connect to Dropbox. In the file, paste:

```json
{
  "app_key": "",
  "app_secret": "",
  "refresh_token": ""
}
```

8. Copy the "App key" and "App secret" values from the Dropbox settings page into the corresponding fields in `creds.json`.
9. You will now need to jump through several hoops to get a `refresh_token`. The first step is obtain an "Access Code". Navigate to the following URL, substituting your "App key" from the Dropbox settings page:

```
https://www.dropbox.com/oauth2/authorize?client_id=<App key>&response_type=code&token_access_type=offline
```

10. Dropbox will ask you if you want to grant access to the application; agree to that.
11. Dropbox should display an Access Code. Copy that value.
12. You now need to convert that Access Code into a refresh token. In a command window, enter the following command, substituting the "App key", "App secret", and your new "Access code":

```curl
curl https://api.dropbox.com/oauth2/token \
    -d code=<Access code> \
    -d grant_type=authorization_code \
    -u <App key>:<App secret>
```

13. You should get back a JSON result that contains a `refresh_token` value like this:

```
{
  "access_token": "...",
  "token_type": "bearer",
  "expires_in": 14400,
  "refresh_token": "<some string of letters and numbers>",
  ...
}
```

14. Copy the `refresh_token` value from that result and paste it into `refresh_token` field in the `creds.json` file.
15. Add the `creds.json` file to `.gitignore`. _Don't check credential files into source control!_

## Create a file to represent the network host connection

Create a file called `dropbox.ori` that will represent your authenticated access to Dropbox. Paste in the following:

```
package:@weborigami/dropbox(creds.json)
```

By default this will represent your _entire_ Dropbox account. If you only want to point to a specific folder, add a `path` option to `creds.json`.

```json
{
  "app_key": "<app key goes here>",
  "app_secret": "<app secret goes here>",
  "path": "<path goes here>",
  "refresh_token": "<refresh token goes here>"
}
```

The path should be a string indicating a Dropbox folder, e.g., `path/to/folder`.

## Test your connection

After creating a file like `dropbox.ori` to represent your Dropbox account, you can test it by using [`Tree.keys`](https://weborigami.org/builtins/tree/keys.html) to list out the top level files and subfolders:

```console
$ ori keys dropbox.ori
assets/
posts/
feed.json
index.html
README.md
```

Once you've tested that your connection works, you can read and write files; see [using the network connection](/cli/network.html#using-the-network-connection-in-origami-commands).
