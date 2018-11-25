// Modules to control application life and create native browser window
const { app, BrowserWindow, protocol } = require('electron')
const path = require('path')
const fs = require('fs')

process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = '1'

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow

function createWindow() {
	const WEB_FOLDER = 'public'
	const PROTOCOL = 'file'

	protocol.interceptFileProtocol(
		PROTOCOL,
		(request, callback) => {
			// // // Strip protocol
			let url = request.url.substr(PROTOCOL.length + 1)

			url = url.split(app.getAppPath()).slice(-1)[0]

			url = url.split('?')[0]

			// // Build complete path for node require function
			url = path.join(app.getAppPath(), WEB_FOLDER, url)

			// // Replace backslashes by forward slashes (windows)
			// // url = url.replace(/\\/g, '/');
			url = path.normalize(url)
			console.log('request.url url', request.url, url)
			// fs.exists(url, (asdf) => {console.log('asdf', asdf)})
			// callback({url: request.url});
			// callback({ filePath: url });
			callback(url)
		},
		function() {
			console.log('completion', arguments)
		}
	)

	// console.log('polku', app.getAppPath())

	// Create the browser window.
	mainWindow = new BrowserWindow({
		width: 1000,
		height: 700,
		webPreferences: {
			// webSecurity: false,
			// allowRunningInsecureContent: true
		},
		// title: 'Open Edit Play',
	})

	// and load the index.html of the app.
	mainWindow.loadFile('edit/electron.html')

	// Open the DevTools.
	mainWindow.webContents.openDevTools();

	// Emitted when the window is closed.
	mainWindow.on('closed', function() {
		// Dereference the window object, usually you would store windows
		// in an array if your app supports multi windows, this is the time
		// when you should delete the corresponding element.
		mainWindow = null
	})
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', function() {
	// On OS X it is common for applications and their menu bar
	// to stay active until the user quits explicitly with Cmd + Q
	if (process.platform !== 'darwin') {
		app.quit()
	}
})

app.on('activate', function() {
	// On OS X it's common to re-create a window in the app when the
	// dock icon is clicked and there are no other windows open.
	if (mainWindow === null) {
		createWindow()
	}
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
