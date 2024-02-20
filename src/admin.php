<?php

require('steamauth/steamauth.php');
require('util.php');

if (!isset($_SESSION['steamid'])) {
	echo '
	<a href="?login">
		<button class="button" type="submit">Log-in</button>
	</a>
	';
	return;
}

$admins = json_decode(file_get_contents($admins_dir), true);

if (!isset($admins[$_SESSION['steamid']])) {
	_error("Not admin.");
}

$response = "...";

// yo yanderedev u need to hire me fr

if (array_key_exists('_bcs_addkey', $_POST)) {
	if (strlen($_POST["_bcs_addkey_target"]) <= 0) {
		$response = "No input.";
	} else {
		$response = gen_key(str_replace(" ", "", $_POST["_bcs_addkey_target"]));
		_log_browser("Admin " . $_SESSION['steamid'] . " generated a key for user " . $_POST["_bcs_addkey_target"] . ": " . $response);
	}
}

if (array_key_exists('_bcs_rmkey', $_POST)) {
	if (strlen($_POST["_bcs_rmkey_target"]) <= 0) {
		$response = "No input.";
	} else {

		$response = rm_key(str_replace(" ", "", $_POST["_bcs_rmkey_target"]));
		_log_browser("Admin " . $_SESSION['steamid'] . " removed a key from user " . $_POST["_bcs_rmkey_target"]);
	}
}

if (array_key_exists('_bcs_lock', $_POST)) {
	if (strlen($_POST["_bcs_lock_target"]) <= 0) {
		$response = "No input.";
	} else {
		$response = lock_account(str_replace(" ", "", $_POST["_bcs_lock_target"]));
		_log_browser("Admin " . $_SESSION['steamid'] . " locked a user with the ID " . $_POST["_bcs_lock_target"] . ": " . $response);
	}
}

if (array_key_exists('_bcs_unlock', $_POST)) {
	if (strlen($_POST["_bcs_unlock_target"]) <= 0) {
		$response = "No input.";
	} else {

		$response = unlock_account(str_replace(" ", "", $_POST["_bcs_unlock_target"]));
		_log_browser("Admin " . $_SESSION['steamid'] . " unlocked a user with the ID " . $_POST["_bcs_unlock_target"] . ": " . $response);
	}
}

if (array_key_exists('_bcs_logs', $_POST)) {
	$response = str_replace("\n", "<br>", file_get_contents($log_dir));
}

if (array_key_exists('_bcs_records', $_POST)) {
	$response = str_replace("\n", "<br>", get_records());
}

if (array_key_exists('_bcs_bans', $_POST)) {
	$response = str_replace("\n", "<br>", file_get_contents($lock_dir));
}

if (array_key_exists('_bcs_rm_course', $_POST)) {
	if (strlen($_POST["_bcs_rm_course_code"]) <= 0) {
		$response = "No input.";
	} else {
		$response = rm_course(str_replace(" ", "", $_POST["_bcs_rm_course_code"]));
		_log_browser("Admin " . $_SESSION['steamid'] . " removed a course with the code " . $_POST["_bcs_rm_course_code"] . ": " . $response);
	}
}

?>

