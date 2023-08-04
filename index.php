<?php
	require ("util.php");

	$coursesDir = "courses";
	$files = scandir($coursesDir);
	$data = array();

	$rating_response = "";

	function print_to_console($data)
	{
		$output = $data;
		if (is_array($output))
			$output = implode(",", $output);

		echo "<script>console.log('" . $output . "');</script>";
	}

	foreach ($files as $file) {
		if ($file != "." && $file != "..") {
			if (is_dir($coursesDir . "/" . $file)) {
				$coursesIDs = json_decode(file_get_contents("data/_courses.json"), true);
				$mapFiles = glob($coursesDir . "/" . $file . "/*.txt");

				foreach ($mapFiles as $mapFile) {
					$courseName = array_filter(json_decode(file_get_contents($mapFile)), "is_string")[4];
					$mapName = $file;
					$shareCode = basename($mapFile, ".txt");
					$rating = get_course_rating($mapName, $shareCode);

					$creatorID = "Unknown";
					if (isset($coursesIDs[$shareCode])) { $creatorID = $coursesIDs[$shareCode]; }

					$data[] = array($courseName, $creatorID, $mapName, $shareCode, $rating);
				}
			}
		}
	}
?>

<!DOCTYPE html>
<html>

<head>
	<title>Unofficial Beatrun Courses Database</title>
	<link rel="stylesheet" href="css/main.css">
	 <script src="https://unpkg.com/htmx.org@1.9.4"></script>
</head>

<body>
	<div id="particles-js"></div>
	<script type="text/javascript" src="particles.js"></script>
	<script type="text/javascript" src="app.js"></script>

	<div class="wrapper">
		<div class="panel">
			<h1>Beatrun | Unofficial Courses Database</h1>
		</div>

		<div class="content">
			<div class="body-info">
				<p>
					Welcome to my custom Beatrun Courses Database.<br>
					Here you can download Beatrun, get an API key and upload courses for any map! And everything is free 🤯!<br><br>
				</p>

				<a href="/register.php?login" class="button">Log-in</a>
				<a href="/register.php" class="button">Get an API key</a><br><br>

				<a href="https://github.com/JonnyBro/beatrun" class="button">My Beatrun Patch</a>
				<a href="https://discord.gg/93Psubbgsg" class="button">Our Discord</a>
				<a href="/courses" class="button">Courses list for download</a>
			</div>
			<?php echo $rating_response; ?>
			<table>
				<thead>
					<tr>
						<td><div class="square">Course Name</div></td>
						<td><div class="square">Uploaded By</div></td>
						<td><div class="square">Map</div></td>
						<td><div class="square">Code</div></td>
						<td><div class="square">Rating</div></td>
					</tr>
				</thead>
				<tbody>
				<?php foreach ($data as $row): ?>
						<tr>
							<td><div class="square"> <?php echo $row[0]; ?> </div></td> <!-- coursename -->
							<td><div class="square"> <?php echo $row[1]; ?> </div></td> <!-- creator id-->
							<td><div class="square"> <?php echo $row[2]; ?> </div></td> <!-- map name -->
							<td><div class="square"> <?php echo $row[3]; ?> </div></td> <!-- share code -->
							<td><div class="square"> <?php echo $row[4]; ?> </div></td> <!-- rating -->
							<td>
								<button class="rate_button" hx-post="/ratecourse.php?code=<?php echo $row[3]; ?>&map=<?php echo $row[2]; ?>&action=like" hx-swap="innerHTML">
									Like
								</button>
								<button class="rate_button" hx-post="/ratecourse.php?code=<?php echo $row[3]; ?>&map=<?php echo $row[2]; ?>&action=dislike" hx-swap="innerHTML">
									Dislike
								</button>
							</td>
						</tr>
					<?php endforeach; ?>
				</tbody>
			</table>
		</div>
	</div>

	<div class="footer">
		<p>France lost | Coperight @ [relaxtakenotes / el1s1on / jonny_bro]</p>
	</div>
</body>

</html>

<style>
	body {
		margin: 0;
	}

	#particles-js {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		z-index: -1;
	}
</style>