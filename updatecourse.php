<?php

require('util.php');

upload_set_params();

if (!upload_headers_are_valid()) { _error("updatecourse.php - Invalid headers."); }
if (is_ratelimited()) { _error("updatecourse.php - Ratelimited."); }
if (!is_authkey_valid($authkey)) { _error("updatecourse.php - Invalid key."); }

$uid = get_userid_from_authkey($authkey);
if (is_multiaccount($uid)) { _error("updatecourse.php - Your account is locked. Contact site administration."); }

$body = base64_decode($_POST["course_data"], true);
$decoded_body = json_decode($body, true);

if (!$decoded_body) { _error("updatecourse.php - Invalid course (not json)"); }
if (!body_is_valid($decoded_body)) { _error("updatecourse.php - Invalid course (invalid signature)"); }

$code = sanitize($_POST["code"], false, true);
$course = get_course_data($code);

if (!$course) { _error("updatecourse.php - A course under this code does not exist. Please upload it properly."); }
if ($course["map"] !== $map) { _error("updatecourse.php - Maps do not match."); }
if ($course["uploader"]["userid"] !== $uid) { _error("updatecourse.php - Can't update this course due to user mismatch."); }

$file = "courses/" . $code . ".txt";

file_put_contents($file, $body);

_log("Updated a course: " . $code . " (name: " . sanitize($decoded_body[4], false, true) . ")");
print("Updated the course under ID: " . $code . "\n");

?>