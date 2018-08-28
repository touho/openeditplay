// Animation clashes with typescript lib "DOM" (lib.dom.d.ts). Therefore we have namespace.
export namespace animation {

    export type AnimationData = {
        animations: AnimationDataAnimation[];
    };
    export type AnimationDataTrack = {
        eprId: string;
        cId: string;
        prpName: string;
        keyFrames: { [frame: number]: any }
    };
    export type AnimationDataAnimation = {
        name: string;
        tracks: AnimationDataTrack[];
    };

    // export function parseAnimationData

    /**
     * @param animationDataString data from Animation component
     */
    export function parseAnimationData(animationDataString) {
        let animationData;
        try {
			animationData = JSON.parse(animationDataString);
		} catch (e) {
			animationData = {};
        }

        animationData.animations = animationData.animations || [];
        return animationData as AnimationData;
    }

    /**
     * Helper class for editor. Just JSON.stringify this to get valid animationData animation out.
     */
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

        deleteEmptyTracks() {
            for (let i = this.tracks.length - 1; i >= 0; i--) {
                if (Object.keys(this.tracks[i].keyFrames).length === 0) {
                    this.tracks.splice(i, 1);
                }
            }
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
