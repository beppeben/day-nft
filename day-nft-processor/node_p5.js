const p5 = require('node-p5');
var fs = require('fs');
var args = process.argv.slice(2);
var sketch_path = args[0]
var date = args[1]
var message = args[2]
var out_path = args[3]
eval(fs.readFileSync(sketch_path + 'sketch.js')+'');
p5.createSketch(sketchWithParams(date, message, 600, sketch_path, out_path));
setTimeout(function() {
    process.exit();
}, 3000);



