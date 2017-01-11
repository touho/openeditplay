import './main';

import './core/test';
import './core/componentExample'; // temp

import './editor/editor';


import Property from './core/property';
window.Property = Property;

import PropertyModel from './core/propertyType';
window.PropertyModel = PropertyModel;

import { Component } from './core/component';
window.Component = Component;

import Serializable from './core/serializable';
window.Serializable = Serializable;

import { getSerializable } from './core/serializableManager';
window.getSerializable = getSerializable;
