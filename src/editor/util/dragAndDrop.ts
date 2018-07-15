export class DragAndDropEvent {
	state: string;
	idList: Array<string>;
	targetElement: HTMLElement;
	type: string;

	constructor(idList, targetElement, state) {
		this.state = state;
		this.idList = idList;
		this.targetElement = targetElement; // the drop target target

		this.type = null;
		let types = Array.from(new Set(this.idList.map(id => id.substring(0, 3))));
		if (types.length === 0)
			this.type = 'none';
		else if (types.length === 1)
			this.type = types[0];
		else
			this.type = 'mixed';
	}
}

export class DragAndDropStartEvent extends DragAndDropEvent {
	constructor(idList, targetElement) {
		super(idList, targetElement, 'start');
	}
}

export class DragAndDropMoveEvent extends DragAndDropEvent {
	constructor(idList, targetElement, helper) {
		super(idList, targetElement, 'move');
		this.helper = helper;
	}
	hideValidationIndicator() {
		this.helper.find('.jstree-icon').css({
			visibility: 'hidden'
		});
	}
}

export class DragAndDropStopEvent extends DragAndDropEvent {
	constructor(idList, targetElement) {
		super(idList, targetElement, 'stop');
	}
}
