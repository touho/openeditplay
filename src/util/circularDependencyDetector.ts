import assert from "./assert";

const SAVE_STACK_TRACE = false;

export class CircularDependencyDetector {
    currentType: string = null;
    chain: any[] = [];
    timeout: any = null;

    enter(type, data = null) {
        this.chain.push({
            type,
            data,
            stack: SAVE_STACK_TRACE ? (new Error()).stack : null
        });
        if (type !== this.currentType) {
            if (this.chain.find((link, i) => link.type === type && i !== this.chain.length - 1)) {
                console.warn('Change event circular dependency');
                console.log('################################');
                for (const part of this.chain) {
                    console.warn(`%c${part.type}`, 'font-weight: bold; font-size: 16px');
                    if (part.data && typeof part.data === 'object') {
                        for (const key in part.data) {
                            if (part.data[key] != null)
                                console.warn(key + ':', part.data[key]);
                        }
                    } else {
                        console.warn(part.data);
                    }
                    console.warn(part.stack || 'Turn SAVE_STACK_TRACE on to see stack traces. It will slow down the engine.');
                    console.log('--------------------------------------');
                }
                assert(false, 'Change event circular dependency');
            }
            this.currentType = type;
            if (!this.timeout) {
                this.timeout = setTimeout(() => this.reset(), 0);
            }
        }
    }
    leave(type) {
        if (this.chain.length > 0 && this.chain[this.chain.length - 1].type === type) {
            this.chain.pop();
            this.currentType = this.chain.length > 0 ? this.chain[this.chain.length - 1].type : null;
        }
    }
    reset() {
        this.currentType = null;
        this.chain.length = 0;
        this.timeout = null;
    }
}

function test() {
    let c = new CircularDependencyDetector();
    c.enter('a');
    c.enter('a');
    c.enter('b');
    c.enter('b');
    c.leave('b');
    c.leave('b');
    c.enter('a');
}

test();
