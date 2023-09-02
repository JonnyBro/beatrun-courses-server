function copy_course_id(id) {
	let span = document.getElementById(id);
	span.classList.add("opacity-100");

	setTimeout(() => {
		span.classList.remove("opacity-100");
	}, 3000);

	navigator.clipboard.writeText(id);
}

function switch_user(id, steamid, name) {
	let span = document.getElementById(id);

	if (span.innerText == name) {
		span.innerText = steamid;
	} else {
		span.innerText = name;
	}
}
