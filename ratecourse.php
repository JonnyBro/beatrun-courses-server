<?php
	require ("steamauth/steamauth.php");
	require ("util.php");

	if (!isset($_SESSION["steamid"])) {
		echo "Not Authoized";
		return;
	}

	if (is_ratelimited()) {
		echo "Ratelimited";
		return;
	}

	$map = sanitize($_GET["map"], false, true);
	$code = sanitize($_GET["code"], false, true);
	$action = sanitize($_GET["action"], false, true);

	if ($action === "like") {
		like_course($map, $code);
		echo "Liked!";
		return;
	}

	if ($action === "dislike") {
		dislike_course($map, $code);
		echo "Disliked!";
		return;
	}
?>