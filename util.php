<?php

$log_dir = "data/_logs.log";
$authkeys_dir = "data/_keys.json";
$ratelimit_dir = "data/_ratelimit.json";
$account_record_dir = "data/_record.json";
$lock_dir = "data/_locked.json";
$admins_dir = "data/_admins.json";
$rating_dir = "data/_rating.json";
$courses_data_dir = "data/_courses.json";
$usernames_dir = "data/_usernames.json";
$webhook_url = "https://discord.com/api/webhooks/1112687906616774676/IZAwl9kDwKaxyLza4qARNFckJd6KFBuUqTdxaTJViiBGPw3nOgPfGav4y6okd9Nkw1iG"; // discord webhook logging url

if (!is_dir("courses/")) { mkdir("courses/"); }
if (!is_dir("data/")) { mkdir("data/"); }

$ratelimit_period = 5;
$ip_list_refresh = 10800; // how fast can a person change their ip on their account. this is 3 hours

$authkey = "";
$map = "";
$code = "";
$mapid = "";
$ip = $_SERVER["HTTP_CF_CONNECTING_IP"] ?? $_SERVER["REMOTE_ADDR"];
$headers = getallheaders();

function sanitize($string, $force_lowercase = true, $anal = false) {
	$strip = array("~", "`", "!", "@", "#", "$", "%", "^", "&", "*", "(", ")", "=", "+", "[", "{", "]",
					"}", "\\", "|", ";", ":", "\"", "'", "&#8216;", "&#8217;", "&#8220;", "&#8221;", "&#8211;", "&#8212;",
					"â€”", "â€“", ",", "<", ".", ">", "/", "?");

	$clean = trim(str_replace($strip, "", strip_tags($string)));
	$clean = preg_replace('/\s+/', "-", $clean);
	$clean = ($anal) ? preg_replace("/[^a-zA-Z0-9_\-]/", "", $clean) : $clean ;

	return ($force_lowercase) ?
		(function_exists('mb_strtolower')) ?
			mb_strtolower($clean, 'UTF-8') :
			strtolower($clean) :
		$clean;
}

function getcourse_set_params() {
	global $authkey, $map, $code;

	$authkey = sanitize($_GET["key"], false, true);
	$map = sanitize($_GET["map"], false, true);
	$code = sanitize($_GET["sharecode"], false, true);
}

function upload_set_params() {
	global $authkey, $map, $mapid;

	$authkey = sanitize($_POST["key"], false, true);
	$map = sanitize($_POST["map"], false, true);
	$mapid = preg_replace("/[^0-9]/", "", sanitize($_POST["mapid"], false, true));
}

function upload_headers_are_valid() {
	//global $headers;
	return $_SERVER['REQUEST_METHOD'] == "POST";
	//if () { return false; } else { return true; }
}

function getcourse_headers_are_valid() {
	//global $headers;
	return $_SERVER['REQUEST_METHOD'] == "GET";
	//if () { return false; } else { return true; }
}

// autism + sleep deprivation
function get_authkeys() {
	global $authkeys_dir;

	if (!is_file($authkeys_dir)) { return []; }

	return json_decode(file_get_contents($authkeys_dir), true);
}

function write_authkeys($data) {
	global $authkeys_dir;

	file_put_contents($authkeys_dir, json_encode($data, JSON_PRETTY_PRINT));
}

function get_ratelimits() {
	global $ratelimit_dir;

	if (!is_file($ratelimit_dir)) { return []; }

	return json_decode(file_get_contents($ratelimit_dir), true);
}

function write_ratelimits($data) {
	global $ratelimit_dir;

	file_put_contents($ratelimit_dir, json_encode($data, JSON_PRETTY_PRINT));
}

function get_account_records() {
	global $account_record_dir;

	if (!is_file($account_record_dir)) { return []; }

	return json_decode(file_get_contents($account_record_dir), true);
}

function write_account_records($data) {
	global $account_record_dir;

	file_put_contents($account_record_dir, json_encode($data, JSON_PRETTY_PRINT));
}

function get_locks() {
	global $lock_dir;

	if (!is_file($lock_dir)) { return []; }

	return json_decode(file_get_contents($lock_dir), true);
}

function write_locks($data) {
	global $lock_dir;

	file_put_contents($lock_dir, json_encode($data, JSON_PRETTY_PRINT));
}

function get_ratings() {
	global $rating_dir;

	if (!is_file($rating_dir)) { return []; }

	return json_decode(file_get_contents($rating_dir), true);
}

