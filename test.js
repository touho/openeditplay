global.TARGET_NONE = true;
const autobuild = require('./autobuild');
const kexec = require('kexec');

autobuild.autobuildJs(`src/testMain.js`, `builds/explore.test.js`, {
	format: 'cjs',
	externalDependencies: ['assert']
});

autobuild.watch(`builds/explore.test.js`, () => {
	kexec('node', [ `${autobuild.ROOT}/builds/explore.test.js` ]);
});
