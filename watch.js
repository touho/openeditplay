const cp = require('child_process')
const chokidar = require('chokidar')

const exec = (cmd, args) => {
	return () => {
		let child = cp.spawn(cmd, args)

		child.stdout.pipe(process.stdout)
		child.stderr.pipe(process.stderr)
	}
}

const buildJs = exec('npm', ['run', 'build-dev'])
const buildScss = exec('npm', ['run', 'build-editor-scss'])

buildJs()
buildScss()

chokidar.watch('src/**/*.js')
.on('change', buildJs)
.on('unlink', buildJs)

chokidar.watch('src/**/*.scss')
.on('change', buildScss)
.on('unlink', buildScss)
