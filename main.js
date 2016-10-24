const glob = require('glob');
const path = require('path');
const electron = require('electron');

const app = electron.app;
const ipc = electron.ipcMain;
const BrowserWindow = electron.BrowserWindow;

const debug = /--debug/.test(process.argv[2]);

let mainWindow = null;

function loadDemos () {
  var files = glob.sync(path.join(__dirname, 'main-process/**/*.js'));
  files.forEach(function (file) {
    require(file);
  })
}

function initialize() {
	loadDemos();

	function createWindow() {
		var windowOptions = {
			width: 1080,
			minWidth: 680,
			height: 840,
			title: app.getName()
		}
	
		mainWindow = new BrowserWindow(windowOptions);
		mainWindow.loadURL(path.join('file://', __dirname, '/index.html'));

		if(debug) {
			mainWindow.webContents.openDevTools();
			mainWindow.maximize();
			require('devtron').install();
		}
	}
	
	app.on('ready', function() {
		createWindow();
	})
}

initialize();
