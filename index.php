<?php
	require ("util.php");

	$courses = json_decode(file_get_contents($courses_uid_dir), true);
	$courses_dir = "courses";
	$iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($courses_dir));

	$data = array();

	foreach ($iterator as $file) {
		$path = $file->getPathname();
		$ext = pathinfo($path, PATHINFO_EXTENSION);
		if ($file->isDir()) { continue; }
		if ($ext != "txt") { continue; }

		$body = file_get_contents($path);
		$decoded_body = json_decode($body, true);
		if (!$decoded_body) { continue; }
		if (!body_is_valid($decoded_body)) { continue; }

		$name = $decoded_body[4];
		$code = basename($path, ".txt");
		$map = explode("/", $path)[1];

		$uid = "...";
		if (isset($courses[$map][$code])) { $uid = $courses[$map][$code]; }

		$rating = get_course_rating($map, $code);
		// maybe we can sort this by importance somehow? :-

		$data[] = array($name, $uid, $map, $code, $rating);
	}
?>

<!DOCTYPE html>
<html lang="en" data-theme="dark" class="container">
	<head>
		<meta charset="utf-8">
		<meta http-equiv="X-UA-Compatible" content="IE=edge">
		<meta name="viewport" content="width=device-width, initial-scale=1">
		<title>Jonny_Bro's Courses DB</title>
		<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@picocss/pico@1/css/pico.min.css">
		<link rel="stylesheet" type="text/css" href="css/main.css"/>
		<script src="https://unpkg.com/htmx.org@1.9.4"></script>
	</head>

	<nav style="margin-left: 1%; margin-right: 1%;">
		<ul>
			<li><strong>Jonny_Bro's Courses Database</strong></li>
		</ul>
		<ul>
			<li><a href="register.php" role="button">Get an API key</a></li>
			<li><a target="_blank" href="https://github.com/JonnyBro/beatrun" role="button">Jonny's Beatrun Patch</a></li>
			<li><a target="_blank" href="https://discord.gg/93Psubbgsg" role="button">Our Discord</a></li>
			<li><a href="/courses" role="button">Courses list for download</a></li>
		</ul>
	</nav>

	<body>
		<main>
			<table role="grid" style="column-width: 100ch;">
				<thead>
					<tr>
						<th scope="col" style="width:20%">Name</th>
						<th scope="col" style="width:20%">Uploader</th>
						<th scope="col" style="width:20%">Map</th>
						<th scope="col" style="width:20%">Code</th>
						<th scope="col" style="width:10%">Rating</th>
					</tr>
				</thead>
				<tbody>
					<?php foreach ($data as $row) { ?>
							<tr>
								<td><div class="square"> <?php echo $row[0]; ?> </div></td> <!-- coursename -->
								<td><div class="square"> <?php echo $row[1]; ?> </div></td> <!-- creator id-->
								<td><div class="square"> <?php echo $row[2]; ?> </div></td> <!-- map name -->
								<td><div class="square"> <?php echo $row[3]; ?> </div></td> <!-- share code -->
								<td>
									<div style="text-align: center"><?php echo $row[4]; ?></div>

									<button class="rate_button" hx-post="/ratecourse.php?code=<?php echo $row[3]; ?>&map=<?php echo $row[2]; ?>&action=like" hx-swap="innerHTML">
										Like
									</button>

									<button class="rate_button" hx-post="/ratecourse.php?code=<?php echo $row[3]; ?>&map=<?php echo $row[2]; ?>&action=dislike" hx-swap="innerHTML">
										Dislike
									</button>
								</td> <!-- rating -->
							</tr>
					<?php } ?>
				</tbody>
			</table>
		</main>
	</body>
</html>