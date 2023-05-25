<?php
$coursesDir = "courses";
$files = scandir($coursesDir);
$data = array();

function print_to_console($data) {
	$output = $data;
	if (is_array($output))
		$output = implode(',', $output);

	echo "<script>console.log('" . $output . "');</script>";
}

foreach ($files as $file) {
	if ($file != "." && $file != "..") {
		if (is_dir($coursesDir . "/" . $file)) {
			$mapFiles = glob($coursesDir . "/" . $file . "/*.txt");

			foreach ($mapFiles as $mapFile) {
				$mapName = $file;
				$courseName = array_filter(json_decode(file_get_contents($mapFile)), "is_string")[4];
				$shareCode = basename($mapFile, ".txt");

				$data[] = array($mapName, $courseName, $shareCode);
			}
		}
	}
}
?>

<!DOCTYPE html>
<link rel="stylesheet" href="styles.css">
<html>

<head>
	<div id="particles-js"></div>
	<script type="text/javascript" src="particles.js"></script>
	<script type="text/javascript" src="app.js"></script>

	<link rel="shortcut icon" href="favicon_static.ico" type="image/x-icon">
	<link rel="icon" href="/favicon.ico" type="image/x-icon">

	<div class="panel">
		<h1>Beatrun | Unofficial Course Database | Supported by Jonny_Bro</h1>
	</div>
</head>

<body>
	<div class="body-info">
		<p>
		Welcome to my custom Beatrun Course Database <br>
		Here you can download Beatrun and upload courses for any available map <br><br>
		In our Discord you can get latest version of Beatrun with support for this database!
		</p>

		<a href="https://discord.gg/xBHdyVupx7" class="button">Our Discord</a>
		<a href="https://github.com/jeffthekillerz/beatrun" class="button">Beatrun Source Code</a>
	</div>

	<table>
		<thead>
			<tr>
				<td><div class="square">Map</div></td>
				<td><div class="square">Course Name</div></td>
				<td><div class="square">Code</div></td>
			</tr>
		</thead>
		<tbody>
			<?php foreach ($data as $row): ?>
				<tr>
					<?php
						$find = array(
							"gm" => "gm_",
							"br" => "br_",
							"rp" => "rp_",
							"dm" => "dm_",
							"catalyst" => "catalyst_",
							"gpk" => "gpk_"
						)
					?>
					<td><div class="square"> <?php echo strtr($row[0], $find); ?> </div></td>
					<td><div class="square"> <?php echo $row[1]; ?> </div></td>
					<td><div class="square"> <?php echo $row[2]; ?> </div></td>
				</tr>
			<?php endforeach; ?>
		</tbody>
	</table>
</body>

</html>