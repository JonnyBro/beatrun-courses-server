<?php
$coursesDir = "courses";
$files = scandir($coursesDir);
$data = array();

function print_to_console($data)
{
	$output = $data;
	if (is_array($output))
		$output = implode(',', $output);

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

				$creatorID = "Unknown";
				if (isset($coursesIDs[$shareCode])) { $creatorID = $coursesIDs[$shareCode]; }

				$data[] = array($courseName, $creatorID, $mapName, $shareCode);
			}
		}
	}
}
?>

<!DOCTYPE html>
<html>

<head>
	<title>Unofficial Beatrun Courses Database</title>
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
					Welcome to my custom Beatrun Courses Database<br>
					Here you can download Beatrun, get an API key and upload courses for any map! And everything is free 🤯!<br><br>
				</p>

				<a href="https://github.com/JonnyBro/beatrun" class="button">My Beatrun Patch</a>
				<a href="/register.php" class="button">Get an API key</a>
				<a href="https://discord.gg/93Psubbgsg" class="button">Our Discord</a>
			</div>

			<table>
				<thead>
					<tr>
						<td><div class="square">Course Name</div></td>
						<td><div class="square">Creator</div></td>
						<td><div class="square">Map</div></td>
						<td><div class="square">Code</div></td>
					</tr>
				</thead>
				<tbody>
				<?php foreach ($data as $row): ?>
						<tr>
							<td><div class="square"> <?php echo $row[0]; ?> </div></td>
							<td><div class="square"> <?php echo $row[1]; ?> </div></td>
							<td><div class="square"> <?php echo $row[2]; ?> </div></td>
							<td><div class="square"> <?php echo $row[3]; ?> </div></td>
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
	@font-face {
		font-family: "HeadUpDaisy";
		src: url("fonts/HeadUpDaisy.ttf") format("truetype");
	}

	body {
		font-family: "HeadUpDaisy";
		background-color: #171717;
		color: #ffffff;
		margin: 0;
		padding: 0;
	}

	table {
		margin-left: 50px;
		margin-top: 20px;
	}

	.panel {
		background-color: #292929;
		padding: 1px;
	}

	.panel h1 {
		font-size: 24px;
		font-weight: bold;
		padding-left: 10px;
	}

	.body-info {
		font-size: 20px;
		margin-left: 50px;
	}

	.square {
		width: auto;
		height: 35px;
		background-color: #292929;
		border: 1px solid #ffffff;
		text-align: center;
		line-height: 35px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		font-family: HeadUpDaisy;
		font-size: 20px;
		padding-right: 30px;
		padding-left: 30px;
	}

	.button {
		background-color: #292929;
		border: none;
		color: white;
		padding: 16px 16px;
		text-align: center;
		text-decoration: none;
		display: inline-block;
		font-size: 16px;
	}

	.footer {
		position: fixed;
		left: 0;
		bottom: 0;
		width: 100%;
		text-align: center;
	}

	#particles-js {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		z-index: -1;
	}

	::selection {
		background-color: #121212;
		color: #7a7a7a;
	}
</style>