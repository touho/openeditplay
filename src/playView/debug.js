
let element = null;
let data = {};
export default function debug(key, value) {
	if (!element) {
		element = document.getElementById('debug');
	}
	
	data[key] = value;
	
	let msg = '';
	Object.keys(data).sort().forEach(key => {
		msg += key + ': ' + data[key] + '';
	});
	
	element.innerHTML = msg;
}
