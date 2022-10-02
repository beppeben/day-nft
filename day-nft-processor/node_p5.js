const p5 = require('node-p5');
var fs = require('fs');
var args = process.argv.slice(2);
var sketch_path = args[0]
var date = args[1]
var message = args[2]
var out_path = args[3]
eval(fs.readFileSync(sketch_path + 'sketch.js')+'');
let resourcesToPreload = {
  flow_logo: p5.loadImage(sketch_path + 'flow_pixel.png'),
  stick_img: p5.loadImage(sketch_path + 'piggo_cut.png')
}
p5.createSketch(sketchWithParams(date, message, 600, sketch_path, out_path), resourcesToPreload);
setTimeout(function() {
    process.exit();
}, 3000);



