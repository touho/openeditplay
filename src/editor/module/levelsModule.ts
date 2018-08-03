import { el, list, mount, List, RedomComponent } from 'redom';
import Module from './module';
import { game } from '../../core/game';
import { editor } from '../editor';
import Level from '../../core/level';
import { Button } from '../views/popup/Popup';
import { dispatch, listen } from '../../util/redomEvents';
import { setChangeOrigin } from "../../core/change";
import { selectInEditor } from '../editorSelection';
import { editorEventDispacher } from '../editorEventDispatcher';

export function createNewLevel() {
	let lvl = new Level();

	let levelNumber = 1;
	let newLevelName;
	while (true) {
		newLevelName = 'Level ' + levelNumber;
		if (!editor.game.findChild('lvl', lvl => lvl.name === newLevelName, false)) {
			break;
		}
		levelNumber++;
	}

	lvl.initWithPropertyValues({
		name: newLevelName
	});
	editor.game.addChild(lvl);
	editor.setLevel(lvl);

	return lvl;
}

editorEventDispacher.listen('createBlankLevel', createNewLevel);

class LevelsModule extends Module {
	content: HTMLElement;
	buttons: List;
	createButton: Button;

	constructor() {
		super();

		this.addElements(
			this.content = el('div',
				this.buttons = list('div.levelSelectorButtons', LevelItem),
				'Create: ',
				this.createButton = new Button
			)
		);
		this.name = 'Levels';
		this.id = 'levels';

		this.createButton.update({
			text: 'New level',
			icon: 'fa-area-chart',
			callback: () => {
				setChangeOrigin(this);
				let lvl = createNewLevel();
				selectInEditor(lvl, this);

				setTimeout(() => {
					Module.activateModule('level', true, 'focusOnProperty', 'name');
				}, 100);
			}
		});

		listen(this.el, 'selectLevel', level => {
			editor.setLevel(level);
			selectInEditor(level, this);
		});
		/*
				listen(this.el, 'deleteLevel', level => {
					if (level.isEmpty() || confirm('Are you sure you want to delete level: ' + level.name)) {
						setChangeOrigin(this);
						level.delete();
					}
				});
				*/
	}

	update() {
		this.buttons.update(game.getChildren('lvl'));
	}
}

Module.register(LevelsModule, 'left');

class LevelItem implements RedomComponent {
	el: HTMLElement;
	number: HTMLElement;
	selectButton: Button;
	level: Level;

	constructor() {
		this.el = el('div.levelItem',
			this.number = el('span'),
			this.selectButton = new Button
			//,this.deleteButton = new Button
		)
	}

	selectClicked() {
		dispatch(this, 'selectLevel', this.level);
	}

	/*
	deleteClicked() {
		dispatch(this, 'deleteLevel', this.level);
	}
	*/
	update(level, idx) {
		this.level = level;
		this.number.textContent = (idx + 1) + '.';
		this.selectButton.update({
			text: level.name,
			icon: 'fa-area-chart',
			callback: () => this.selectClicked()
		});
		/*
		this.deleteButton.update({
			text: 'Delete',
			class: 'dangerButton',
			icon: 'fa-cross',
			callback: () => this.deleteClicked()
		});
		*/
	}
}
