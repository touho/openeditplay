// Animation clashes with typescript lib "DOM" (lib.dom.d.ts). Therefore we have namespace.
export namespace animation {
    export class Animation {
        constructor(public name: string, public tracks: Track[] = []) {

        }

        /**
         *
         * @param entityPrototypeId
         * @param componendId
         * @param value jsoned property value
         */
        saveValue(entityPrototypeId: string, componendId: string, propertyName: string, frameNumber: number, value: any) {
            let track = this.tracks.find(track=> track.cId === componendId && track.eprId === entityPrototypeId && track.prpName === propertyName);
            if (!track) {
                track = new Track(entityPrototypeId, componendId, propertyName);
                this.tracks.push(track);
            }
            track.saveValue(frameNumber, value);
        }

        static create(json) {
            let tracks = (json.tracks || []).map(Track.create);
            return new Animation(json.name, tracks);
        }
    }

    export class Track {
        constructor(public eprId: string, public cId: string, public prpName: string, public keyFrames: { [frame: number]: any } = {}) {
        }

        saveValue(frameNumber: number, value) {
            this.keyFrames[frameNumber] = value;
        }

        static create(json) {
            let keyFrames = json.keyFrames || {};
            return new Track(json.eprId, json.cId, json.prpName, keyFrames);
        }
    }
}
