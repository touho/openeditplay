import { el, list, mount, RedomElement, List, text } from 'redom';
import Module from './module';
import * as performance from '../../util/performance';
import { scene } from '../../core/scene';
import { editorEventDispacher, EditorEvent } from '../editorEventDispatcher';
import { editorSelection, unfocus, selectInEditor } from '../editorSelection';
import EntityPrototype from '../../core/entityPrototype';
import ComponentData from '../../core/componentData';
import Prefab from '../../core/prefab';
import debug from '../../player/debug';
import Property from '../../core/property';
import { animation } from '../../features/animation/animation';
import { redomDispatch, redomListen } from '../../util/redomEvents';
import { isMouseButtonDown, listenKeyDown, key, keyPressed } from '../../util/input';
import { editorGlobals } from '../editorGlobals';
import { Change, changeType, setChangeOrigin } from '../../core/change';
import Entity from '../../core/entity';
import { Component } from '../../core/component';

class AnimationModule extends Module {
	animations: animation.Animation[] = [];
	animationComponentId: string = null;
	editedEntityPrototype: EntityPrototype = null;
	animationData: animation.AnimationData = null;
	animationSelector: AnimationSelector;
	animationTimelineView: AnimationTimelineView;

	selectedFrame: number = null;
	selectedAnimation: animation.Animation = null;

	focusedKeyFrameViews: TrackFrameView[] = [];

