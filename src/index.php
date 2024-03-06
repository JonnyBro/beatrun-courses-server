<?php

require('steamauth/steamauth.php');
require('util.php');
include('steamauth/userInfo.php');

$admins = json_decode(file_get_contents($admins_dir), true);

?>

<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<meta http-equiv="X-UA-Compatible" content="ie=edge">
		<title>beatrun.ru | Courses</title>

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

		<main class="pt-2 flex flex-grow justify-center">
			<div class="h-fit m-4 p-2 rounded-lg bg-stone-800 text-white drop-shadow-[0_0px_10px_rgba(0,0,0,0.5)]">
				<div class="text-center w-full">
					<div class="p-2 text-2xl font-bold">
						User submitted courses
					</div>

					<div class="pb-2 text-base">
						<?php if (!isset($_SESSION['steamid'])) { ?>
							<a class="hover:text-yellow-200 transition-all text-red-300" href="register.php">Authorize with Steam</a> to load and upload these courses in-game!
						<?php } else { ?>
							Welcome, <b class="hover:text-yellow-200 transition-all"><?php echo sanitize($_SESSION['steam_personaname'], false, true) ?></b>!
						<?php } ?>
					</div>
				</div>

				<div class="flex">
					<div class="p-2" hx-get="getpagescounthtml.php" hx-trigger="load"></div>

					<div class="p-2">
						<div class="pb-1 text-sm opacity-50">Sorting:</div>
						<select name="sorttype" hx-include="[name='searchquery'], [name='page']" hx-get="getcourseshtml.php" hx-target="#courses" class="text-sm rounded-lg focus:ring-yellow-200 focus:border-yellow-300 block w-fit p-2.5 bg-stone-700 border-stone-600 placeholder-stone-400 text-white">
							<option value="date">Date</option>
							<option value="coursename">Course Name</option>
							<option value="mapname">Map Name</option>
							<option value="elementcount">Element count</option>
							<option value="ratesmart">Rating (Smart)</option>
							<option value="ratedumb">Rating (Dumb)</option>
						</select>
					</div>

					<div class="p-2">
						<div class="pb-1 text-sm opacity-50">Search:</div>
						<input hx-include="[name='page'], [name='sorttype']" hx-get="getcourseshtml.php" hx-target="#courses" hx-trigger="keyup[keyCode==13]" name="searchquery" class="text-sm rounded-lg focus:ring-yellow-200 focus:border-yellow-300 block w-fit p-2.5 bg-stone-700 border-stone-600 placeholder-stone-400 text-white"></input>
					</div>

					<div class="p-2">
						<div class="pb-1 text-sm opacity-0">lol</div>
						<button hx-include="[name='searchquery'], [name='page'], [name='sorttype']" hx-get="getcourseshtml.php" hx-target="#courses" hx-trigger="click" class="text-sm rounded-lg focus:ring-yellow-200 focus:border-yellow-300 block w-fit p-2.5 bg-stone-700 border-stone-600 placeholder-stone-400 text-white hover:bg-stone-500 active:bg-stone-400 transition-all">Search</button>
					</div>
				</div>

				<div id="courses" class="grid xl:grid-cols-2" hx-get="getcourseshtml.php" hx-trigger="load">
					<div class="htmx-indicator col-span-2 flex flex-row justify-center p-4">Loading...</div>
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