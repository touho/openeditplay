global.TARGET_NONE = true;
const autobuild = require('./autobuild');
const kexec = require('kexec');

autobuild.autobuildJs(`src/testMain.js`, `builds/openeditplay.test.js`, {
	format: 'cjs',
	externalDependencies: ['assert']
});

autobuild.watch(`builds/openeditplay.test.js`, () => {
	kexec('node', [ `${autobuild.ROOT}/builds/openeditplay.test.js` ]);
});