function write_ratings($data) {
	global $rating_dir;

	file_put_contents($rating_dir, json_encode($data, JSON_PRETTY_PRINT));
}

function get_courses_data() {
	global $courses_data_dir;

	if (!is_file($courses_data_dir)) { return []; }

	return json_decode(file_get_contents($courses_data_dir), true);
}

function write_courses_data($data) {
	global $courses_data_dir;

	file_put_contents($courses_data_dir, json_encode($data, JSON_PRETTY_PRINT));
}

function get_usernames() {
	global $usernames_dir;

	if (!is_file($usernames_dir)) { return []; }

	return json_decode(file_get_contents($usernames_dir), true);
}

function write_usernames($data) {
	global $usernames_dir;

	file_put_contents($usernames_dir, json_encode($data, JSON_PRETTY_PRINT));
}

function get_course_data($code) {
	$courses_data = get_courses_data();

	if (isset($courses_data[$code])) { return $courses_data[$code]; }

	return null;
}

function write_course_data($code, $data) {
	$courses_data = get_courses_data();

	$courses_data[$code] = $data;

	write_courses_data($courses_data);
}

function is_ratelimited() {
	global $ip, $ratelimit_period;

	$ratelimit_array = get_ratelimits();

	if (isset($ratelimit_array[$ip]) && time() - $ratelimit_array[$ip] <= $ratelimit_period) {
		return true;
	}

	foreach ($ratelimit_array as $uid => $time) {
		if (time() - $ratelimit_array[$uid] > $ratelimit_period) {
			unset($ratelimit_array[$uid]);
		}
	}

	$ratelimit_array[$ip] = time();

	write_ratelimits($ratelimit_array);

	return false;
}

function is_authkey_valid($key) {
	$key_array = get_authkeys();

	if (count($key_array) <= 0) { return true; }

	if (isset($key_array[$key])) { return true; }

	return false;
}

function body_is_valid($body) {
	if (count($body) != 6) { return false; }

	if (!is_array($body[0]) ||
		!is_array($body[1]) ||
		!is_string($body[2]) ||
		!is_float($body[3]) ||
		!is_string($body[4]) ||
		!is_array($body[5])) { return false; }

	return true;
}

function generate_code() {
	$code = "";

	for ($i = 0; $i < 3; $i++) {
		$code .= substr(str_shuffle(str_repeat('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', mt_rand(1,10))), 1, 4);

		if ($i == 0 || $i == 1) { $code .= "-"; }
	}

	return strtoupper($code);
}

function generateRandomString($length = 32) {
	return substr(str_shuffle(str_repeat($x='0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', ceil($length/strlen($x)) )),1,$length);
}

function debug_to_console($data) {
	$output = $data;

	if (is_array($output)) $output = implode(',', $output);

	echo "<script>console.log('Debug Objects: " . $output . "' );</script>";
}

function account_owns_gmod($userid) {
	require('steamauth/SteamConfig.php'); // here cuz of scope bullshit

	$url = file_get_contents("http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=" . $steamauth['apikey'] . "&steamid=" . $userid . "&format=json");
	$content = json_decode($url, true);

	if (!$content["response"]) { return false; }
	if (!$content["response"]["games"]) { return false; }

	foreach ($content["response"]["games"] as $game) {
		if ($game["appid"] == 4000) {
			return true;
		}
	}

	return false;
}

function get_userid_from_authkey($authkey) {
	$key_array = get_authkeys();

	if (count($key_array) <= 0) { return ""; }

	if (!isset($key_array[$authkey])) { return ""; }

	return $key_array[$authkey];
}

function get_authkey_from_userid($userid) {
	$key_array = get_authkeys();

	foreach ($key_array as $authkey => $authsteamid) {
		if ($authsteamid === $userid) {
			return $authkey;
		}
	}

	return "";
}

function get_relevant_info($id) {
	$_steamid = "";
	$_authkey = "";
	$type = "";

	if (preg_match('/[^\/][0-9]{8,}/', $id)) {
		$type = "steamid";
	} else {
		$type = "authkey";
	}

	if ($type == "steamid") {
		$_steamid = $id;
		$_authkey = get_authkey_from_userid($_steamid);
	}

	if ($type == "authkey") {
		$_steamid = get_userid_from_authkey($id);
		$_authkey = $id;
	}

	return [$_steamid, $_authkey];
}

