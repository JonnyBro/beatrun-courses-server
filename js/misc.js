function wipeinner() {
	self.innerHTML = "";
}

let prevtimeout = null;

function notify(type, message) {
	let notif = document.getElementById("notification");

	notif.removeEventListener("transitionend", wipeinner);
	if (prevtimeout != null) {
		clearTimeout(prevtimeout);
		notif.classList.add("notification_flash");
	}

	setTimeout(() => {
		notif.classList.remove("notification_flash");
	}, 200);

	notif.className = "notification " + type + " notification_flash";
	notif.innerHTML = message;
	notif.style.opacity = "1";

	prevtimeout = setTimeout(() => {
		notif.style.opacity = "0";
		notif.addEventListener("transitionend", wipeinner);
	}, 5000);
}

function copy_contents(contents) {
	notify("notification_good", "Copied!");
	navigator.clipboard.writeText(contents);
	event.preventDefault();
}

window.addEventListener("DOMContentLoaded", event => {
	document.body.addEventListener("htmx:afterRequest", function (evt) {
		if (evt.detail.xhr.responseText == "_0") {
			notify("notification_good", "Liked the course!");
		}
		if (evt.detail.xhr.responseText == "_1") {
			notify("notification_good", "Disliked the course!");
		}
		if (evt.detail.xhr.responseText == "_-1") {
			notify("notification_bad", "Not authorized!");
		}
		if (evt.detail.xhr.responseText == "_-2") {
			notify("notification_bad", "Ratelimited!");
		}
	});
});
