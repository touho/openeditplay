const _ = require('lodash');
import fs from 'fs';

function readFile(filename) {
	return new Promise((resolve, reject) => {
		fs.readFile(`${DIR_TEMPLATE}/${filename}`, (err, data) => {
			if (err)
				return reject(err);
			resolve(data);
		});
	});
}
function readFileSync(filename) {
	return fs.readFileSync(`${DIR_TEMPLATE}/${filename}`);
}

export default function(filename, data) {
	return createTemplate(filename)(data);
}

export function createTemplate(filename) {
	return readFile(filename).then(fileData => {
		return _.template(fileData);
	});
}
export function createTemplateSync(filename) {
	let fileData = readFileSync(filename);
	return _.template(fileData);
}
