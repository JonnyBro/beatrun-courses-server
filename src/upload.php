<?php

require('util.php');

upload_set_params();
if (!upload_headers_are_valid()) { _error("upload.php - Invalid headers."); }
if (is_ratelimited()) { _error("upload.php - Ratelimited."); }
if (!is_authkey_valid($authkey)) { _error("upload.php - Invalid key."); }

$uid = get_userid_from_authkey($authkey);
if (is_multiaccount($uid)) { _error("upload.php - Your account is locked. Contact site administration."); }

$body = base64_decode($_POST["course_data"], true);
$decoded_body = json_decode($body, true);

if (!$decoded_body) { _error("upload.php - Invalid course (not json)"); }
if (!body_is_valid($decoded_body)) { _error("upload.php - Invalid course (invalid signature)"); }

$course_id = generate_code();
$file = "courses/" . $course_id . ".txt";

$iter_limit = 500;
$iter = 0;
while (file_exists($file)) {
	if ($iter > $iter_limit) { _error("Hit the iter_limit while looking for a free slot. Try again."); }

	$course_id = generate_code();
	$file = "courses/" . $course_id . ".txt";
	$iter++;
}

file_put_contents($file, $body);

$map_image = "";

if ($mapid != "0") {
	$workshop_page = file_get_contents("https://steamcommunity.com/sharedfiles/filedetails/?id=$mapid");
	$image_property = [];

	preg_match("<meta property=\"og:image\" content=\".*\">", $workshop_page, $image_property);

	$map_image = str_replace("meta property=\"og:image\" content=\"", "", $image_property[0]);
	$map_image = str_replace("\"", "", $map_image);
}

write_course_data($course_id, [
	"map" => $map,
	"uploader" => ["authkey" => $authkey, "userid" => $uid],
	"time" => time(),
	"path" => $file,
	"mapid" => $mapid,
	"mapimg" => $map_image
]);

_log("Uploaded a course: " . $course_id . " (name: " . sanitize($decoded_body[4], false, true) . ")");
print("Uploaded under the ID: " . $course_id . "\n");

?>