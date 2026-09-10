This package provides functions for treating a [Google Drive](https://www.google.com/drive/) folder as an [asynchronous map-based tree](https://weborigami.org/async-tree/interface). You can represent your Dropbox folder as a [network host connection](https://weborigami.org/cli/network.html) so that you can read and write files directly to it.

## Install the extension

In the command line, install the extension in your project with:

```console
$ npm install @weborigami/gdrive
```

## Obtaining Google API credentials

This extension requires an API key from Google. Like most cloud platforms, gaining programmatic access is ridiculously complicated and requires you to navigate a little maze of twisty passages.

As of March 2024, the process to obtain a key is roughly:

1. Open https://console.cloud.google.com.
1. Select "Create Project" and fill out the details.
1. From the side nav bar select "APIs & Services", then "API Library".
1. Select "Google Drive API".
1. Click "Enable".
1. Click "Create Credentials". If asked what type, select "Service account".
1. When asked "What data will you be accessing?", select "Application data".
1. When asked to name the service account, enter anything that reflects the project you're creating.
1. For "Role", select "Editor".
1. Click "Done" to finish creating a service account.
1. The new service account will have an email address. You'll need that later to give access to the account.
1. If you want to work with data in Google Sheets, you'll need to enable that API as well. From the side nav bar, select "APIs & Services", then "API Library". Search for "Google Sheets API", click that, then click "Enable".
1. If you want to work with data in Google Docs, do the same with the Google Docs API.
1. Select the service account you just created.
1. Click "Keys", then "Add Key", then "Create new key".
1. Indicate that you want a JSON key, then "Create".
1. This will download a .json file to your computer; move that file into your project and rename it `creds.json`.
1. It's important to _not_ check this file into source control. E.g., add that to `.gitignore`.

## Share a folder in Google Drive

Once you've created the `creds.json` file, you will need to share a Google Drive folder with the "service account" you created.

1. Pick a folder in Google Drive and "Share" it. Either a) share it so that anyone with the link can view it, or b) add the service account's email address (mentioned above) to the list of users that can access the folder. If you want to be able to write files to the folder, give the service account write access.
1. Identify the ID of that folder. When you open the folder in the browser, the URL will look like `https://drive.google.com/drive/u/0/folders/<folderId>`, where the `<folderId>` is a string of letters and numbers.

## Create a file to represent the network host connection

Create a file called `gdrive.ori` that will represent your authenticated access to that folder. Inside the file, paste this line and insert your folder ID:

```
package:@weborigami/gdrive(creds.json)/<folderId goes here>
```

## Test your connection

After creating a file like `gdrive.ori` to represent your Google Drive folder, you can test it by using [`Tree.keys`](https://weborigami.org/builtins/tree/keys.html) to list out the top level files and subfolders:

```console
$ ori keys gdrive.ori
assets/
posts/
feed.json
index.html
README.md
```

Once you've tested that your connection works, you can read and write files; see [using the network connection](/cli/network.html#using-the-network-connection-in-origami-commands).
