<?php

require('steamauth/steamauth.php');
require('util.php');
include('steamauth/userInfo.php');

$register_key = register_steam_account($steamprofile['steamid'], $steamprofile['timecreated']);
$admins = json_decode(file_get_contents($admins_dir), true);

?>

<!DOCTYPE html>
<html lang="en" data-theme="dark" class="container">
	<head>
		<meta charset="utf-8">
		<meta http-equiv="X-UA-Compatible" content="IE=edge">
		<meta name="viewport" content="width=device-width, initial-scale=1">
		<title>beatrun.ru | Auth</title>
		<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css"
				integrity="sha512-z3gLpd7yknf1YoNbCzqRKc4qyor8gaKU1qmn+CShxbuBusANI9QpRohGBreCFkKxLhei6S9CQXFEbbKuqLg0DA=="
				crossorigin="anonymous" referrerpolicy="no-referrer" />
		<link rel="stylesheet" href="css/main.css">
		<link rel="stylesheet" href="css/tailwind.css">
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

		<main class="pt-2 flex flex-grow justify-center">
			<div class="h-fit m-4 p-2 rounded-lg bg-stone-800 text-white drop-shadow-[0_0px_10px_rgba(0,0,0,0.5)]">
				<div class="text-center w-full">
					<div class="p-2 text-2xl font-bold">
						Authentication
					</div>

					<div class="pb-2 text-base">
						Create your own API key here!
					</div>

					<?php if (!isset($_SESSION['steamid'])) { ?>
							<div class="pb-2 text-base text-left">
								In order to receive your API Key, you must authorize with your Steam account. By doing so, you agree to follow these rules:
								<br>
								&emsp;1) Don't share your API Key with anyone (using it on different accounts, but on the same network is allowed)<br>
								&emsp;2) Don't post courses with offensive content (name, map, block placement, whatever).<br>
								&emsp;3) Don't upload garbage courses with intent to spam.<br>
								Failure to obide by these rules will result in your API Key and SteamID being blacklisted.<br>
								<br>
								As for us, we promise to:<br>
								&emsp;1) Never disclose a person's location, IP or any other private data they might share with us in the future.<br>
								&emsp;2) Store only the necessary data. Currently, we store only 2 last IPs that used the API Key and wipe them every 3 hours,<br>
								SteamID and Steam username used to create the API Key.
							</div>
							<div class="pt-2 flex justify-center">
								<a class="justify-center" href="?login">
									<button class="text-sm rounded-lg focus:ring-yellow-200 focus:border-yellow-300 block w-fit p-2.5 bg-stone-700 border-stone-600 placeholder-stone-400 text-white hover:bg-stone-500 active:bg-stone-400 transition-all" type="submit">Log-in with Steam</button>
								</a>
							</div>
					<?php } else { ?>
							<div class="pb-2 text-base text-left">
								Great! Welcome to our little community.
								<br>
								<b>To get started, make sure you're using <a class="hover:text-yellow-200 transition-all text-red-300" target="_blank" href="https://github.com/JonnyBro/beatrun">this</a> version of beatrun!</b>
								<br><br>
								Use this command below in console to save your API key in-game:
								<br>
								<b class="hover:text-yellow-200 transition-all">&emsp;beatrun_apikey <?php echo $register_key ?></b>
								<br>
								And you're done!
								<br><br>
								You can now load any course you want, as seen on the main page!
								<br>
								<b class="hover:text-yellow-200 transition-all">&emsp;beatrun_loadcode CODE-CODE-CODE</b>
								<br>
								Have fun!
							</div>

							<div class="pb-2 text-base text-left">
								Your authkey is:
								<b>
									<a title="Click to copy" id="key" class="hover:text-yellow-200 transition-all text-red-300" href="#" onclick="event.preventDefault(); navigator.clipboard.writeText(this.innerText)">
										<?php echo $register_key ?>
									</a>
								</b>
							</div>

							<div class="pt-2 flex justify-center">
								<form action="" method="get">
									<button class="text-sm rounded-lg focus:ring-yellow-200 focus:border-yellow-300 block w-fit p-2.5 bg-stone-700 border-stone-600 placeholder-stone-400 text-white hover:bg-stone-500 active:bg-stone-400 transition-all" name="logout" type="submit">Logout</button>
								</form>
							</div>
					<?php } ?>
				</div>
			</div>
		</main>

		<div class="text-center bottom-0 p-4 text-white opacity-75 text-sm drop-shadow-[0_0px_6px_rgba(0,0,0,0.3)]">
			Coperight @ Jonny_Bro & rlx 2077
			<br>
			Full source code available <a class="hover:text-yellow-200 transition-all text-red-300" href="https://github.com/JonnyBro/beatrun-courses-server">here</a>!
		</div>
	</body>
</html>
