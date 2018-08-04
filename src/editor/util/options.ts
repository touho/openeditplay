let options = null;

function loadOptions() {
	if (!options) {
		try {
			options = JSON.parse(localStorage['openEditPlayOptions']);
		} catch (e) {
			// default options
			options = {
				moduleContainerPacked_bottom: true
			};
		}
	}
}

export function setOption(id, stringValue) {
	loadOptions();
	options[id] = stringValue;
	try {
		localStorage['openEditPlayOptions'] = JSON.stringify(options);
	} catch (e) {
	}
}

export function getOption(id) {
	loadOptions();
	return options[id];
}
