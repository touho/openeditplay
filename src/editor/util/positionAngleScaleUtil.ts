import Vector from "../../util/vector";
import ComponentData from "../../core/componentData";
import assert from "../../util/assert";
import Property from "../../core/property";
import PIXI from "../../features/graphics";

export class PositionAngleScale {

    // PIXI Container
    container: any = new PIXI.Container();

    child: PositionAngleScale = null;
    parent: PositionAngleScale = null;

    constructor(public position: Vector = new Vector(0, 0), public angle: number = 0, public scale: Vector = new Vector(1, 1)) {
        this.container.position.set(position.x, position.y);
        this.container.rotation = angle;
        this.container.scale.set(scale.x, scale.y);
    }

    addChild(pas: PositionAngleScale) {
        this.child = pas;
        pas.parent = this;
        this.container.addChild(pas.container);
    }

    static fromTransformComponentData(fromTransformComponentData: ComponentData) {
        assert(fromTransformComponentData.name === 'Transform', 'fromTransformComponentData must take Transform ComponentData');

        let map: any = {};
        fromTransformComponentData.forEachChild('prp', (prp: Property) => {
            map[prp.name] = prp.value;
        });

        assert(map['position'], 'position is missing');
        assert(!isNaN(map['angle']), 'angle is missing');
        assert(map['scale'], 'scale is missing');

        return new PositionAngleScale(map['position'].clone(), map['angle'], map['scale'].clone());
    }

    static getLeafDelta(from: PositionAngleScale, to: PositionAngleScale) {
        // First go to root
        while (from.parent) from = from.parent;
        while (to.parent) to = to.parent;

        // We are at root. Let travel to leaf and calculate angle and scale

        let fromAngle = from.angle;
        let toAngle = to.angle;

        let fromScale = from.scale;
        let toScale = to.scale;

        while (from.child) {
            from = from.child;
            fromAngle += from.angle;
            fromScale.multiply(from.scale);
        }
        while (to.child) {
            to = to.child;
            toAngle += to.angle;
            toScale.multiply(to.scale);
        }

        // We are at leaf.

        // Get delta angle and scale.

        let deltaScale = fromScale.divide(toScale);
        let deltaAngle = (fromAngle - toAngle + Math.PI * 2) % (Math.PI * 2);

        // Now we shall calculate the delta position using PIXI Container Matrix.

        let deltaPosition = Vector.fromObject(to.container.toLocal(new PIXI.Point(), from.container));

        return new PositionAngleScale(deltaPosition, deltaAngle, deltaScale);
    }
}
