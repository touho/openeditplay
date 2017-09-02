let N = 5000000;

let order = 0;
function Test() {
	this.x = 1;
	this.y = 2;
	this.z = 3;
	this.total = 0;
	this.order = order++;
}

let array1 = [];
for (let i = 0; i < N; i++) {
	array1.push(new Test());
}

let array2 = [];
for (let i = 0; i < N; i++) {
	array2.push(new Test());
}
shuffle(array2);


function check(array) {
	let value = 0;
	let start = performance.now();
	for (let i = 0; i < array.length; i++) {
		let test = array[i];
		test.total = test.x + test.y + test.z;
		value += test.total;
	}
	console.log('took:', performance.now() - start);
	return value;
}

/**
 * Shuffles array in place.
 * @param {Array} a items The array containing the items.
 */
function shuffle(a) {
	var j, x, i;
	for (i = a.length; i; i--) {
		j = Math.floor(Math.random() * i);
		x = a[i - 1];
		a[i - 1] = a[j];
		a[j] = x;
	}
}

console.log(check(array2));
console.log(check(array1));
console.log(check(array2));
array2.sort((a, b) => {
	if (a.order < b.order)
		return -1;
	else
		return 1;
});
console.log(check(array2));


	

///////////

N = 5000000;

order = 0;
function Test() {
	this.x = 1;
	this.y = 2;
	this.z = 3;
	this.total = 0;
	this.order = order++;
}

array1 = [];
for (let i = 0; i < N; i++) {
	array1.push(new Test());
}

st = performance.now();
for (let i = 0; i < array1.length; i++) {
}
console.log(performance.now() - st);

st = performance.now();
for (let i = 0; i < N; i++) {
}
console.log(performance.now() - st);

st = performance.now();
for (let i = N - 1; i >= 0; i--) {
}
console.log(performance.now() - st);
