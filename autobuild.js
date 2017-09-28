const cp = require('child_process')
const chokidar = require('chokidar')
const path = require('path');
const rollup = require('rollup');
const rollupWatch = require('rollup-watch');
const rollupBuble = require('rollup-plugin-buble');
const rollupNodeResolve = require('rollup-plugin-node-resolve');
const rollupUglify = require('rollup-plugin-uglify');
const glob = require('glob');
const kexec = require('kexec');
const postcss = require('postcss');
const postcssImport = require('postcss-import');
const postcssScss = require('postcss-scss');
const precss = require('precss');
const fs = require('fs');
const concat = require('concat-files');
const preprocess = require('rollup-plugin-preprocess').default;

const ROOT = path.join(__dirname, './');
module.exports.ROOT = ROOT;

let targets = ['dev', 'all']; // TODO: add 'devOnce' and 'allOnce' ... or just 'build' or 'once'
let target = process.argv[2];
if (targets.indexOf(target) < 0)
	target = targets[0];
	
if (!global.TARGET_NONE) {
	console.log('Autobuilding', target);
	
	const editorCssDependencies = [
		'src/external/font-awesome.min.css'
	];
	const editorJsDependencies = [
		'node_modules/jquery/dist/jquery.min.js',
		'src/external/jstree.min.js',
		'src/external/p2.js',
		'src/external/pixi.js'
		// 'src/external/pixi.stripped.min.js'
	];
	const jsDependencies = [ // 519kb (155kb gzipped)
		'src/external/p2.min.js',
		// 'src/external/pixi.min.js'
		'src/external/pixi.stripped.min.js'
	];

	// Editor CSS
	watch('src/**/*.scss', () => {
		buildCss('src/editor/editor.scss', 'builds/openeditplay.editor.css', () => {
			copy('builds/openeditplay.editor.cs*', 'public/edit/css/');
		});
	}, true);

	// Editor CSS Dependencies
	concat(editorCssDependencies.map(dep => `${ROOT}${dep}`), `${ROOT}builds/openeditplay.editor.dependencies.css`, err => {
		if (err) throw new Error(err);
		console.log(`Built builds/openeditplay.editor.dependencies.css`);
		copy('builds/openeditplay.editor.dependencies.css', 'public/edit/css/');
	});

	// Editor JS Dependencies
	concat(editorJsDependencies.map(dep => `${ROOT}${dep}`), `${ROOT}builds/openeditplay.editor.dependencies.js`, err => {
		if (err) throw new Error(err);
		console.log(`Built builds/openeditplay.editor.dependencies.js`);
		copy('builds/openeditplay.editor.dependencies.js', 'public/edit/');
	});

	// Game engine JS Dependencies
	if (target === 'all') {
		concat(jsDependencies.map(dep => `${ROOT}${dep}`), `${ROOT}builds/openeditplay.dependencies.js`, err => {
			if (err) throw new Error(err);
			console.log(`Built builds/openeditplay.dependencies.js`);
			copy('builds/openeditplay.dependencies.js', 'public/play/');
		});
	}

	// Game engine JS and CSS
	if (target === 'all') {
		autobuildJs('src/main.js', 'builds/openeditplay.js', {
			copyTo: 'public/play/',
			optimize: true
		});
		autobuildJs('src/main.js', 'builds/openeditplay.min.js', {
			uglify: true,
			copyTo: 'public/play/',
			optimize: true
		});

		/*
		if (target === 'all') {
			buildCss('src/main.scss', 'builds/openeditplay.play.css', () => {
				copy('builds/openeditplay.cs*', 'public/play/css/');
			});
		}
		*/
	}

	// Editor JS
	autobuildJs('src/editorMain.js', 'builds/openeditplay.editor.js', {
		copyTo: 'public/edit/'
	});
	// autobuildJs('src/editorMain.js', 'builds/openeditplay.editor.min.js', {
	// 	uglify: true,
	// 	copyTo: 'public/'
	// });

	watch(['public/edit/**/*', 'public/play/**/*'], () => {
		if (serverProcess && serverProcess.connected)
			serverProcess.send('refreshOldBrowsers');
	});
	
	if (target === 'all') {
		// tests aren't used actively and they are not very overwhelming
		// autobuildJs('src/testMain.js', 'builds/openeditplay.tests.js');
	}

	// Server restarter
	function launchServer() {
		// Timeout so that js and css files would have time to build before server force restarts clients
		serverProcess = 'wait';
		setTimeout(() => {
			console.log('Launching server.');
			serverProcess = cp.fork(ROOT + 'src/server/main.js');
		}, 200);
	}
	let serverProcess = null;
	watch(['src/server/**/*'], args => {
		if (serverProcess === 'wait')
			return;

		if (serverProcess) {
			console.log('on close', Date.now());
			serverProcess.on('close', launchServer);
			serverProcess.kill('SIGHUP');
		} else {
			launchServer();
		}
	});
	// Start server when a heavy build process has been done.
	let serverStartWatcher = watch('builds/openeditplay.editor.js', () => {
		serverStartWatcher.close();
		launchServer();
	});
}

