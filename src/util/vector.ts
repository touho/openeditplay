export default class Vector {
	x: number;
	y: number;
	constructor(x: number, y: number) {
		this.x = x || 0;
		this.y = y || 0;
	}
	add(vec: Vector) {
		this.x += vec.x;
		this.y += vec.y;
		return this;
	}
	addScalars(x: number, y: number) {
		this.x += x;
		this.y += y;
		return this;
	}
	subtract(vec: Vector) {
		this.x -= vec.x;
		this.y -= vec.y;
		return this;
	}
	subtractScalars(x: number, y: number) {
		this.x -= x;
		this.y -= y;
		return this;
	}
	multiply(vec: Vector) {
		this.x *= vec.x;
		this.y *= vec.y;
		return this;
	}
	multiplyScalar(scalar: number) {
		this.x *= scalar;
		this.y *= scalar;
		return this;
	}
	divide(vec: Vector) {
		this.x /= vec.x;
		this.y /= vec.y;
		return this;
	}
	divideScalar(scalar: number) {
		this.x /= scalar;
		this.y /= scalar;
		return this;
	}
	dot(vec: Vector) {
		return this.x * vec.x + this.y * vec.y;
	}
	length(): number {
		return Math.sqrt(this.x * this.x + this.y * this.y);
	}
	lengthSq(): number {
		return this.x * this.x + this.y * this.y;
	}
	setLength(newLength: number) {
		let oldLength = this.length();

		if (oldLength === 0) {
			this.x = newLength;
			this.y = 0;
		} else {
			this.multiplyScalar(newLength / oldLength);
		}
		return this;
	}
	getProjectionOn(vec: Vector) {
		let length = vec.length();
		if (length === 0)
			return this.clone();
		else
			return vec.clone().multiplyScalar(this.dot(vec) / (length * length));
	}
	distance(vec: Vector) {
		let dx = this.x - vec.x,
			dy = this.y - vec.y;
		return Math.sqrt(dx * dx + dy * dy);
	}
	distanceSq(vec: Vector) {
		let dx = this.x - vec.x,
			dy = this.y - vec.y;
		return dx * dx + dy * dy;
	}
	// returns -pi .. pi
	angleTo(vec: Vector) {
		let lengthPart = this.length() * vec.length();
		if (lengthPart > 0) {
			return Math.acos(this.dot(vec) / lengthPart);
		} else {
			return 0;
		}
	}
	// returns 0 .. pi / 2
	closestAngleTo(vec: Vector) {
		let angle = Math.abs(this.angleTo(vec));
		if (angle > Math.PI * 0.5) {
			return Math.abs(Math.PI - angle);
		} else {
			return angle;
		}
	}
	normalize() {
		return this.setLength(1);
	}
	horizontalAngle() {
		return Math.atan2(this.y, this.x);
	}
	verticalAngle() {
		return Math.atan2(this.x, this.y);
	}
	rotate(angle: number) {
		let x = this.x * Math.cos(angle) - this.y * Math.sin(angle);
		this.y = this.x * Math.sin(angle) + this.y * Math.cos(angle);
		this.x = x;

		return this;
	}
	rotateTo(angle: number) {
		return this.rotate(angle - this.verticalAngle());
	}
	isEqualTo(vec: Vector) {
		return this.x === vec.x && this.y === vec.y;
	}
	isZero(): boolean {
		return !this.x && !this.y;
	}
	clone(): Vector {
		return new Vector(this.x, this.y);
	}
	set(vec: Vector) {
		this.x = vec.x;
		this.y = vec.y;
		return this;
	}
	setScalars(x: number, y: number) {
		this.x = x;
		this.y = y;
		return this;
	}
	toString(): string {
		return `[${this.x}, ${this.y}]`;
	}
	toArray(): Array<number> {
		return [this.x, this.y];
	}
	interpolateLinear(other: Vector, t: number): Vector {
		return new Vector(this.x + (other.x - this.x) * t, this.y + (other.y - this.y) * t);
	}
	interpolateCubic(other: Vector, control1: Vector, control2: Vector, t: number): Vector {
		let t2 = 1 - t;
		return new Vector(
			t2 ** 3 * this.x +
			3 * t2 * t2 * t * control1.x +
			3 * t2 * t * t * control2.x +
			t ** 3 * other.x,
			t2 ** 3 * this.y +
			3 * t2 * t2 * t * control1.y +
			3 * t2 * t * t * control2.y +
			t ** 3 * other.y);
	}

	static fromObject(obj: { x: number, y: number }) {
		return new Vector(obj.x, obj.y);
	};
	static fromArray(obj) {
		return new Vector(obj[0], obj[1]);
	};
}
