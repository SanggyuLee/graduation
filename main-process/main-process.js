const electron = require('electron');
const fs = require('fs');

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

/* IPC receive for youtube downlod */
ipc.on('youtube-download', function(event, arg) {
	var ytdl = require('ytdl-core');
	var ffmpeg = require('ffmpeg');
	var get_youtube_id = require('get-youtube-id');
	var file_name = get_youtube_id(arg) + '.flv';
	file_name = file_name.replace("_", "");

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
				${~~value}%
				</div>
			</div>
		`;

		event.sender.send('youtube-download-reply', output, arg);
	})
	.on('response', function(res) {
		total = res.headers['content-length'];
	})
	.on('finish', function() {
		var output = `
			Download finished.
			<div class="progress">
				<div class="progress-bar progress-bar-success" role="progressbar" aria-valuenow="100" aria-valuemin="0" aria-valuemax="100" style="width: 100%">
				</div>
			</div>
		`;

		event.sender.send('youtube-download-reply', output, arg);
	})
	.pipe(videostream)

	videostream.on('close', function() {
		event.sender.send('ffmpeg-reply', "Now we're gonna capture the keyframes..", arg);

		try {
			console.log("videostream.on");
			var process = new ffmpeg('videos/' + file_name);
			process.then(function (video) {
				/* Extract keyfames */
				video.fnExtractFrameToJPG('./frame/' + file_name + '/', {
					/* Extract options */
					every_n_frames : 100,
					file_name : '%s'
				}, function (error, files) {
					var imageDiff = require('image-diff');
					var offset = 0;
					var end = files.length - 1;
					function check_keyframes(offset, end, files) {	// Check the key frames if it's similar or not
						var count = 0;

						for(var i = offset; i < end; i++) {
							// It request only 100 keyframes at once
							if(i >= offset + 50)
								break;

							imageDiff.getFullResult({
								actualImage: files[i],
								expectedImage: files[i + 1],
								diffImage: 'difference.jpg',
							}, function(err, result, options) {
								count++;

								if(result.percentage < 0.15) {
									fs.unlink(options.actualImage, (err) => {
										if(err)
											throw err;

										console.log('successfully deleted: ' + options.actualImage);
									});
								}

								if((i - offset) == count) {
									if(i != end - 1)	// If it's not end yet
										check_keyframes(i, end, files);
									else
										console.log('successfully extracted keyframes');
								}
							});
						}

						event.sender.send('ffmpeg-reply', "We've successfully captured key frames..<br/>Now we're comparing if it matches..", arg, files);

						if(i == end)  {
							console.log('successfully extracted keyframes');
						} else {
						}
					}

					check_keyframes(offset, end, files);
				});
			}, function (err) {
				console.log('Error: ' + err);
			});
		} catch (e) {
			console.log("Catch: " + e.code);
			console.log("Catch: " + e.msg);
		}
	})
})