<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<meta http-equiv="X-UA-Compatible" content="ie=edge">
		<title>beatrun.ru | Admin</title>

		<link rel="stylesheet" href="css/tailwind.css">
		<link rel="stylesheet" href="css/main.css">

		<style>
			body::-webkit-scrollbar { width: 0 !important }
			body { overflow: -moz-scrollbars-none; }
			body { -ms-overflow-style: none; }
		</style>

		<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css"
				integrity="sha512-z3gLpd7yknf1YoNbCzqRKc4qyor8gaKU1qmn+CShxbuBusANI9QpRohGBreCFkKxLhei6S9CQXFEbbKuqLg0DA=="
				crossorigin="anonymous" referrerpolicy="no-referrer" />

		<script type="text/javascript" src="js/main.js"></script>
		<script src="https://unpkg.com/htmx.org@1.9.5"></script>
	</head>
	<body class="w-screen h-screen bg-stone-900 overflow-x-hidden">
		<nav class="flex h-12 p-4 w-full bg-gradient-to-r from-red-700 to-red-800 drop-shadow-[0_5px_15px_rgba(0,0,0,0.3)]
					font-bold text-2xl">
			<div class="flex flex-row flex-grow">
				<div class="flex flex-col justify-center text-white p-2 rounded-lg drop-shadow-[0_0px_6px_rgba(0,0,0,0.3)]">
					<a href="/">beatrun.ru | Courses Database</a>
				</div>
			</div>

			<div class="flex flex-row flex-grow justify-end">
				<div class="flex flex-col justify-center">
					<a target="_blank" href="https://discord.com/invite/93Psubbgsg" class="text-base text-white p-2 rounded-lg
								hover:text-yellow-200 transition-all h-fit bg-opacity-10
								drop-shadow-[0_0px_6px_rgba(0,0,0,0.3)]">
						<i class="fa-brands fa-discord"></i>
					</a>
				</div>

				<div class="flex flex-col justify-center">
					<a href="register.php" class="text-base text-white p-2 rounded-lg
										hover:text-yellow-200 transition-all h-fit bg-opacity-10
										drop-shadow-[0_0px_6px_rgba(0,0,0,0.3)]">
						<i class="fa-solid fa-right-to-bracket"></i>
					</a>
				</div>

				<?php if (isset($_SESSION['steamid']) && isset($admins[$_SESSION['steamid']])) { ?>
					<div class="flex flex-col justify-center">
						<a href="admin.php" class="text-base text-white p-2 rounded-lg
									hover:text-yellow-200 transition-all h-fit bg-opacity-10
									drop-shadow-[0_0px_6px_rgba(0,0,0,0.3)]">
							<i class="fa-solid fa-user-tie"></i>
						</a>
					</div>
				<?php } ?>
			</div>
		</nav>

		<!-- Don't let Jonny near HTML and CSS ever again -->

		<main class="pt-2 flex flex-grow justify-center">
			<div class="h-fit m-4 p-2 rounded-lg bg-stone-800 text-white drop-shadow-[0_0px_10px_rgba(0,0,0,0.5)]">
				<div class="text-center w-screen">
					<div class="p-2 text-2xl font-bold">
						Admin Page
					</div>

					<div class="pb-2 text-base">
						I admin'd all over the place
						<br>
						This page sucks
					</div>
				</div>

				<article>
					<form method="post">
						<div class="flex">
							<input type="text" class="text-sm rounded-lg focus:ring-yellow-200 focus:border-yellow-300 block w-fit p-2.5 bg-stone-700 border-stone-600 placeholder-stone-400 text-white" style="width: auto" name="_bcs_addkey_target" placeholder="SteamID64">
							<input type="submit" name="_bcs_addkey" class="text-sm rounded-lg focus:ring-yellow-200 focus:border-yellow-300 block w-fit p-2.5 bg-stone-700 border-stone-600 placeholder-stone-400 text-white hover:bg-stone-500 active:bg-stone-400 transition-all" role="button" style="width: auto" value="Add Key"/>
						</div>
						<br>
						<div class="flex">
							<input type="text" class="text-sm rounded-lg focus:ring-yellow-200 focus:border-yellow-300 block w-fit p-2.5 bg-stone-700 border-stone-600 placeholder-stone-400 text-white" name="_bcs_rmkey_target" style="width: auto" placeholder="SteamID64">
							<input type="submit" name="_bcs_rmkey" class="text-sm rounded-lg focus:ring-yellow-200 focus:border-yellow-300 block w-fit p-2.5 bg-stone-700 border-stone-600 placeholder-stone-400 text-white hover:bg-stone-500 active:bg-stone-400 transition-all" role="button" style="width: auto" role="button"value="Remove Key"/>
						</div>
						<br>
						<div class="flex">
							<input type="text" class="text-sm rounded-lg focus:ring-yellow-200 focus:border-yellow-300 block w-fit p-2.5 bg-stone-700 border-stone-600 placeholder-stone-400 text-white" name="_bcs_lock_target" style="width: auto" placeholder="Authkey/SteamID64/IP">
							<input type="submit" name="_bcs_lock" class="text-sm rounded-lg focus:ring-yellow-200 focus:border-yellow-300 block w-fit p-2.5 bg-stone-700 border-stone-600 placeholder-stone-400 text-white hover:bg-stone-500 active:bg-stone-400 transition-all" role="button" style="width: auto" value="Lock"/>
						</div>
						<br>
						<div class="flex">
							<input type="text" class="text-sm rounded-lg focus:ring-yellow-200 focus:border-yellow-300 block w-fit p-2.5 bg-stone-700 border-stone-600 placeholder-stone-400 text-white" name="_bcs_unlock_target" style="width: auto" placeholder="Authkey/SteamID64/IP">
							<input type="submit" name="_bcs_unlock" class="text-sm rounded-lg focus:ring-yellow-200 focus:border-yellow-300 block w-fit p-2.5 bg-stone-700 border-stone-600 placeholder-stone-400 text-white hover:bg-stone-500 active:bg-stone-400 transition-all" style="width: auto" role="button" value="Unlock"/>
						</div>
						<br>
						<div class="flex">
							<input type="text" class="text-sm rounded-lg focus:ring-yellow-200 focus:border-yellow-300 block w-fit p-2.5 bg-stone-700 border-stone-600 placeholder-stone-400 text-white" name="_bcs_rm_course_code" style="width: auto" placeholder="Course Code">
							<input type="submit" name="_bcs_rm_course" class="text-sm rounded-lg focus:ring-yellow-200 focus:border-yellow-300 block w-fit p-2.5 bg-stone-700 border-stone-600 placeholder-stone-400 text-white hover:bg-stone-500 active:bg-stone-400 transition-all" style="width: auto" role="button" value="Remove Course"/>
						</div>
						<br>
						<div class="flex">
							<input type="submit" name="_bcs_logs" class="text-sm rounded-lg focus:ring-yellow-200 focus:border-yellow-300 block w-fit p-2.5 bg-stone-700 border-stone-600 placeholder-stone-400 text-white hover:bg-stone-500 active:bg-stone-400 transition-all" role="button" style="width: auto" value="Show logs"/>
							<input type="submit" name="_bcs_records" class="text-sm rounded-lg focus:ring-yellow-200 focus:border-yellow-300 block w-fit p-2.5 bg-stone-700 border-stone-600 placeholder-stone-400 text-white hover:bg-stone-500 active:bg-stone-400 transition-all" role="button" style="width: auto" value="Show records"/>
							<input type="submit" name="_bcs_bans" class="text-sm rounded-lg focus:ring-yellow-200 focus:border-yellow-300 block w-fit p-2.5 bg-stone-700 border-stone-600 placeholder-stone-400 text-white hover:bg-stone-500 active:bg-stone-400 transition-all" role="button" style="width: auto" value="Show locks"/>
						</div>
					</form>
					<br>
					Server response:<br>
					<code><?php echo $response ?></code>
				</article>
			</div>
		</main>

		<div class="text-center bottom-0 p-4 text-white opacity-75 text-sm drop-shadow-[0_0px_6px_rgba(0,0,0,0.3)]">
			Coperight @ Jonny_Bro & rlx 2077
			<br>
			Full source code available <a class="hover:text-yellow-200 transition-all text-red-300" href="https://github.com/JonnyBro/beatrun-courses-server">here</a>!
		</div>
	</body>
	<script>
		if (window.history.replaceState) {
			window.history.replaceState(null, null, window.location.href);
		}
	</script>
</html>