	constructor() {
		super();

		this.addElements(
			el('div.animationModule',
				el('div',
					el('button.button', 'Add animation', { onclick: () => this.addAnimation() }),
					this.animationSelector = new AnimationSelector(),
					// el('button.button', 'Add keyframe', { onclick: () => this.addKeyframe() }),
					el('button.button.recordButton', el('i.fa.fa-circle'), 'Record key frames', {
						onclick: () => {
							// Selecting nothing will force user to select entity instead of entity prototype when editing animations.
							selectInEditor([], this);
							editorGlobals.recording = true;
							editorEventDispacher.dispatch(EditorEvent.EDITOR_REC_MODE);
						}
					}),
				),
				this.animationTimelineView = new AnimationTimelineView()
			)
		);

		this.name = 'Animation';
		this.id = 'animation';

		redomListen(this, 'frameSelected', frameNumber => {
			this.selectedFrame = frameNumber;
			// TODO: draw entity in new pose.
			let entity = this.editedEntityPrototype.previouslyCreatedEntity;
			if (entity) {
				setChangeOrigin(this);
				let animationComponent = entity.getComponents('Animation').find(comp => comp._componentId === this.animationComponentId);
				animationComponent.animator.currentAnimation.setFrame(frameNumber);
			}
		});
		redomListen(this, 'animationSelected', animation => {
			this.selectedAnimation = animation;
			this.animationTimelineView.update(this.selectedAnimation);
		});

		editorEventDispacher.listen(EditorEvent.EDITOR_CHANGE, (change: Change) => {
			if (!editorGlobals.recording)
				return;

			if (change.origin === this) {
				return;
			}

			if (change.reference.threeLetterType !== 'prp')
				return;

			if (change.type === changeType.setPropertyValue) {
				let property = change.reference as Property;

				let component = property.getParent() as Component;
				if (!component || component.threeLetterType !== 'com' || component.componentClass.componentName === 'Animation')
					return;

				let entity = component.getParent() as Entity;
				if (!entity || entity.threeLetterType !== 'ent')
					return;

				let entityPrototype = entity.prototype as EntityPrototype;
				if (!entityPrototype)
					return;

				let isChildOfEdited = !!entityPrototype.findParent('epr', (epr: EntityPrototype) => epr === this.editedEntityPrototype);
				if (!isChildOfEdited)
					return;

				setChangeOrigin(this);
				this.saveValue(entityPrototype, component._componentId, property);
			}
		});

		listenKeyDown(keyCode => {
			if (keyCode === key.backspace) {
				if (this._selected && this._enabled && !editorSelection.focused) {
					this.focusedKeyFrameViews.forEach(view => {
						delete view.trackKeyFrames[view.frame]
					});
					unfocus();
					this.updateAnimationData();
				}
			}
		});
		redomListen(this, 'selectKeyFrameView', keyFrameView => {
			if (editorSelection.focused) {
				// If something else is focused, unfocus. But we don't want to unfocus TrackFrameViews which are focused more hackily.
				unfocus();
			}

			let keyFrameList: TrackFrameView[] = Array.isArray(keyFrameView) ? keyFrameView : [keyFrameView];
			keyFrameList = keyFrameList.filter(frameView => frameView.isKeyFrame());
			let allAreSelected = !keyFrameList.find(frameView => !this.focusedKeyFrameViews.includes(frameView));

			if (keyPressed(key.shift)) {
				if (keyFrameList.length > 0) {
					if (allAreSelected) {
						for (let frameView of keyFrameList) {
							let indexOfFrame = this.focusedKeyFrameViews.indexOf(frameView);
							if (indexOfFrame >= 0) {
								this.focusedKeyFrameViews.splice(indexOfFrame, 1);
							}
							frameView.el.classList.remove('selected');
						}
					} else {
						for (let frameView of keyFrameList) {
							if (!this.focusedKeyFrameViews.includes(frameView)) {
								this.focusedKeyFrameViews.push(frameView);
							}
							frameView.el.classList.add('selected');
						}
					}
				}
			} else {
				// unfocus();

				this.animationTimelineView.el.querySelectorAll('td.trackFrame.selected').forEach(frameView => {
					frameView.classList.remove('selected');
				});

				this.focusedKeyFrameViews.length = 0;

				if (keyFrameList.length > 0) {
					this.focusedKeyFrameViews.push(...keyFrameList);
					for (let frameView of keyFrameList) {
						frameView.el.classList.add('selected');
					}
				}
			}
		});
		editorEventDispacher.listen(EditorEvent.EDITOR_UNFOCUS, () => {
			if (this.focusedKeyFrameViews.length > 0) {
				this.animationTimelineView.el.querySelectorAll('td.trackFrame.selected').forEach(frameView => {
					frameView.classList.remove('selected');
				})
				this.focusedKeyFrameViews.length = 0;
			}
		});
	}
	update() {
		if (editorGlobals.recording && this.editedEntityPrototype && this.editedEntityPrototype._alive) {
			return true;
		}

		if (editorSelection.type === 'epr' && editorSelection.items.length === 1) {
			let entityPrototype = editorSelection.items[0] as EntityPrototype;
			if (entityPrototype.hasComponentData('Animation') && entityPrototype.previouslyCreatedEntity) {
				let inheritedComponentDatas = entityPrototype.getInheritedComponentDatas((cda: ComponentData) => cda.name === 'Animation');
				if (inheritedComponentDatas.length === 1) {
					if (this.editedEntityPrototype !== entityPrototype) {
						let inheritedComponentData = inheritedComponentDatas[0];
						this.updateRaw(entityPrototype.previouslyCreatedEntity, inheritedComponentData);
					}
					return true;
				}
				return false;
			}
		}

		/*
		How about Prefab?

		Editing must be done in entities.
		How do I make sure that entityPrototypes haven't overridden stuff?
		Sounds a little troublesome to edit prefab using entities.
		Would be cool if this could be done someday.

		else if (editorSelection.type === 'pfa' && editorSelection.items.length === 1) {
			let prefab = editorSelection.items[0] as Prefab;
			let animationComponentData = entityPrototype.findChild('cda', (cda: ComponentData) => cda.name === 'Animation') as ComponentData;
		} */
		return false;
	}

