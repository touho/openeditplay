import Serializable from './serializable';
import PropertyOwner, { Prop } from '../core/propertyOwner';
import Scene, { scene } from './scene';

let propertyTypes = [
	Prop('name', 'No name', Prop.string)
];

export default class Level extends PropertyOwner {
	constructor(predefinedId) {
		super(...arguments);

		if (predefinedId)
			console.log('level import');
		else
			console.log('level created');
	}
	createScene(predefinedSceneObject = false) {
		if (!predefinedSceneObject)
			new Scene();
		let entities = this.getChildren('epr').map(epr => epr.createEntity());
		scene.addChildren(entities);
		scene.level = this;
		return scene;
	}
	
	
	/*
	OPTIMIZATION DOES NOT WORK, YET
	toJSON() {
		let json = super.toJSON();
		console.log('before', json);
		if (json.c) {
			let prototypeIds = new Set();
			json.c.forEach(child => {
				console.log('child', child);
				prototypeIds.add(child.p);
			});
			
			let prototypeIdToNum = {};
			let prototypeIdArray = [];
			let num = 0;
			prototypeIds.forEach(key => {
				prototypeIdArray[num] = key;
				prototypeIdToNum[key] = num++;
			});

			json.c.forEach(child => {
				child.p = prototypeIdToNum[child.p] || child.p;
			});
			
			json.p = prototypeIdArray;

			console.log(json, prototypeIds, prototypeIdToNum, prototypeIdArray);
		}
		return json;
	}
	*/
}
PropertyOwner.defineProperties(Level, propertyTypes);

Serializable.registerSerializable(Level, 'lvl');
