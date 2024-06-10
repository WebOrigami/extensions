This package provides functions for treating a [Dropbox](https://www.dropbox.com) folder as an [async tree](https://weborigami.org/async-tree/interface).

## Obtaining Dropbox credentials

This extension requires an API key from Google. Like most cloud platforms, gaining programmatic access is ridiculously complicated and requires you to navigate a little maze of twisting passages, all different.

As of June 2024, the process to obtain a key is roughly:

1. Open https://www.dropbox.com/developers.
2. Click "Create apps".
3. Fill out the fields to create a new app. As of June 2024, there is only one API choice; "Scoped access". For "type of access you need", select "Full dropbox". Give your app a name. Then click "Create app".
4. Dropbox will show the settings page for your new app. Click the Permissions tab.
5. Check the boxes for `files.metadata.read` and `files.content.read`, then click Submit to save your changes.
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
