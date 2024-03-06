This package provides functions for treating a [Google Drive](https://www.google.com/drive/) folder as an [async tree](https://weborigami.org/async-tree/interface).

It also allows you to read a [Google Sheets](https://www.google.com/sheets/about/) spreadsheet as a plain JavaScript object.

## Obtaining Google API credentials

This extension requires an API key from Google. Like most cloud platforms, gaining programmatic access is ridiculously complicated and requires you to navigate a maze of twisty little passages, all alike.

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
1. If you want to work with data in Google Sheets, you'll need to enable that API as well. From the side nav bar, select "APIs & Services", then "API Library". Search for "Google Sheets API", click that, then click "Enable".
1. If you want to work with data in Google Docs, do the same with the Google Docs API.
1. Select the service account you just created.
1. Click "Keys", then "Add Key", then "Create new key".
1. Indicate that you want a JSON key, then "Create".
1. This will download a .json file to your computer; move that file into your project and rename it `creds.json`.
1. It's important to _not_ check this file into source control. E.g., add that to `.gitignore`.