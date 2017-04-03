global.TARGET_NONE = true;
const autobuild = require('./autobuild');
const kexec = require('kexec');

autobuild.autobuildJs(`src/testMain.js`, `dist/explore.test.js`, {
	format: 'cjs',
	externalDependencies: ['assert']
});

autobuild.watch(`dist/explore.test.js`, () => {
	kexec('node', [ `${autobuild.ROOT}/dist/explore.test.js` ]);
});
