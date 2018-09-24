// Animation clashes with typescript lib "DOM" (lib.dom.d.ts). Therefore we have namespace.
export namespace animation {

    // Changing this will break games
    export const DEFAULT_FRAME_COUNT = 24;
    export const DEFAULT_FRAME_RATE = 24;
    export const MAX_FRAME_COUNT = 100;
    export const MAX_FRAME_RATE = 100;

    export type AnimationData = {
        animations: AnimationDataAnimation[];
    };
    export type AnimationDataAnimation = {
        name: string;
        tracks: AnimationDataTrack[];
        frames?: number; // If falsy, use DEFAULT_FRAME_COUNT
        fps?: number; // If falsy, use DEFAULT_FRAME_RATE
    };
    export type AnimationDataTrack = {
        path: string;
        cId: string;
        prpName: string;
        keyFrames: { [frame: number]: any }
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
        // If frames is falsy, use DEFAULT_FRAME_COUNT
        constructor(
            public name: string,
            public tracks: Track[] = [],
            public frames: number = undefined,
            public fps: number = undefined
        ) {}

        /**
         *
         * @param entityPrototypeId
         * @param componendId
         * @param value jsoned property value
         */
        saveValue(path: string, componendId: string, propertyName: string, frameNumber: number, value: any) {
            let track = this.tracks.find(track => track.cId === componendId && track.path === path && track.prpName === propertyName);
            if (!track) {
                track = new Track(path, componendId, propertyName);
                this.tracks.push(track);
            }
            track.saveValue(frameNumber, value);
        }

        getKeyFrames(path: string, componendId: string, propertyName: string) {
            let track = this.tracks.find(track => track.cId === componendId && track.path === path && track.prpName === propertyName);
            if (track) {
                return track.keyFrames;
            } else {
                return null;
            }
        }

        deleteEmptyTracks() {
            for (let i = this.tracks.length - 1; i >= 0; i--) {
                if (Object.keys(this.tracks[i].keyFrames).length === 0) {
                    this.tracks.splice(i, 1);
                }
            }
        }

        deleteOutOfBoundsKeyFrames() {
            let frameCount = this.frames || DEFAULT_FRAME_COUNT;
            for (const track of this.tracks) {
                let keyFrameKeys = Object.keys(track.keyFrames);
                for (const keyFrameKey of keyFrameKeys) {
                    if (+keyFrameKey > frameCount) {
                        delete track.keyFrames[keyFrameKey];
                    }
                }
            }
        }

        getHighestKeyFrame() {
            let highestKeyFrame = 0;
            for (const track of this.tracks) {
                let keyFrameKeys = Object.keys(track.keyFrames);
                for (const keyFrameKey of keyFrameKeys) {
                    if (+keyFrameKey > highestKeyFrame) {
                        highestKeyFrame = +keyFrameKey;
                    }
                }
            }
            return highestKeyFrame;
        }

        static create(json)  {
            let tracks = (json.tracks || []).map(Track.create);
            return new Animation(json.name, tracks, json.frames, json.fps);
        }
    }

    export class Track {
        constructor(public path: string, public cId: string, public prpName: string, public keyFrames: { [frame: number]: any } = {}) {
        }

        saveValue(frameNumber: number, value) {
            this.keyFrames[frameNumber] = value;
        }

        static create(json) {
            let keyFrames = json.keyFrames || {};
            return new Track(json.path, json.cId, json.prpName, keyFrames);
        }
    }
}
