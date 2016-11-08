const electron = require('electron');

const ipc = electron.ipcRenderer;

ipc.on('youtube-crawler-reply', function(event, arg) {
	document.querySelector(".result").innerHTML = arg;
});

ipc.on('youtube-download-reply', function(event, arg, id) {
	var elem = document.getElementById(id);
	elem.querySelector(".download-progress").innerHTML = arg;
});

ipc.on('ffmpeg-reply', function(event, arg, id) {
	var elem = document.getElementById(id);
	elem.querySelector(".keyframe-progress").innerHTML = arg;
});

ipc.on('compare-reply', function(event, arg, id) {
	var elem = document.getElementById(id);
	elem.querySelector(".compare-progress").innerHTML = arg;
});

ipc.on('result-reply', function(event, arg, id) {
	var elem = document.getElementById(id);
	elem.querySelector(".progress-area").innerHTML = arg;
});

ipc.on('renderer-print', function(event, arg) {
	console.log(arg);
});

function request_youtube(keyword) {
	ipc.send('youtube-crawler', keyword);
}

var state = "main";
var selected_videos = [];

// TODO: Comment out all console logs
document.body.addEventListener('click', function(event) {
	if(event.target.id === "btn-search") {	// When search btn is pressed
		if(state !== "search") {	// Check if it's state is "search" which stands for the beginning
			state = "search";

			var search_nav = document.querySelector(".search-nav");
			var timer, opacity = 1;
			function disappear() {
				opacity -= 0.04;
				search_nav.style.opacity = opacity;

				if(opacity <= 0) {
					clearInterval(timer);

					search_nav.style.alignItems = "stretch";
					search_nav.style.flexDirection = "row";
					search_nav.style.height = "auto";
					search_nav.style.width = "100%";

					var logo = document.querySelector(".logo");
					logo.src = "assets/img/veeker_logo2.png";
					logo.style.marginTop = "10px";
					logo.style.marginRight = "10px";
					logo.style.height = "70px";

					var search_bar = document.querySelector(".search-bar");
					search_bar.style.alignItems = "stretch";
					search_bar.style.marginTop = "20px";
					search_bar.style.width = "60%";

					document.querySelector(".form-control").style.width = "90%";

					opacity = 0;
					function appear() {
						opacity += 0.04;
						search_nav.style.opacity = opacity;

						// If animation is done, it requests to youtube
						if(opacity >= 1) {
							clearInterval(timer);
							request_youtube(document.querySelector(".keyword").value);
						}
					}

					timer = setInterval(appear, 50);
				}
			}

			timer = setInterval(disappear, 50);
		} else {	// If it's state is not the beginning
			document.getElementById("btn-start").style.display = "inline-block";
			request_youtube(document.querySelector(".keyword").value);
		}
	} else if(event.target.id === "btn-start") {	// When start btn is pressed
		// Remove start button
		document.getElementById("btn-start").style.display = "none";

		var output = "";

		/* Make areas only for selected videos */
		selected_videos.map(function(array) {
			output += `
				<div class="selected-video" id=${array["id"]}>
					<div class="video-area">
						<iframe class="thumbnails" src=${array["id"]} frameborder="0" allowfullscreen></iframe>
						<label class="video-title"> ${array["title"]} </label>
					</div>
					<div class="progress-area">
						<div class="download-progress">
						</div>
						<div class="keyframe-progress">
						</div>
						<div class="compare-progress">
						</div>
					</div>
				</div>`;

			ipc.send('youtube-download', array["id"]);
		});

		document.querySelector(".result").innerHTML = output;

		// Renew the array
		selected_videos = [];
	} else if(event.target.attributes.type.nodeValue === "btn-video") {	// When video is selected
		var id = event.target.id;
		var index = -1;

		/* Check if it's already selected */
		selected_videos.map(function(array, i) {
			if(array["id"] === id) {
				index = i;
				return;
			}
		});

		if(index === -1) {	// If it has not been selected, put this video into the array and change color
			document.getElementById(event.target.id).style.border = "4px solid #ff7f50";

			console.log(event.target.attributes);

			var array = [];
			array["id"] = id;
			array["title"] = event.target.attributes.title.nodeValue;

			selected_videos.push(array);
		} else {	// If it's already selected, remote this video from the array and change color
			document.getElementById(event.target.id).style.border = "3px solid rgba(255, 255, 255, 0.6)";
			selected_videos.splice(index, 1);
		}

		console.log(selected_videos);
	}
});
