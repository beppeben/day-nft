const p5 = require('node-p5');
var fs = require('fs');
var args = process.argv.slice(2);
var sketch_path = args[0]
var date = args[1]
var message = args[2]
var out_path = args[3]
eval(fs.readFileSync(sketch_path + 'sketch.js')+'');

let resourcesToPreload = {
  box1: p5.loadImage(sketch_path + 'flovatar/box1.png'),
  box2: p5.loadImage(sketch_path + 'flovatar/box2.png'),
  box3: p5.loadImage(sketch_path + 'flovatar/box3.png'),
  box4: p5.loadImage(sketch_path + 'flovatar/box4.png'),
  box5: p5.loadImage(sketch_path + 'flovatar/box5.png'),
  ibox1: p5.loadImage(sketch_path + 'flovatar/ibox1.png'),
  ibox2: p5.loadImage(sketch_path + 'flovatar/ibox2.png'),
  ibox3: p5.loadImage(sketch_path + 'flovatar/ibox3.png'),
  ibox4: p5.loadImage(sketch_path + 'flovatar/ibox4.png'),
  ibox5: p5.loadImage(sketch_path + 'flovatar/ibox5.png'),
  globe: p5.loadImage(sketch_path + 'flovatar/globe.png'),
  flova1: p5.loadImage(sketch_path + 'flovatar/flova1.png'),
  flova2: p5.loadImage(sketch_path + 'flovatar/flova2.png'),
  flova3: p5.loadImage(sketch_path + 'flovatar/flova3.png'),
  weapon1: p5.loadImage(sketch_path + 'flovatar/weapon1.png'),
  weapon2: p5.loadImage(sketch_path + 'flovatar/weapon2.png')
}

p5.createSketch(sketchWithParams(date, message, 600, sketch_path, out_path), resourcesToPreload);
setTimeout(function() {
    process.exit();
}, 3000);



