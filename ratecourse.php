<?php
	require ("steamauth/steamauth.php");
	require ("util.php");

	if (!isset($_SESSION["steamid"])) {
		echo "_-1";
		return;
	}

	if (is_ratelimited()) {
		echo "_-2";
		return;
	}

	$map = sanitize($_GET["map"], false, true);
	$code = sanitize($_GET["code"], false, true);
	$action = sanitize($_GET["action"], false, true);

	if ($action === "like") {
		like_course($map, $code);
		echo "_0";
		return;
	}

	if ($action === "dislike") {
		dislike_course($map, $code);
		echo "_1";
		return;
	}
?>