<?php

// potential issue is code colliding on different maps.
// we can accidentally have two same codes but on two different maps, therefore we can also override the wrong course.
// it's an edge case and a half, but still, keep that in mind.

require ('util.php');

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
$courses = json_decode(file_get_contents($courses_uid_dir), true);

if (!isset($courses[$map])) { _error("updatecourse.php - Can't find courses with the given map."); }
if (!isset($courses[$map][$code])) { _error("updatecourse.php - Can't find a course with the given map and code."); }

$uid_updatee = $courses[$map][$code];

if ($uid !== $uid_updatee) { _error("updatecourse.php - Not the owner of this course, can't update!"); }

$file = "courses/".$map."/".$code.".txt";

file_put_contents($file, $body);

_log("Updated a course: ".$code." (name: ".sanitize($decoded_body[4], false, true).")");
print("Updated the course under ID: ".$code."\n");


?>
