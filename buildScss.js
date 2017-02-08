let rollup = require('rollup');
var postcss = require('postcss');
var postcssImport = require('postcss-import');
let postcssScss = require('postcss-scss');
let precss = require('precss');
let fs = require('fs');
let path = require('path');
let log = console.log;

if (process.argv.length <= 3) {
	console.log('node buildScss sourceEntry destination');
	process.exit(1);
}

let sourceEntry = process.argv[2];
let destination = process.argv[3];

let scss = fs.readFileSync(path.join(__dirname, sourceEntry), 'utf8');

postcss([postcssImport, precss({})]).process(scss, {
	from: sourceEntry,
	to: destination,
	parser: postcssScss
}).then(result => {
	let filename = path.join(__dirname, destination);
	fs.writeFileSync(filename, result.css, 'utf8');
	fs.writeFileSync(filename + '.map', result.map, 'utf8');
	log('Built ' + destination);
}).catch(err => {
	log('err', err);
});