function _lock_account($id) {
	$locks = get_locks();
	$locks[$id] = true;

	write_locks($locks);
}

function lock_account($id) {
	[$_steamid, $_authkey] = get_relevant_info($id);

	_lock_account($_steamid);
	_lock_account($_authkey);

	return "Locked: $_steamid, $_authkey";
}

function _unlock_account($id) {
	$locks = get_locks();
	unset($locks[$id]);
	write_locks($locks);
}

function unlock_account($id) {
	[$_steamid, $_authkey] = get_relevant_info($id);

	_unlock_account($_steamid);
	_unlock_account($_authkey);

	// get rid of the ip's if we were locked automatically
	$records = get_account_records();
	if (!isset($records[$_steamid])) { $records[$_steamid] = []; }

	$records[$_steamid]["ips"] = [];
	$records[$_steamid]["lastchanged"] = time();

	write_account_records($records);

	return "Unlocked. $_steamid, $_authkey";
}

function is_locked($id) {
	[$_steamid, $_authkey] = get_relevant_info($id);

	$locks = get_locks();

	if (isset($locks[$_authkey]) || isset($locks[$_steamid])) { return true; }

	return false;
}

function gen_key($userid) {
	$keys = get_authkeys();

	foreach ($keys as $authkey => $authsteamid) {
		if ($authsteamid === $userid) {
			return $authkey;
		}
	}

	$key = generateRandomString(32);
	while (isset($keys[$key])) {
		$key = generateRandomString(32);
	}
	$keys[$key] = $userid;

	write_authkeys($keys);

	return $key;
}

function rm_key($userid) {
	$key_array = get_authkeys();

	foreach ($key_array as $authkey => $authsteamid) {
		if ($authsteamid === $userid) {
			unset($key_array[$authkey]);
		}
	}

	write_authkeys($key_array);

	return "Removed.";
}

function rm_course($code) {
	$courses = get_courses_data();

	if (!isset($courses[$code])) { return "Not found!"; }

	$path = $courses[$code]["path"];
	$body = file_get_contents($path);
	$decoded_body = json_decode($body, true);

	if (!$decoded_body) { echo "Invalid course (not json)"; }
	if (!body_is_valid($decoded_body)) { echo "Invalid course (invalid signature)"; }

	unset($courses[$code]);
	write_courses_data($courses);

	if (!unlink($path)) {
		return "Failed to delete. Check validity of the input.";
	} else {
		return "Deleted.";
	}
}

function is_multiaccount($userid) {
	global $ip_list_refresh, $ip;

	if (is_locked($userid)) { return true; }

	$record = get_account_records();

	// sanity... that drains my sanity.
	if (!isset($record[$userid])) { $record[$userid] = []; }
	if (!isset($record[$userid]["ips"])) { $record[$userid]["ips"] = []; }
	if (!isset($record[$userid]["lastchanged"])) { $record[$userid]["lastchanged"] = 0; }

	if (time() - $record[$userid]["lastchanged"] > $ip_list_refresh) {
		$record[$userid]["ips"] = [];
		$record[$userid]["lastchanged"] = time();
	}

	if (!isset($record[$userid]["ips"][$ip])) {
		$record[$userid]["ips"][$ip] = true;
		$record[$userid]["lastchanged"] = time();
	}

	if (count($record[$userid]["ips"]) > 2) {
		lock_account($userid);
		return true;
	}

	write_account_records($record);

	return false;
}

function _log_webhook($text) {
	global $webhook_url;

	if (strlen($webhook_url) <= 0) { return; }

	$json_data = json_encode(["content" => $text], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE );
	$ch = curl_init($webhook_url);

	curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-type: application/json'));
	curl_setopt($ch, CURLOPT_POST, 1);
	curl_setopt($ch, CURLOPT_POSTFIELDS, $json_data);
	curl_setopt($ch, CURLOPT_FOLLOWLOCATION, 1);
	curl_setopt($ch, CURLOPT_HEADER, 0);
	curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
	print(curl_exec($ch));
	curl_close($ch);
}

function _log_browser($content) {
	global $log_dir, $ip;

	$date = date("D M j G:i:s T Y");
	$text = "$date - $content (IP: $ip)";

	_log_webhook($text);
	file_put_contents($log_dir, $text."\n", FILE_APPEND);
}

