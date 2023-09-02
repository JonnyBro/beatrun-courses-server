<?php

// arse
// TODO: search
require ('util.php');

$_courses = get_courses_data();
$usernames = get_usernames();
$coursecard = file_get_contents("components/course_card.html");
$courses = [];

$searchquery = "";
if (isset($_GET["searchquery"])) { $searchquery = sanitize($_GET["searchquery"], true, false); }

foreach ($_courses as $c_code => $c_data) {
	$body = file_get_contents($c_data["path"]);
	if (!$body) { continue; }

	$decoded_body = json_decode($body, true);
	if (!$decoded_body) { continue; }
	if (!body_is_valid($decoded_body)) { continue; }

	[$likecount, $rates] = get_course_rating($c_code, true);

	$dislikecount = 0;
	$ratesmart = 0;
	$ratedumb = 0;

	if ($rates > 0) {
		$dislikecount = ($rates - $likecount);
		$ratesmart = intval($rates + $likecount - $dislikecount);
		$ratedumb = intval($likecount / $rates);
	} else {
		$likecount = 0;
	}

	$mapimagesrc = "img/unknown.jpg";

	$map = $c_data["map"];
	if ($map === "gm_flatgrass" || $map === "gm_construct") {
		if (is_file("img/$map.jpg")) {
			$mapimagesrc = "img/$map.jpg";
		}
	}

	if (isset($c_data["mapimg"]) && strlen($c_data["mapimg"]) > 0) {
		$mapimagesrc = $c_data["mapimg"];
	}

	$mapid = "2818480138"; // trollface
	if (isset($c_data["mapid"]) && strlen($c_data["mapid"]) > 0 && $c_data["mapid"] !== "0") {
		$mapid = $c_data["mapid"];
	}

	$userid = $c_data["uploader"]["userid"];
	$username = $userid;
	if (isset($usernames[$userid])) {
		$username = $usernames[$userid];
	}

	if (strlen($searchquery) > 0) {
		$concoction = "";
		$concoction .= $decoded_body[4];
		$concoction .= $c_code;
		$concoction .= $userid;
		$concoction .= $username;
		$concoction .= $c_data["map"];
		$concoction .= $mapid;

		if (!str_contains(strtolower($concoction), strtolower($searchquery))) { continue; }
	}

	array_push($courses, [
		"name" => $decoded_body[4],
		"elements" => count($decoded_body[5]) + count($decoded_body[0]),
		"code" => $c_code,
		"userid" => $userid,
		"username" => $username,
		"map" => $c_data["map"],
		"download" => $c_data["path"],
		"likes" => $likecount,
		"dislikes" => $dislikecount,
		"rates" => $rates,
		"scoresmart" => $ratesmart,
		"scoredumb" => $ratedumb,
		"time" => $c_data["time"],
		"mapimg" => $mapimagesrc,
		"mapwid" => $mapid
	]);
}

$sorttype = "none";
if (isset($_GET["sorttype"])) { $sorttype = sanitize($_GET["sorttype"], true, false); }

$sortkeys = [
	"date" => ["time", SORT_DESC],
	"ratesmart" => ["scoresmart", SORT_DESC],
	"ratedumb" => ["scoredumb", SORT_DESC],
	"elementcount" => ["elements", SORT_DESC],
	"coursename" => ["name", SORT_STRING],
	"mapname" => ["map", SORT_STRING],
];

if (!isset($sortkeys[$sorttype])) { $sorttype = "date"; }
$courses = array_msort($courses, array($sortkeys[$sorttype][0] => $sortkeys[$sorttype][1]));

$page = 0;
if (isset($_GET["page"])) { $page = intval(sanitize($_GET["page"], true, false)); }
if ($page * 20 > count($courses)) { $page = 0; }

$courses = array_splice($courses, $page * 20, $page * 20 + 20);

foreach ($courses as $data) {
	$output = $coursecard;
	$output = str_replace("{coursename}", $data["name"], $output);
	$output = str_replace("{coursecode}", $data["code"], $output);
	$output = str_replace("{uploaderuid}", $data["userid"], $output);
	$output = str_replace("{uploadername}", $data["username"], $output);
	$output = str_replace("{coursemap}", $data["map"], $output);
	$output = str_replace("{coursedownload}", $data["download"], $output);
	$output = str_replace("{likecount}", $data["likes"], $output);
	$output = str_replace("{dislikecount}", $data["dislikes"], $output);
	$output = str_replace("{ratesmart}", $data["scoresmart"], $output);
	$output = str_replace("{ratedumb}", $data["scoredumb"], $output);
	$output = str_replace("{unixdate}", $data["time"], $output);
	$output = str_replace("{mapimagesrc}", $data["mapimg"], $output);
	$output = str_replace("{mapwid}", $data["mapwid"], $output);
	$output = str_replace("{elementcount}", $data["elements"] . " elements", $output);

	echo $output;
}

?>