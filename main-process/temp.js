const electron = require('electron');

const ipc = electron.ipcMain;

/* IPC receive for youtube crawling keyword */
ipc.on('youtube-crawler', function (event, arg) {
	var crawler = require('youtube-crawler');
	var output = "";
	crawler(arg, function (err, results) {
		var get_youtube_id = require('get-youtube-id');
		var addr = "";

		results.forEach(function(video, i) {
			var id = get_youtube_id(video["link"]);
			thumbnail_addr = "http://img.youtube.com/vi/" + id + "/default.jpg";
			embed_addr = "https://www.youtube.com/embed/" + id;
			output += `
				<div class="btn-video" type="btn-video" id="${embed_addr}" title="${video["title"]}">
						<iframe class="thumbnails" src=${embed_addr} frameborder="0" allowfullscreen></iframe>
						<label class="video-title"> ${video["title"]} </label>
				</div>`;
		});

		event.sender.send("youtube-crawler-reply", output)
	});
})

ipc.on('youtube-download', function(event, arg) {
	var fs = require('fs');
	var ytdl = require('ytdl-core');
	var ffmpeg = require('ffmpeg');
	var get_youtube_id = require('get-youtube-id');
	var file_name = get_youtube_id(arg) + '.flv';
	var videostream = fs.createWriteStream('videos/' + file_name);
	var myytdl = ytdl(arg, {quality: 133});
	var current = 0, total = 0;

	myytdl.on('data', function(data) {
		current += data.length;
		var value = current / total * 100;
		var output = `
			Downloading...
			<div class="progress">
				<div class="progress-bar progress-bar-info" role="progressbar" aria-valuenow="${value}" aria-valuemin="0" aria-valuemax="100" style="width: ${value}%">
				</div>
			</div>
		`;

		event.sender.send('youtube-download-reply', output, arg);
	})
	.on('response', function(res) {
		total = res.headers['content-length'];
	})
	.on('finish', function() {
		event.sender.send('youtube-download-reply', "Download finished. We're caturing key frames..", arg);
	})
	.pipe(videostream)

	videostream.on('close', function() {
		try {
			var process = new ffmpeg('videos/' + file_name);
			process.then(function (video) {
				// Callback mode
				video.fnExtractFrameToJPG('./frame/' + file_name + '/', {
					every_n_frames : 100,
					file_name : 'my_frame_%t_%s'
				}, function (error, files) {
					event.sender.send('ffmpeg-reply', "We've successfully captured key frames..<br/>Now we're comparing if it matches..", arg);
				});
			}, function (err) {
				console.log('Error: ' + err);
			});
		} catch (e) {
			console.log(e.code);
			console.log(e.msg);
		}
	})
})
