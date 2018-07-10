// @flow

class Moi {
    hei: number;
    constructor() {
        this.hei = 4;
    }
}

function getLength(one: number, two) {
    if (typeof two === 'number')
        return one * two;
    else
        return null;
}

getLength(4, 5);
let mo = new Moi();

getLength(4, "jea");