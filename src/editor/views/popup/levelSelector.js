import Popup, { Button } from './popup';
import { componentClasses } from '../../../core/component';
import ComponentData from '../../../core/componentData';
import { list, el } from 'redom';
import assert from '../../../util/assert';
import { setChangeOrigin } from '../../../core/serializableManager';
import { game } from '../../../core/game';
import { scene } from '../../../core/scene';
import Level from '../../../core/level';
import { editor } from '../../editor';
import { listen, dispatch } from '../../events';
import Module from '../../module/module';

export default class LevelSelector extends Popup {
	constructor() {
		super({
			title: 'Levels',
			width: '500px',
			content: el('div.levelSelectorButtons',
				this.buttons = list('div.levelSelectorButtons', LevelItem),
				'Create: ',
				this.createButton = new Button
			)
		});

		this.parent = parent;
		
		this.buttons.update(game.getChildren('lvl'));

		this.createButton.update({
			text: 'New level',
			icon: 'fa-area-chart',
			callback: () => {
				setChangeOrigin(this);
				let lvl = new Level();
				lvl.initWithPropertyValues({
					name: 'New level'
				});
				editor.game.addChild(lvl);
				editor.setLevel(lvl);
				editor.select(lvl, this);
				
				this.remove();

				setTimeout(() => {
					Module.activateModule('level', true, 'focusOnProperty', 'name');
				}, 100);
			}
		});

		listen(this.el, 'selectLevel', level => { 
			editor.setLevel(level);

			this.remove();
			editor.select(level, this);
		});
		
		listen(this.el, 'deleteLevel', level => {
			if (confirm('Are you sure you want to delete level: ' + level.name)) {
				setChangeOrigin(this);
				level.delete();
				
				this.remove();
				new LevelSelector();
			}
		});
	}
}

class LevelItem {
	constructor() {
		this.el = el('div.levelItem',
			this.number = el('span'),
			this.selectButton = new Button,
			this.deleteButton = new Button
		)
	}
	selectClicked() {
		dispatch(this, 'selectLevel', this.level);
	}
	deleteClicked() {
		dispatch(this, 'deleteLevel', this.level);
	}
	update(level, idx) {
		this.level = level;
		this.number.textContent = (idx+1) + '.';
		this.selectButton.update({
			text: level.name,
			icon: 'fa-area-chart',
			callback: () => this.selectClicked()
		});
		this.deleteButton.update({
			text: 'Delete',
			class: 'dangerButton',
			icon: 'fa-cross',
			callback: () => this.deleteClicked()
		});
	}
}
