# Beatrun Custom Course Server

Pretty advanced beatrun course server recreation with main page, course rating, registration and admin pages.\
Jonny_Bro Edition

## How to use

> [!NOTE]
> There are .htaccess files ready for your Apache2 server!

1. *steamauth* and *data* folders should be hidden, make sure your Apache server is configured to use .htaccess files
2. Make a desicion on what you want to do:
   - Remove or rename `register.php` to disable public registration using a Steam account.
   - **OR**
   - Keep `register.php` file and do the following:
     1. Go to *steamauth* folder;
     2. Rename `SteamConfig.example.php` to `SteamConfig.php`;
     3. Open it and configure.
3. Keep or remove `admin.php`, this page is used to do administration. Be sure to put admin's SteamIDs in `data/_admins.json` beforehand.
4. Configure those variables in `util.php`:
   - webhook_url - Your Discord webhook for logging. Can be empty;
   - ratelimit_period - How fast can someone make a request to the database;
   - ip_list_refresh - How fast can someone change their IP on their account. Default is 3 hours;

## Contains of *data* folder

- _locked.json contains blocked identificators.\
- _keys.json contains API Keys.\
- _ratelimit.json is mostly internal, but it keeps track of ratelimiting... duh\
- _record.json is internal too, keeps track of ips used to log into an account.\
- _logs.log are obviously logs.

### Forked from [this](https://github.com/relaxtakenotes/beatrun-courses-server) repo
