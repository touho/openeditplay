
const propertiesStoredInValueField = [
	'cid', // componentId
	's', // scale
	'a', // angle
	't', // prototypeId
	'p' // position
];

// Class instances are only used for converting game json to database format
class ServerSerializable {
	constructor(json, parentId) {
		this.id = json.id;
		this.parentId = parentId || null;
		this.type = this.id.substring(0, 3);
		this.name = json.n || null;

		if (this.type === 'epr') {
			console.log('jsonnnn', json);
		}

		// console.log('reger', this.name);
		if (this.id[this.id.length - 2] === '_') {
			console.log('SS', this.id, json);
		}
		
		let propertyStoreValue = getPropertiesStoreValueString(json);
		if (this.type === 'prp') {
			if (propertyStoreValue || json.v === undefined) {
				console.log('ERROR in json:', json);
				throw new Error(`Property must contain value 'v' and not extra properties`);
			}
		} else {
			if (json.v !== undefined)
				throw new Error('Cannot have v on ' + this.id);
		}
		
		// string value
		this.value = json.v !== undefined ? JSON.stringify(json.v) : (propertyStoreValue || null);
		
		this.children = [];
		if (json.c) {
			// children
			this.children = json.c.map(childJSON => new ServerSerializable(childJSON, this.id));
		}
	}
	getSerializables() {
		let serializables = [this];
		this.children.forEach(c => {
			serializables.push(...c.getSerializables());
		});
		return serializables;
	}
	static getSerializables(json, parentId) {
		return new ServerSerializable(json, parentId).getSerializables();
	}
	static buildTree(serializablesFromDb) {
		let game = null;
		let map = {}; // parentId => list of serializables
		
		serializablesFromDb.forEach(s => {
			// Create JSON form
			let serializable = {
				id: s.id
			};
			if (s.name) serializable.n = s.name;
			if (s.value) {
				let value = JSON.parse(s.value);
				if (s.id.startsWith('prp')) {
					serializable.v = value;
				} else {
					Object.keys(value).forEach(key => {
						serializable[key] = value[key];
					});
				}
			}
			if (s.type === 'gam')
				game = serializable;
			else
				map[s.parentId] = (map[s.parentId] || []).concat(serializable);
		});
		fillChildrenForGameJSON(game, map);
		return game;
	}
};
module.exports = ServerSerializable;

function getPropertiesStoreValueString(json) {
	let valueObject = {};
	let isEmpty = true;
	propertiesStoredInValueField.forEach(key => {
		if (json[key] !== undefined) {
			valueObject[key] = json[key];
			isEmpty = false;
		}
	});
	if (isEmpty)
		return null;
	else
		return JSON.stringify(valueObject);
}

function fillChildrenForGameJSON(serializable, map) {
	let children = map[serializable.id];
	if (children) {
		serializable.c = children;
		children.forEach(c => fillChildrenForGameJSON(c, map));
	}
};
