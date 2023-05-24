<?php
$coursesDir = "courses";
$files = scandir($coursesDir);
$data = array();

foreach ($files as $file) {
	if ($file != "." && $file != "..") {
		if (is_dir($coursesDir . "/" . $file)) {
			$mapFiles = glob($coursesDir . "/" . $file . "/*.txt");

			foreach ($mapFiles as $mapFile) {
				$mapName = $file;
				$shareCode = basename($mapFile, ".txt");

				$data[] = array($mapName, $shareCode);
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

	<div class="panel">
		<h1>Beatrun | Unofficial Course Database | Supported by Jonny_Bro</h1>
	</div>
</head>

<body>
	<div class="body-info">
		<p>
		Welcome to the hub site for Beatrun courses <br>
		Here you can download Beatrun and upload courses for any map
		</p>

		<a href="https://discord.gg/xBHdyVupx7" class="button">Our Discord</a>
		<a href="https://github.com/jeffthekillerz/beatrun" class="button">Beatrun Source Code</a>
	</div>

	<table>
		<thead>
			<tr>
				<td><div class="square">Map</div></td>
				<td><div class="square">Code</div></td>
			</tr>
		</thead>
		<tbody>
			<?php foreach ($data as $row): ?>
				<tr>
					<td><div class="square"><?php echo $row[0]; ?></div></td>
					<td><div class="square"><?php echo $row[1]; ?></div></td>
				</tr>
			<?php endforeach; ?>
		</tbody>
	</table>
</body>

</html>