	updateRaw(entity, inheritedComponentData) {
		this.editedEntityPrototype = inheritedComponentData.generatedForPrototype;
		this.animationComponentId = inheritedComponentData.componentId;
		let animationDataString = inheritedComponentData.properties.find((prop: Property) => prop.name === 'animationData').value;

		this.animationData = animation.parseAnimationData(animationDataString);

		// We are sneaky and store Animation objects in jsonable object.
		this.animationData.animations = this.animationData.animations.map(animation.Animation.create);
		this.animations = this.animationData.animations as animation.Animation[];

		this.animationSelector.update(this.animations);
		this.selectedAnimation = this.animationSelector.getSelectedAnimation();
		this.animationTimelineView.update(this.selectedAnimation);
		this.selectedFrame = this.selectedFrame || 1;
		this.animationTimelineView.selectFrame(this.selectedFrame);
	}

	addAnimation() {
		let name = prompt('name', 'idle');
		if (name) {
			setChangeOrigin(this);
			this.animations.push(new animation.Animation(name));
			this.updateAnimationData();
		}
	}

	updateAnimationData() {
		let componentData = this.editedEntityPrototype.getOwnComponentDataOrInherit(this.animationComponentId);

		// Delete empty tracks:
		for (let anim of this.animations) {
			anim.deleteEmptyTracks();
		}

		componentData.setValue('animationData', JSON.stringify(this.animationData));
		this.animationTimelineView.update(this.selectedAnimation);

		// Reload entity Animator:
		this.editedEntityPrototype.previouslyCreatedEntity.getComponents('Animation').forEach(comp => {
			comp.animationData = componentData.getValue('animationData');
		});
	}

	saveValue(entityPrototype: EntityPrototype, componendId: string, property: Property) {
		this.selectedAnimation.saveValue(entityPrototype.id, componendId, property.name, this.selectedFrame, property.propertyType.type.toJSON(property._value));
		this.updateAnimationData();
	}

	free() {

	}
}
Module.register(AnimationModule, 'bottom');

