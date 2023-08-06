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
		$code = array();
		$code[0] = basename($path, ".txt");
		$code[1] = $path;
		$map = explode("/", $path)[1];

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
		<script>
			// https://www.w3schools.com/howto/howto_js_sort_table.asp
			function sort_table(n) {
				var table,
					rows,
					switching,
					i,
					x,
					y,
					shouldSwitch,
					dir,
					switchcount = 0;
				table = document.getElementById("coursestable");
				switching = true;
				// Set the sorting direction to ascending:
				dir = "asc";
				/* Make a loop that will continue until
							no switching has been done: */
				while (switching) {
					// Start by saying: no switching is done:
					switching = false;
					rows = table.rows;
					/* Loop through all table rows (except the
							first, which contains table headers): */
					for (i = 1; i < rows.length - 1; i++) {
						// Start by saying there should be no switching:
						shouldSwitch = false;
						/* Get the two elements you want to compare,
								one from current row and one from the next: */
						x = rows[i].getElementsByTagName("TD")[n];
						y = rows[i + 1].getElementsByTagName("TD")[n];
						/* Check if the two rows should switch place,
								based on the direction, asc or desc: */
						if (dir == "asc") {
							if (x.innerHTML.toLowerCase() > y.innerHTML.toLowerCase()) {
								// If so, mark as a switch and break the loop:
								shouldSwitch = true;
								break;
							}
						} else if (dir == "desc") {
							if (x.innerHTML.toLowerCase() < y.innerHTML.toLowerCase()) {
								// If so, mark as a switch and break the loop:
								shouldSwitch = true;
								break;
							}
						}
					}
					if (shouldSwitch) {
						/* If a switch has been marked, make the switch
								and mark that a switch has been done: */
						rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
						switching = true;
						// Each time a switch is done, increase this count by 1:
						switchcount++;
					} else {
						/* If no switching has been done AND the direction is "asc",
								set the direction to "desc" and run the while loop again. */
						if (switchcount == 0 && dir == "asc") {
							dir = "desc";
							switching = true;
						}
					}
				}
			}

			var num_dir = "bigger";

			function sort_table_num(n) {
				var table, rows, switching, i, x, y, shouldSwitch;
				table = document.getElementById("coursestable");
				switching = true;
				if (num_dir == "bigger") {
					num_dir = "smaller";
				} else {
					num_dir = "bigger";
				}
				/*Make a loop that will continue until
							no switching has been done:*/
				while (switching) {
					//start by saying: no switching is done:
					switching = false;
					rows = table.rows;
					/*Loop through all table rows (except the
							first, which contains table headers):*/
					for (i = 1; i < rows.length - 1; i++) {
						//start by saying there should be no switching:
						shouldSwitch = false;
						/*Get the two elements you want to compare,
								one from current row and one from the next:*/
						x = rows[i].getElementsByTagName("TD")[n];
						y = rows[i + 1].getElementsByTagName("TD")[n];
						//check if the two rows should switch place:
						if (num_dir == "bigger") {
							if (Number(x.id) > Number(y.id)) {
								//if so, mark as a switch and break the loop:
								shouldSwitch = true;
								break;
							}
						} else {
							if (Number(x.id) < Number(y.id)) {
								//if so, mark as a switch and break the loop:
								shouldSwitch = true;
								break;
							}
						}
					}
					if (shouldSwitch) {
						/*If a switch has been marked, make the switch
								and mark that a switch has been done:*/
						rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
						switching = true;
					}
				}
			}
		</script>
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
			<table role="grid" style="column-width: 100ch;" id="coursestable">
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
											echo $row[3][0] . "<br><a href='" . $row[3][1] . " download'>Download</a>";
										?>
									</div>
								</td> <!-- share code -->
								<td id=<?php echo $row[4][1]; ?>>
									<div style="text-align: center"><?php echo $row[4][0]; ?></div>

									<button class="rate_button" hx-post="/ratecourse.php?code=<?php echo $row[3][0]; ?>&map=<?php echo $row[2]; ?>&action=like" hx-swap="innerHTML">
										Like
									</button>

									<button class="rate_button" hx-post="/ratecourse.php?code=<?php echo $row[3][0]; ?>&map=<?php echo $row[2]; ?>&action=dislike" hx-swap="innerHTML">
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