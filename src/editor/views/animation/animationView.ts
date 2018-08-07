import { RedomElement, el, mount } from 'redom';
import Serializable from '../../../core/serializable';

export default class AnimationView implements RedomElement {
    el: HTMLElement;
    constructor(serializable: Serializable) {
        this.el = el('div.fullView.animationView',
            el('div.exitButton', 'X', { onclick: () => this.close() })
        );
    }
    close() {
        let editorLayout = document.querySelector('div.editorLayout');
        this.el.parentNode.removeChild(this.el);
        editorLayout.classList.remove('fullViewMode');
    }

    static open(serializable: Serializable) {
        let editorLayout = document.querySelector('div.editorLayout');
        editorLayout.classList.add('fullViewMode');
        mount(editorLayout, new AnimationView(serializable));
    }
}
