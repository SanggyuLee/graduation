const glob = require('glob');
const path = require('path');
const electron = require('electron');
const fs = require('fs');

const ipc = electron.ipcMain;

function compare(filename) {
	var frames = [];
	glob(path.join(__dirname, '../frame/', filename, '*'),
		function(err, files) {
			console.log(files);
			frames = files;
		}
	);

	glob(path.join(__dirname, '../myframes/*'), 
		function(err, folders) {
			folders.forEach(function (folder) {
				glob(path.join(folder,'*'), function(err, file) {
				});
			});
	});
}

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
	})
	.pipe(videostream)

	videostream.on('close', function() {
		var output = `
			Download finished.
			<div class="progress">
				<div class="progress-bar progress-bar-success" role="progressbar" aria-valuenow="100" aria-valuemin="0" aria-valuemax="100" style="width: 100%">
				</div>
			</div>
		`;

		event.sender.send('youtube-download-reply', output, arg);

		event.sender.send('ffmpeg-reply', "Now we're gonna capture the keyframes..", arg);

		try {
			var process = new ffmpeg('videos/' + file_name);
			process.then(function (video) {
				/* Extract keyfames */
				video.fnExtractFrameToJPG('./frame/' + file_name + '/', {
					/* Extract options */
					every_n_frames : 100,
					file_name : '%s'
				}, function (error, files) {
					event.sender.send('renderer-print', error);
					var imageDiff = require('image-diff');
					var offset = 0;
					var end = files.length - 1;
					var count = 0;

					function check_keyframes(offset, end, files) {	// Check the key frames if it's similar or not
						var internal_count = 0;
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
								internal_count++;

								if(result.percentage < 0.15) {
									fs.unlink(options.actualImage, (err) => {
										if(err)
											throw err;

										console.log('successfully deleted: ' + options.actualImage);
									});
								}

								if((i - offset) == internal_count) {
									if(count != end) {	// If it's not end yet
										check_keyframes(i, end, files);
									} else {
										console.log('successfully extracted keyframes');
										compare(file_name);
									}
								}

								/* Making progress bar for keyframes */
								var value = ~~(count / end * 100);
								var string = (value === 100) ? 'Capturing Finished...' : 'Captureing keyframes...';
								var type = (value === 100) ? 'progress-bar-success' : 'progress-bar-info';
								var value_string = (value === 100) ? '' : value + '%';
								var output = `
									${string}
								<div class="progress">
									<div class="progress-bar ${type}" role="progressbar" aria-valuenow="${value}" aria-valuemin="0" aria-valuemax="100" style="width: ${value}%">
									${value_string}
								</div>
									</div>
									`;

								event.sender.send('ffmpeg-reply', output, arg, files);
							});
						}


						if(count == end) {	// When it's done. 
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
