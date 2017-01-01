let rollup = require('rollup');
let rollupWatch = require('rollup-watch');
let babel = require('rollup-plugin-babel');
var rollupNodeResolve = require('rollup-plugin-node-resolve');
var rollupBuble = require('rollup-plugin-buble');
let chokidar = require('chokidar');
var rollupUglify = require('rollup-plugin-uglify');
var postcss = require('postcss');
var postcssImport = require('postcss-import');
let postcssScss = require('postcss-scss');
let precss = require('precss');
let fs = require('fs');
let path = require('path');
let concat = require('concat-files');
let log = console.log;

function startJsWatch(SOURCE, DESTINATION, callback) {
	let rollupOptions = {
		entry: SOURCE,
		dest: DESTINATION,
		sourceMap: true,
		plugins: [
			 rollupNodeResolve({
			 	jsnext: true,
				 preferBuiltins: false
			 }),
			
			 rollupBuble({
			 	transforms: { dangerousForOf: true }
			 }),

			rollupUglify()
		]
	};
	let rollupWatcher = rollupWatch(rollup, rollupOptions);
	rollupWatcher.on('event', event => {
		switch (event.code) {
			case 'STARTING':
				// log('checking rollup-watch version...');
				break;

			case 'BUILD_START':
				// log('Bundling...');
				break;

			case 'BUILD_END':
				log(`Built ${DESTINATION} (${event.duration} ms)`);
				if (callback)
					callback();
				
				break;

			case 'ERROR':
				var err = event.error;
				// log('Got error', event);
				log('Got error', err);
			function syntaxError(filename, message) {
				log(`Rollup error: ${message}`);
				log(`Fix ${filename} to continue`);
				var watcher = chokidar.watch(filename);
				setTimeout(() => {
					watcher.on('all', event => {
						if (!event.startsWith('add')) {
							watcher.close();
							startJsWatch(SOURCE, DESTINATION);
						}
					});
				}, 200);
			}

				// Rollup stops watching when it encounters an error.
				// That's not something we want, so wait until the faulty
				// file changes and then restart the watcher.
				if (err instanceof SyntaxError) {
					var guessedFileMatch = err.message.match(/\s([^ ]*\.js)\b/);
					if (guessedFileMatch) {
						var guessedFile = guessedFileMatch[1];
						syntaxError(guessedFile, err.message);
					}
				} else if (err.code === 'PARSE_ERROR') {
					syntaxError(err.file, err.message);
				} else {
					if (err.code) {
						log('error code', err.code);
					}
					log(err);
				}
				break;

			default:
				log('Unknown event', event);
		}
	});
}
function startCssWatcher(BUILD_ROOT_DIR, POSTCSS_ENTRY, POSTCSS_DEST) {

	var bundling = false;

	function bundleCss() {
		bundling = true;
		var start = new Date;

		var root = path.join(__dirname, '.');

		var scss = fs.readFileSync(root + '/' + POSTCSS_ENTRY, 'utf8');
		postcss([postcssImport, precss({})]).process(scss, {
			from: POSTCSS_ENTRY,
			to: POSTCSS_DEST,
			parser: postcssScss
		}).then(result => {
			fs.writeFileSync(root + '/' + POSTCSS_DEST, result.css, 'utf8');
			fs.writeFileSync(root + '/' + POSTCSS_DEST + '.map', result.map, 'utf8');
			var end = new Date;
			log('Built ' + POSTCSS_DEST + ' (' + (end - start) + ' ms)');
			bundling = false;
		}).catch(err => {
			log('err', err);
			bundling = false;
		});
	}

	bundleCss();

	var filenameRegExp = POSTCSS_DEST.split('/').slice(-1)[0].replace('.', '\\.') + '$';

	chokidar.watch(BUILD_ROOT_DIR + '**/*.scss', { ignored: new RegExp(filenameRegExp) }).on('all', function(event) {
		!event.startsWith('add') && bundleCss();
	});
}

function copy(from, to) {
	fs.createReadStream(from).pipe(fs.createWriteStream(to));
}

if (process.argv[2] === '--production') {
	startJsWatch('./src/main.js', './dist/explore.min.js');
	startCssWatcher('./src/', './src/main.scss', './dist/explore.css');
} else {
	startJsWatch('./src/mainDev.js', './dev/explore.dev.min.js');
	startCssWatcher('./src/', './src/mainDev.scss', './dev/css/explore.dev.css');

	concat([
			'node_modules/jquery/dist/jquery.min.js',
			'node_modules/propertiesjs/dist/propertiesJS.min.js'
		],
		'dev/explore.dev.dependencies.min.js'
	);
	concat([
			'node_modules/propertiesjs/dist/propertiesJS.css',
			'src/external/font-awesome.min.css'
		],
		'dev/css/explore.dev.dependencies.css'
	);
	log('to make a distribution build, use parameter --production');
}
log('Build watcher started.');
