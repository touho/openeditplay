// tests
import './core/test';
import './core/componentExample';

// main
import './main';
import './editor/editor';


import Property from './core/property';
window.Property = Property;

import PropertyModel from './core/propertyModel';
window.PropertyModel = PropertyModel;

import PropertyType from './core/propertyType';
window.PropertyType = PropertyType;

import { Component } from './core/component';
window.Component = Component;
