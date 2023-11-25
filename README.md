# beatrun course server
Pretty advanced beatrun course server recreation.<br><br>

## How to use:
1. Hide **steamauth** and **data** from public. Don't let people access them and the files inside.
	- Remove `register.php` to disallow public registration using steam accounts, then add authkeys manually to *data/_keys.json*.
	- OR
	- Keep public registration and then do the following steps:
		1. Go to steamauth,
		2. Rename `steamconfig.php.example` to `steamconfig.php`,
		3. Configure it.<br>
2. Remove or keep `admin.php` to allow online administration. Be sure to put in SteamID64 id's into *data/_admins.json* beforehand.
3. Put in a proper webhook into `util.php` if you need discord logging. Otherwise just leave it as an empty string.<br>

_locked.json contains blocked identificators.<br>
_keys.json contains authkeys.<br>
_ratelimit.json is mostly internal, but it keeps track of ratelimiting... duh<br>
_record.json is internal too, keeps track of ips used to log into an account.<br>
_logs.log are obviously logs.

> [!NOTE]
> Original repo: https://github.com/relaxtakenotes/beatrun-courses-server
