export default class Vector {
	constructor(x, y) {
		this.x = x || 0;
		this.y = y || 0;
	}
	add(vec) {
		this.x += vec.x;
		this.y += vec.y;
		return this;
	}
	subtract(vec) {
		this.x -= vec.x;
		this.y -= vec.y;
		return this;
	}
	multiply(vec) {
		this.x *= vec.x;
		this.y *= vec.y;
		return this;
	}
	multiplyScalar(scalar) {
		this.x *= scalar;
		this.y *= scalar;
		return this;
	}
	divide(vec) {
		this.x /= vec.x;
		this.y /= vec.y;
		return this;
	}
	divideScalar(scalar) {
		this.x /= scalar;
		this.y /= scalar;
		return this;
	}
	length() {
		return Math.sqrt(this.x * this.x + this.y * this.y);
	}
	lengthSq() {
		return this.x * this.x + this.y * this.y;
	}
	distance(vec) {
		let dx = this.x - vec.x,
			dy = this.y - vec.y;
		return Math.sqrt(dx * dx + dy * dy);		
	}
	distanceSq(vec) {
		let dx = this.x - vec.x,
			dy = this.y - vec.y;
		return dx * dx + dy * dy;
	}
	normalize() {
		let length = this.length();
	
		if (length === 0) {
			this.x = 1;
			this.y = 0;
		} else {
			this.divideScalar(length);
		}
		return this;
	}
	horizontalAngle() {
		return Math.atan2(this.y, this.x);
	}
	verticalAngle() {
		return Math.atan2(this.x, this.y);
	}
	rotate(angle) {
		let nx = (this.x * Math.cos(angle)) - (this.y * Math.sin(angle));
		let ny = (this.x * Math.sin(angle)) + (this.y * Math.cos(angle));

		this.x = nx;
		this.y = ny;

		return this;
	}
	rotateTo(rotation) {
		return this.rotate(rotation-this.verticalAngle());
	}
	isEqualTo(vec) {
		return this.x === vec.x && this.y === vec.y;
	}
	clone() {
		return new Vector(this.x, this.y);
	}
	toString() {
		return `[${this.x}, ${this.y}]`;
	}
}
Vector.fromObject = function(obj) {
	return new Vector(obj.x, obj.y);
};
