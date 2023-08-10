<?php
	require ("util.php");

	$courses = json_decode(file_get_contents($courses_uid_dir), true);
	$courses_dir = "courses/";
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
		$code = array();
		$code[0] = basename($path, ".txt");
		$code[1] = $path;
		$map = explode("/", $path)[1]; // this seems to be different on different systems. switch around between \\ and /

		$uid = "...";
		if (isset($courses[$map][$code[0]])) {
			$uid = $courses[$map][$code[0]];
		} elseif (isset($courses[$code[0]])) {
			$uid = $courses[$code[0]]; // backwards compatibility with courses.beatrun.ru
		}

		$rating = array();
		$rating[0] = get_course_rating($map, $code[0]);

		if ($rating[0] == "unknown") {
			$rating[1] = 0;
		} else {
			[$likes, $rates] = get_course_rating($map, $code[0], true);
			$dislikes = ($rates - $likes);
			$score = $rates + $likes - $dislikes;
			$rating[1] = intval($score);
		}

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
		<script src="js/tablesorting.js"></script>
		<script src="js/misc.js"></script>
	</head>

	<nav style="margin-left: 1%; margin-right: 1%;">
		<ul>
			<li><strong>Jonny_Bro's Courses Database</strong></li>
		</ul>
		<ul>
			<li><a href="register.php" role="button">Get an API key</a></li>
			<li><a target="_blank" href="https://github.com/JonnyBro/beatrun" role="button">Jonny's Beatrun Patch</a></li>
			<li><a target="_blank" href="https://discord.gg/93Psubbgsg" role="button">Our Discord</a></li>
		</ul>
	</nav>

	<body>
		<main>
			<article style="margin: 0;">
				<table role="grid" id="coursestable">
					<thead>
						<tr>
							<th onclick="sort_table(0)" scope="col" style="width:20%">Name</th>
							<th onclick="sort_table(1)" scope="col" style="width:20%">Uploader</th>
							<th onclick="sort_table(2)" scope="col" style="width:20%">Map</th>
							<th onclick="sort_table(3)" scope="col" style="width:20%">Code</th>
							<th onclick="sort_table_num(4)" scope="col" style="width:10%">Rating</th>
						</tr>
					</thead>
					<tbody>
						<?php foreach ($data as $row) { ?>
								<tr>
									<td> <?php echo $row[0]; ?> </div></td> <!-- coursename -->
									<td> <?php echo $row[1]; ?> </div></td> <!-- creator id-->
									<td> <?php echo $row[2]; ?> </div></td> <!-- map name -->
									<td>
										<div>
											<?php
												$code = $row[3][0];
												$path = $row[3][1];
												echo "<a title='Click to copy' href='#' onclick='copy_contents(\"$code\")'>$code</a><br><a href='$path'>Download</a>";
											?>
										</div>
									</td> <!-- share code -->
									<td id=<?php echo $row[4][1]; ?>>
										<div style="text-align: center">
											<?php echo $row[4][0]; ?>
											<br>
											<button class="rate_button"
													hx-post="/ratecourse.php?code=<?php echo $row[3][0]; ?>&map=<?php echo $row[2]; ?>&action=like"
													hx-swap="none"
													role="button">
												+
											</button>
											<button class="rate_button"
													hx-post="/ratecourse.php?code=<?php echo $row[3][0]; ?>&map=<?php echo $row[2]; ?>&action=dislike"
													hx-swap="none"
													role="button">
												-
											</button>
										</div>
									</td> <!-- rating -->
								</tr>
						<?php } ?>
					</tbody>
				</table>
			</article>
		</main>

		<div class="notification" id="notification">
		</div>
	</body>
</html>