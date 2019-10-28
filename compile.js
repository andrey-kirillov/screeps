var fs = require('fs');
var path = require('path');
// In newer Node.js versions where process is already global this isn't necessary.
var process = require("process");

var src = './src';
var dest = "./dist";
var final = 'C:/Users/Devblazer/AppData/Local/Screeps/scripts/127_0_0_1___21025/default';

var rmDir = function(dirPath, removeSelf) {
	if (removeSelf === undefined)
		removeSelf = true;
	try { var files = fs.readdirSync(dirPath); }
	catch(e) { return; }
	if (files.length > 0)
		for (var i = 0; i < files.length; i++) {
			var filePath = dirPath + '/' + files[i];
			if (fs.statSync(filePath).isFile())
				fs.unlinkSync(filePath);
			else
				rmDir(filePath);
		}
	if (removeSelf)
		fs.rmdirSync(dirPath);
};
//rmDir(dest, false);
rmDir(final, false);

processDir([]);

function processDir(dirs) {
	var _path = src + (dirs.length?'/':'') + dirs.join('/');
	var files = fs.readdirSync(_path);
	files.filter(file=>{
		return !file.match(/\.test\.js$/);
	}).forEach(function (file) {
		var filePath = _path + '/' + file;

		if(fs.lstatSync(filePath).isDirectory())
			processDir([...dirs, file]);
		else {
			var content=fs.readFileSync(filePath, "utf8");
			content = content.replace(/require\(['"]([^'"]+)['"]\)/g,(m,i,o)=>{
				let reqPath = i.replace(/^\/|^\.\//, '');
				reqPath = reqPath.replace(/\/$|\.js$/, '').split('/');
				let newDirs = [...dirs];
				reqPath.forEach(folder=>{
					if (folder=='..')
						newDirs.pop();
					else
						newDirs.push(folder);
				});

				return "require('"+newDirs.join('_')+"')";
			});
			//fs.writeFileSync(dest + '/' + dirs.join('_') + (dirs.length?'_':'') + file, content);
			fs.writeFileSync(final + '/' + dirs.join('_') + (dirs.length?'_':'') + file, content);
		}
	});
}
