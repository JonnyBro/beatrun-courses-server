<?php

require('steamauth/steamauth.php');
require('util.php');

$likediv = file_get_contents("components/like_div.html");

$code = sanitize($_GET["code"], false, true);
$action = sanitize($_GET["action"], false, true);

function get_return_div() {
	global $code, $likediv;

	[$likes, $rates] = get_course_rating($code, true);
	$dislikes = ($rates - $likes);

	if (!$rates || $rates <= 0) {
		$dislikes = 0;
		$likes = 0;
		$rates = 0;
	}

	$div = $likediv;
	$div = str_replace("{coursecode}", $code, $div);
	$div = str_replace("{likecount}", $likes, $div);
	$div = str_replace("{dislikecount}", $dislikes, $div);

	return $div;
}

if (!isset($_SESSION['steamid']) || !get_authkey_from_userid($_SESSION['steamid'])) {
	echo get_return_div();

	return;
}

if (is_ratelimited()) {
	echo get_return_div();

	return;
}

if ($action === "like") { like_course($code); }
if ($action === "dislike") { dislike_course($code); }

echo get_return_div();

?>