function exec(cmd) {
	let parts = cmd.split(' ');
	let child = cp.spawn(parts.shift(), parts);
	child.stdout.pipe(process.stdout);
	child.stderr.pipe(process.stderr);
	return child;
}

function copy(pattern, destination) {
	glob(`${ROOT}${pattern}`, (err, files) => {
		if (files.length === 0)
			return;
		exec(`cp ${files.join(' ')} ${ROOT}${destination}`);
	});
}

function watch(path, callback, runNow) {
	runNow && callback();
	if (typeof path === 'string')
		path = [path];
	path = path.map(p => p.startsWith('/') ? p : ROOT + p);
	return chokidar.watch(path)
	.on('change', callback)
	.on('unlink', callback);
}
module.exports.watch = watch;

function buildCss(sourceEntry, destination, callback) {
	let scss = fs.readFileSync(ROOT + sourceEntry, 'utf8');
	postcss([postcssImport, precss({})]).process(scss, {
		from: ROOT + sourceEntry,
		to: ROOT + destination,
		parser: postcssScss
	}).then(result => {
		let filename = ROOT + destination;
		fs.writeFileSync(filename, result.css, 'utf8');
		fs.writeFileSync(filename + '.map', result.map, 'utf8');
		console.log(`Built ${destination}`);
		callback && callback();
	}).catch(err => {
		console.log('err', err);
	});
}

function autobuildJs(entry, destination, options) {
	options = Object.assign({
		uglify: false,
		format: 'umd',
		copyTo: false, // 'public/'
		allowForOf: false,
		externalDependencies: [],
		optimize: false
	}, options);

	let plugins = [];
	
	plugins.push(rollupNodeResolve({
		jsnext: true
	}));

	plugins.push(rollupBuble({
		transforms: {
			forOf: !options.allowForOf
		}
	}));

	if (options.optimize) {
		plugins.push(preprocess({
			context: {
				OPTIMIZE: true
			}
		}));
	}
	
	if (options.uglify)
		plugins.push(rollupUglify());
	
	let rollupOptions = {
		entry: ROOT + entry,
		dest: ROOT + destination,
		sourceMap: true,
		format: options.format,
		plugins,
		external: options.externalDependencies
	};
	let rollupWatcher = rollupWatch(rollup, rollupOptions);

	// From https://github.com/rollup/rollup/blob/master/bin/src/runRollup.js
	rollupWatcher.on('event', event => {
		switch (event.code) {
			case 'STARTING':
			case 'BUILD_START':
				// console.log('START', destination);
				break;
			case 'BUILD_END':
				console.log(`Built ${destination} (${event.duration} ms)`);
				if (options.copyTo) {
					copy(destination + '*', options.copyTo);
				}
				break;

			case 'ERROR':
				var err = event.error;
				
			function syntaxError(filename, message) {
				console.log(`Rollup error: ${message}`);
				console.log(`Fix ${filename} to continue`);
				setTimeout(() => {
					let watcher = watch(filename, () => {
							watcher.close();
						autobuildJs(entry, destination, options);
					});
				}, 200);
			}

				// Rollup stops watching when it encounters an sendError.
				// That's not something we want, so wait until the faulty
				// file changes and then restart the watcher.
				if (err instanceof SyntaxError) {
					let guessedFileMatch = err.message.match(/\s([^ ]*\.js)\b/);
					if (guessedFileMatch) {
						let guessedFile = guessedFileMatch[1];
						syntaxError(guessedFile, err.message);
					}
				} else if (err.code === 'PARSE_ERROR') {
					syntaxError(err.file, err.message);
				} else {
					if (err.code) {
						console.log('sendError code', err.code);
					}
					console.log('Some Rollup sendError', err);
				}
				break;

			default:
				console.log('Unknown event', event);
		}
	});
}
module.exports.autobuildJs = autobuildJs;
process.on('uncaughtException', function (err) {
	console.error("Node.js Exception. " + err + " - " + err.stack);
});
