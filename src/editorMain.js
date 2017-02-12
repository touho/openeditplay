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

import { getSerializable, serializables, setChangeOrigin } from './core/serializableManager';
window.getSerializable = getSerializable;
window.serializables = serializables;
window.setChangeOrigin = setChangeOrigin;

import { default as Game } from './core/game';
window.Game = Game;
