export class DragAndDropEvent {
	type: string;

	constructor(public idList: Array<string>, public targetElement: HTMLElement, public state: string) {
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
	constructor(idList: Array<string>, targetElement: HTMLElement) {
		super(idList, targetElement, 'start');
	}
}

export class DragAndDropMoveEvent extends DragAndDropEvent {
	constructor(idList: Array<string>, targetElement: HTMLElement, public helper: any) {
		super(idList, targetElement, 'move');
	}
	hideValidationIndicator() {
		this.helper.find('.jstree-icon').css({
			visibility: 'hidden'
		});
	}
}

export class DragAndDropStopEvent extends DragAndDropEvent {
	constructor(idList: Array<string>, targetElement: HTMLElement) {
		super(idList, targetElement, 'stop');
	}
}
