import './main';

import './core/test';
import './core/componentExample'; // temp

import './editor/editor';

import Property from './core/property';
window.Property = Property;

import PropertyType from './core/propertyType';
window.PropertyType = PropertyType;

import { Component, Prop } from './core/component';
window.Component = Component;
window.Prop = Prop;

import Serializable from './core/serializable';
window.Serializable = Serializable;

import { getSerializable } from './core/serializableManager';
window.getSerializable = getSerializable;


if (false && 'perf test') {
	function measure(func, n) {
		var start = performance.now();

		for (var i = 0; i < n; i++)
			func(i)

		console.log(performance.now() - start);
	}

	var N = 100000;

	function createThing() {
		return {id: '' + Math.random()};
	}

	var things = [];
	measure(idx => {
		things.push(createThing());
	}, N)


	var arr = [];
	measure(idx => {
		arr.push(things[idx]);
	}, N)
	console.log(arr.length);
	measure(idx => {
		arr.indexOf(things[idx]);
	}, N)
	measure(idx => {
		arr.splice(arr.indexOf(things[idx]), 1);
	}, N)
	console.log(arr);

	var obj = {};
	measure(idx => {
		obj[things[idx].id] = things[idx];
	}, N)
	console.log(Object.keys(obj).length);
	measure(idx => {
		obj[things[idx].id];
	}, N)
	measure(idx => {
		delete obj[things[idx].id];
	}, N)
	console.log(obj);

	var set = new Set();
	measure(idx => {
		set.add(things[idx]);
	}, N)
	console.log(set.size);
	measure(idx => {
		set.has(things[idx]);
	}, N)
	measure(idx => {
		set.delete(things[idx]);
	}, N)
	console.log(set);

	var map = new Map();
	measure(idx => {
		map.set(things[idx].id, things[idx]);
	}, N)
	console.log(map.size);
	measure(idx => {
		map.get(things[idx].id);
	}, N)
	measure(idx => {
		map.delete(things[idx].id);
	}, N)
	console.log(map);
}