class AnimationSelector implements RedomElement {
	el: HTMLSelectElement;
	list: List;
	animations: animation.Animation[];
	constructor() {
		this.el = el('select.animationSelector', {
			onchange: () => redomDispatch(this, 'animationSelected', this.getSelectedAnimation())
		}) as HTMLSelectElement;
		this.list = list(this.el, AnimationSelectorOption, (key => key) as any);
	}
	update(animations: animation.Animation[]) {
		this.animations = animations;
		this.list.update(animations.map(anim => anim.name));
	}
	getSelectedAnimation() {
		return this.animations.find(anim => anim.name === this.el.value);
	}
}
class AnimationSelectorOption implements RedomElement {
	el: HTMLElement;
	constructor() {
		this.el = el('option');
	}
	update(name) {
		this.el.setAttribute('value', name);
		this.el.innerText = name;
	}
}
class AnimationTimelineView implements RedomElement {
	el: HTMLElement;
	frameNumbers: List;
	trackList: List;
	constructor() {
		this.el = el('table.animationTimeline',
			el('thead',
				this.frameNumbers = list('tr', FrameNumberHeader, 'frame')
			),
			this.trackList = list('tbody', TrackView)
		);

		redomListen(this, 'selectAllOnFrame', frame => {
			let views = [];
			this.trackList.views.forEach((trackView: TrackView) => {
				trackView.list.views.forEach((frameView: TrackFrameView) => {
					if (frameView.frame === frame) {
						views.push(frameView);
					}
				})
			});
			redomDispatch(this, 'selectKeyFrameView', views);
		});
	}
	update(animation: animation.Animation) {
		if (!animation) {
			this.frameNumbers.update([]);
			this.trackList.update([]);
			return;
		}

		let frameCount = 24;
		let frameNumbers = [];
		let cellWidth = (80 / frameCount).toFixed(2) + '%';
		for (let frame = 0; frame <= frameCount; frame++) {
			frameNumbers.push({
				frame,
				cellWidth: frame === 0 ? 'auto' : cellWidth
			});
		}

		this.frameNumbers.update(frameNumbers);

		let trackUpdateData = animation.tracks.map(track => {
			return {
				name: track.prpName,
				keyFrames: track.keyFrames,
				frameCount
			};
		})

		this.trackList.update(trackUpdateData);
	}
	selectFrame(frame) {
		let views = (this.frameNumbers as any).views as FrameNumberHeader[];
		for (let view of views) {
			if (view.frameNumber === frame) {
				view.select();
				break;
			}
		}
	}
}
class FrameNumberHeader implements RedomElement {
	el: HTMLElement;
	frameNumber: number;
	constructor() {
		this.el = el('th.frameHeader', {
			onmousedown: () => this.select(),
			onmouseover: () => isMouseButtonDown() && this.select(),
			ondblclick: () => redomDispatch(this, 'selectAllOnFrame', this.frameNumber)
		});
	}
	update(data) {
		this.el.style.width = data.cellWidth;
		this.frameNumber = data.frame;
		this.el.textContent = data.frame || '';
	}
	select() {
		if (this.frameNumber === 0) return;

		let selectedFrameElement = this.el.parentElement.querySelector('.selected');
		if (selectedFrameElement) {
			selectedFrameElement.classList.remove('selected');
		}
		this.el.classList.add('selected');
		redomDispatch(this, 'frameSelected', this.frameNumber);
	}
}
class TrackView implements RedomElement {
	el: HTMLElement;
	list: List;
	constructor() {
		this.el = el('tr.track');
		this.list = list(this.el, TrackFrameView)

		redomListen(this, 'selectKeyFramesInTrack', () => {
			let keyFrameViews = this.list.views.filter((view: TrackFrameView) => view.isKeyFrame());
			redomDispatch(this, 'selectKeyFrameView', keyFrameViews);
		});
	}
	update(trackData) {
		let keyFrames = trackData.keyFrames;
		let trackFrameData = [];
		trackFrameData.push({
			frame: 0,
			name: trackData.name,
			keyFrames
		});
		for (let frame = 1; frame <= trackData.frameCount; frame++) {
			let keyFrame = keyFrames[frame];
			trackFrameData.push({
				frame,
				keyFrames,
				keyFrame
			});

		}

		this.list.update(trackFrameData);
	}
}
class TrackFrameView implements RedomElement {
	el: HTMLElement;
	icon: HTMLElement;
	trackKeyFrames: { [frame: number]: any };
	frame: number;
	constructor() {
		this.el = el('td.trackFrame', {
			onclick: () => {
				if (this.frame === 0) {
					return;
				}
				redomDispatch(this, 'selectKeyFrameView', this);
			},
			ondblclick: () => {
				if (this.frame === 0) {
					redomDispatch(this, 'selectKeyFramesInTrack');
				}
			}
		});
	}
	isKeyFrame() {
		return this.trackKeyFrames[this.frame] != null;
	}
	update(data) {
		this.frame = data.frame;
		this.trackKeyFrames = data.keyFrames;

		this.el.innerHTML = '';
		if (this.frame === 0) {
			this.el.textContent = data.name;
		} else {
			if (this.isKeyFrame()) {
				mount(this, el('i.fa.fa-star'));
			}
		}
	}
}


/*
class AnimationFrameView implements RedomElement {
	el: HTMLElement;
	frameNumber: number;
	frameNumberText: Text;
	keyFrameContainer: HTMLElement;
	constructor(public parent?: AnimationTimelineView) {
		this.el = el('div.animationFrame',
			this.frameNumberText = text(''),
			this.keyFrameContainer = el('div.keyFrameContainer'),
			{
				onmousedown: () => this.select(),
				onmouseover: () => isMouseButtonDown() && this.select()
			}
		);
	}
	select() {
		let selectedFrameElement = this.el.parentElement.querySelector('.selected');
		if (selectedFrameElement) {
			selectedFrameElement.classList.remove('selected');
		}
		this.el.classList.add('selected');
		redomDispatch(this, 'frameSelected', this.frameNumber);
	}
	update(data) {
		this.frameNumber = data.frame;
		this.frameNumberText.textContent = data.frame;
		if (data.keyFrame) {
			this.keyFrameContainer.textContent = 'KEY';
		} else {
			this.keyFrameContainer.textContent = '';
		}
	}
}
*/
