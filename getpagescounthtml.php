<?php
// arse
require('util.php');

$courses = get_courses_data();
$dropdown = file_get_contents("components/page_dropdown.html");

$page_count = floor(max(count($courses) / 20, 0));

$options = "";

for ($i = 0; $i <= $page_count; $i++) {
	$options .= "<option value=\"$i\">" . $i + 1 . "</option>";
}

$dropdown = str_replace("{options}", $options, $dropdown);

echo $dropdown;

?>