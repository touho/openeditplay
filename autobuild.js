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

const ROOT = path.join(__dirname, './');

const cssDependencies = [
	'src/external/font-awesome.min.css'
];
const jsDependencies = [
	'node_modules/jquery/dist/jquery.min.js',
	'src/external/jstree.min.js'
];

// Editor CSS
watch('src/**/*.scss', () => {
	buildCss('src/editorMain.scss', 'dist/explore.editor.css', () => {
		copy('dist/explore.editor.cs*', 'public/css/');
	});
}, true);

// Editor CSS Dependencies
concat(cssDependencies.map(dep => `${ROOT}${dep}`), `${ROOT}dist/explore.editor.dependencies.css`, () => {
	console.log(`Built dist/explore.editor.dependencies.css`);
	copy('dist/explore.editor.dependencies.css', 'public/css/');
});
// Editor JS Dependencies
concat(jsDependencies.map(dep => `${ROOT}${dep}`), `${ROOT}dist/explore.editor.dependencies.js`, () => {
	console.log(`Built dist/explore.editor.dependencies.js`);
	copy('dist/explore.editor.dependencies.js', 'public/');
});

// Game engine JS
autobuildJs('src/main.js', 'dist/explore.js');
autobuildJs('src/main.js', 'dist/explore.min.js', {
	uglify: true
});

// Editor JS
autobuildJs('src/editorMain.js', 'dist/explore.editor.js');
autobuildJs('src/editorMain.js', 'dist/explore.editor.min.js', {
	uglify: true
});

watch(['dist/explore.editor.js', 'dist/explore.editor.css'], () => {
	if (serverProcess)
		serverProcess.send({ refreshOldBrowsers: true });
});

// Server JS
autobuildJs('src/serverMain.js', 'dist/explore.server.js', {
	format: 'cjs',
	copyTo: false,
	allowForOf: true, // node supports for-of
	externalDependencies: ['fs']
});

// Server restarter
let serverProcess = null;
watch('dist/explore.server.js', () => {
	if (serverProcess)
		serverProcess.kill('SIGHUP');
	
	// Timeout so that js and css files would have time to build before server force restarts clients
	setTimeout(() => {
		console.log('Launching server.');
		serverProcess = cp.fork(ROOT + 'server.js');
	}, 1000);
});

function exec(cmd) {
	let parts = cmd.split(' ');
	let child = cp.spawn(parts.shift(), parts);
	child.stdout.pipe(process.stdout);
	child.stderr.pipe(process.stderr);
	return child;
}

function copy(pattern, destination) {
	glob(`${ROOT}${pattern}`, (err, files) => {
		exec(`cp ${files.join(' ')} ${ROOT}${destination}`);
	});
}

function watch(path, callback, runNow) {
	runNow && callback();
	if (typeof path === 'string')
		path = [path];
	path = path.map(p => ROOT + p);
	return chokidar.watch(path)
	.on('change', callback)
	.on('unlink', callback);
}

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
};

function autobuildJs(entry, destination, options) {
	options = Object.assign({
		uglify: false,
		format: 'umd',
		copyTo: 'public/',
		allowForOf: false,
		externalDependencies: []
	}, options);
	
	let plugins = [
		rollupNodeResolve({
			jsnext: true
		}),
		rollupBuble({
			transforms: {
				forOf: !options.allowForOf
			}
		})
	];
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

				// Rollup stops watching when it encounters an error.
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
						console.log('error code', err.code);
					}
					console.log(err);
				}
				break;

			default:
				console.log('Unknown event', event);
		}
	});
}

process.on('uncaughtException', function (err) {
	console.error("Node.js Exception. " + err + " - " + err.stack);
});
