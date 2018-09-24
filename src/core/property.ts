import Serializable from './serializable';
import { addChange, changeType, setChangeOrigin } from './change';
import assert from '../util/assert';
import * as performanceTool from '../util/performance';
import { PropertyType } from './propertyType';
import { GameEvent, globalEventDispatcher } from './eventDispatcher';

let gameChangesEnabled = true;
let sceneChangesEnabled = false;
let sceneChangeFilter: (prp: Property) => boolean = null;

let changesEnabled = false;
let scenePropertyFilter = null;
// true / false to enable / disable property value change sharing.
// if object is passed, changes are only sent
export function filterSceneChanges(_scenePropertyFilter) {
	scenePropertyFilter = _scenePropertyFilter;
	changesEnabled = true;
}

export function disableAllChanges() {
	changesEnabled = false;
}

export function enableAllChanges() {
	changesEnabled = true;
}

export function setPropertyChangeSettings(enableGameChanges: boolean, enableSceneChanges: boolean | ((prp: Property) => boolean)) {
	gameChangesEnabled = enableGameChanges
	sceneChangesEnabled = !!enableSceneChanges
	sceneChangeFilter = typeof enableSceneChanges === 'function' ? enableSceneChanges : null
}

export function executeWithoutEntityPropertyChangeCreation(task) {
	let oldChangesEnabled = changesEnabled;
	changesEnabled = false;
	task();
	changesEnabled = oldChangesEnabled;
}

// Object of a property
export default class Property extends Serializable {
	_value: any;
	_initialValue: any;
	name: any;
	propertyType: PropertyType;
	_initialValueIsJSON: boolean = false;

	// set skipSerializableRegistering=true if you are not planning to add this property to the hierarchy
	// if you give propertyType, value in real value form
	// if you don't give propertyType (give it later), value as JSON form
	constructor({ value, predefinedId = '', name, propertyType = null, skipSerializableRegistering = false }) {
		super(predefinedId, skipSerializableRegistering);
		assert(name, 'Property without a name can not exist');
		this._initialValue = value;
		if (propertyType)
			this.setPropertyType(propertyType);
		else {
			this.name = name;
			this._initialValueIsJSON = true;
		}
	}
	makeUpAName() {
		return this.name;
	}
	setPropertyType(propertyType) {
		this.propertyType = propertyType;
		try {
			if (this._initialValue !== undefined)
				this.value = this._initialValueIsJSON ? propertyType.type.fromJSON(this._initialValue) : this._initialValue;
			else
				this.value = propertyType.initialValue;
		} catch (e) {
			console.log('Invalid value', e, propertyType, this);
			this.value = propertyType.initialValue;
		}
		this.name = propertyType.name;
	}
	clone(skipSerializableRegistering = false) {
		return new Property({
			value: this.propertyType.type.clone(this.value),
			name: this.name,
			propertyType: this.propertyType,
			skipSerializableRegistering
		});
	}
	toJSON() {
		return Object.assign(super.toJSON(), {
			v: this.type.toJSON(this.value),
			n: this.propertyType.name
		});
	}

	valueEquals(otherValue) {
		return this.propertyType.type.equal(this._value, otherValue);
	}

	get type() {
		return this.propertyType.type;
	}

	set value(newValue) {
		let oldValue = this._value;
		this._value = this.propertyType.validator.validate(newValue);

		this.dispatch(GameEvent.PROPERTY_VALUE_CHANGE, this._value, oldValue);
		if (this._rootType === 'gam') {
			if (gameChangesEnabled) {
				addChange(changeType.setPropertyValue, this);
			}
		} else if (sceneChangesEnabled && (!sceneChangeFilter || sceneChangeFilter(this))) {
			addChange(changeType.setPropertyValue, this);
		}
	}
	get value() {
		return this._value;
	}
}
Property.prototype.propertyType = null;

Serializable.registerSerializable(Property, 'prp', json => {
	return new Property({
		value: json.v,
		predefinedId: json.id,
		name: json.n
	});
});

Object.defineProperty(Property.prototype, 'debug', {
	get() {
		return `prp ${this.name}=${this.value}`;
	}
});