function _log($content) {
	global $log_dir, $authkey, $map, $ip;

	$date = date("D M j G:i:s T Y");
	$steamid = get_userid_from_authkey($authkey);
	$text = "$date - $content (Authkey: $authkey, Map: $map, IP: $ip, SteamID: $steamid)";

	_log_webhook($text);
	file_put_contents($log_dir, $text."\n", FILE_APPEND);
}

function _error($reason) {
	print($reason);
	http_response_code(400);
	_log($reason);

	exit;
}

function get_records() {
	$record = get_account_records();

	$output = "";

	foreach ($record as $steamid => $data) {
		$ips = [];
		foreach ($data["ips"] as $ip => $boolleaaann) { array_push($ips, $ip); }
		$s_ips = implode(', ', $ips);
		$lastchanged = $data["lastchanged"];
		$output .= "$steamid - IP's: $s_ips; LastChanged: $lastchanged\n";
	}

	return $output;
}

function register_steam_account($userid, $timecreated)
{
	$ragh = "(SteamID: $userid, TimeCreated: $timecreated)";

	$usernames = get_usernames();
	$usernames[$userid] = sanitize($_SESSION['steam_personaname'], false, true);
	write_usernames($usernames);

	if (is_multiaccount($userid)) { _log_browser("util.php - Account locked " . $ragh); return "Your account is locked. Contact site administration."; }

	$keys = get_authkeys();
	foreach ($keys as $akey => $value) {
		if ($value === $userid) {
			$ragh = "(";
			$ragh .= "UserID: " . $userid . ", ";
			$ragh .= "timecreated: " . $timecreated . ", ";
			$ragh .= "key: " . $akey . ")";
			_log_browser("util.php - Existing user logged back in " . $ragh);

			return $akey;
		}
	}

	if (time() - $timecreated < 7890000) { _log_browser("util.php - Too young of an account " . $ragh); return "Account too young. Needs to be at least 3 months old."; }
	if (!account_owns_gmod($userid)) { _log_browser("util.php - GMOD not found " . $ragh); return "Account doesn't have Garry's mod. Make sure your game details are public if you think this is wrong."; }

	$key = generateRandomString(32);
	while (isset($keys[$key])) {
		$key = generateRandomString(32);
	}
	$keys[$key] = $userid;

	write_authkeys($keys);

	_log_browser("util.php - New user: " . $userid . " " . $timecreated . " " . $key);

	return $key;
}

function get_course_rating($code, $raw = False) {
	$rating = get_ratings();

	if (!isset($rating[$code])) { return "unknown"; }

	$like_count = 0;
	$rate_count = count($rating[$code]);
	foreach ($rating[$code] as $key => $value) {
		if ($value) { $like_count += 1; }
	}

	if ($raw) {
		return [$like_count, $rate_count];
	}

	if ($rate_count <= 0) {
		return "unknown";
	}

	return strval(round(($like_count / $rate_count) * 100, 2)) . "% ($rate_count)";
}

function like_course($code) {
	$steamid = $_SESSION['steamid'];

	if (!$steamid) { return "not logged in"; }
	if (!get_authkey_from_userid($steamid)) { return "invalid account"; }

	$rating = get_ratings();

	if (!isset($rating[$code])) { $rating[$code] = []; }
	$rating[$code][$steamid] = true;

	write_ratings($rating);

	return "rated";
}

function dislike_course($code) {
	global $rating_dir;

	$steamid = $_SESSION['steamid'];

	if (!$steamid) { return "not logged in"; }
	if (!get_authkey_from_userid($steamid)) { return "invalid account"; }

	$rating = get_ratings();

	if (!isset($rating[$code])) { $rating[$code] = []; }
	$rating[$code][$steamid] = false;

	write_ratings($rating);

	return "rated";
}

function array_msort($array, $cols) {
	$colarr = array();
	foreach ($cols as $col => $order) {
		$colarr[$col] = array();
		foreach ($array as $k => $row) { $colarr[$col]['_' . $k] = strtolower($row[$col]); }
	}
	$eval = 'array_multisort(';
	foreach ($cols as $col => $order) {
		$eval .= '$colarr[\'' . $col . '\'],' . $order . ',';
	}
	$eval = substr($eval, 0, -1) . ');';
	eval($eval);
	$ret = array();
	foreach ($colarr as $col => $arr) {
		foreach ($arr as $k => $v) {
			$k = substr($k, 1);
			if (!isset($ret[$k])) $ret[$k] = $array[$k];

			$ret[$k][$col] = $array[$k][$col];
		}
	}
	return $ret;
}

?>