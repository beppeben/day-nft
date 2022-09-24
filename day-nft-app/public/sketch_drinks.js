var sketchWithParams = function(date, message, n_pixels, font_path, out_path) {

  function xmur3(str) {
    for(var i = 0, h = 1779033703 ^ str.length; i < str.length; i++) {
        h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
        h = h << 13 | h >>> 19;
    } return function() {
        h = Math.imul(h ^ (h >>> 16), 2246822507);
        h = Math.imul(h ^ (h >>> 13), 3266489909);
        return (h ^= h >>> 16) >>> 0;
    }
  }

  function mulberry32(a) {
    return function() {
      var t = a += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
  }

  message = message.replaceAll("\\\\n", "\\n")
  let seed = xmur3(date.concat(message));
  let rand = mulberry32(seed());
  let flow_logo;
  let stick_img;
    
  let font_out = null;
  try {
    font_out = p5.loadFont(font_path + 'silkscreen.ttf');
  } catch (err) {}
  
  
  let sketch = function(p, preloaded) {
    var grid = [];
    const rows = 100;
    let font;
      
    p.preload = function() {
      flow_logo = p.loadImage('flow_pixel.png')
      stick_img = p.loadImage('piggo_cut.png')
      font = p.loadFont('silkscreen.ttf')
    }
    
    p.setup = function() {
      
      if (font_out != null) {
        flow_logo = preloaded.flow_logo
        stick_img = preloaded.stick_img
      }
      
      let c = p.createCanvas(n_pixels, n_pixels);
      
      for (let i = 0; i < rows; i++) {
        grid[i] = new Array(rows).fill(0)
      }
      renderBoard();
      
      if (font_out != null) {
        p.textFont(font_out);
      } else {
        p.textFont(font);
      }
      
      p.textSize(0.05 * n_pixels);
      p.textAlign(p.CENTER, p.CENTER);

      p.fill(0)
      p.text(date, 0.25 * n_pixels, 0.07 * n_pixels)
      p.text("DAY-NFT.IO", 0.7625 * n_pixels, 0.07 * n_pixels)

      message = message.replaceAll("\\n", "\n")
      p.text(message, 0.5 * n_pixels, 0.9 * n_pixels)

      if (font_out != null) {
        p.saveCanvas(c, out_path, 'png');
      }
    }

    function fill(x, y, grid) {
      if(grid[x][y] > 0) {
        return
      }
      s = []
      s.push([x, y])
      while(s.length > 0) {
        pair = s.pop()
        x = pair[0]
        y = pair[1]
        var lx = x
        while(lx > 0 && grid[lx - 1][y] == 0) {
          grid[lx - 1][y] = 2
          lx = lx - 1
        }
        while(x < rows && grid[x][y] == 0) {
          grid[x][y] = 2
          x = x + 1
        }    
        scan(lx, x - 1, y + 1, s, grid)
        scan(lx, x - 1, y - 1, s, grid)
      }        
    }

    function scan(lx, rx, y, s, grid) {
      var added = false
      for(var x = lx; x <= rx; x++) {
        if(grid[x][y] > 0) {
          added = false
        }
        else if (!added) {
          s.push([x, y])
          added = true
        }  
      }        
    }
    
    function getFillCount() {
      var fillCount = 0
      for (let x = 0; x < rows; x++) {
        for (let y = 0; y < rows; y++) {
          if(grid[x][y] > 0){
            fillCount ++;
          }
        }
      }
      return fillCount
    }
    
    function drawLine(m, b, len, xs, ys, vs, start, end, invert, color=1, ran=false) {
      for (var i = 0; i < 2*len; i += 1) {
        var x = i - len
        if (x < start || x > end) continue;
        y = m * x + b
        if (ran) {
          y = y + (rand() - 0.5) * len * 0.05
        }
        if (invert) {
          xs.push(y)
          ys.push(x)
        } else {
          xs.push(x)
          ys.push(y)
        }
        vs.push(color)    
      } 
    }
    
    function drawStick(attach_point, level, intersection, len, xs, ys, vs) {
      var stick_top = null
      if(attach_point + level > 20 && rand() > 0.6) {    
        var m = (2 + 3 * rand()) * (rand() > 0.5 ? +1 : -1)
        var b = Math.min(m, -m) * intersection * 0.7 + attach_point + level + (2 * Math.abs(m) * intersection * 0.7) * rand()
        var x1 = (attach_point * 0.7 - b) / (m - level / intersection)
        var x2 = (attach_point * 0.7 - b) / (m + level / intersection)
        var x1o = Math.min(x1, x2)
        var x2o = Math.max(x1, x2)  
        var intersection2 = (attach_point + level - b) / m
        var lim1 = -len
        var lim2 = len
        if (m < 0) {
            lim2 = (x1o > intersection2? x1o : x2o)
        } else {
            lim1 = (x2o < intersection2? x2o : x1o)
        }
        drawLine(m, b, len, xs, ys, vs, lim1, lim2, false, 4);
        stick_top = (len - b)/m
      }
      return [stick_top, m]
    }

    function drawCurvedDrink(len, xs, ys, vs) {
      //var attach_point = -len/(rand() * 6 + 1)
      var attach_point = -len/5 + (-len + len/5) * rand()
      //var angle = 3
      var base_len = len/(rand() * 6 + 1)
      var level = rand() * (len - attach_point)
    
      // draw base
      drawLine(0, -len, len, xs, ys, vs, -base_len, base_len, false);
      // draw body
      drawLine(0, 0, len, xs, ys, vs, -len, attach_point, true);
      
      // draw actual glass
      var delta_angle = 0.001
      var circle_len = Math.ceil(p.TWO_PI*2 / delta_angle)
      var a = 1
      var b = 1
      var n2 = 0.5 + rand()
      var n3 = n2
      var m1 = Math.floor(rand() * 2) + 1
      var m2 = m1
      var n1 = 0.5 + rand() * 2
      var d1 = p.pow(p.pow(p.abs(p.cos(m1 * p.PI / 4) / a), n2) + p.pow(p.abs(p.sin(m2 * p.PI / 4) / b), n3), -(1 / n1));
      var d2 = p.pow(p.pow(p.abs(p.cos(0) / a), n2) + p.pow(p.abs(p.sin(0) / b), n3), -(1 / n1));
      var d = d1 + d2
      var y_mult = (1.1 + rand() * 3)
      var intersection = null
      var sparkling = rand() > 0.8
      for (var i = 0; i < circle_len; i += 1) {
        var r = p.pow(p.pow(p.abs(p.cos(m1 * i * delta_angle / 4) / a), n2) + p.pow(p.abs(p.sin(m2 * i * delta_angle / 4) / b), n3), -(1 / n1)); 
        var x = r * p.sin(i * delta_angle) * len;
        var y = (r * p.cos(i * delta_angle) + d1) / d * y_mult * (len - attach_point) + attach_point;
        
        if (sparkling && rand() * len < (attach_point + level - y)/50 && y < attach_point + level) {
            xs.push(x)
            ys.push(y + (attach_point + level - y) * Math.min(Math.max(rand(), 0.05), 0.95))
            vs.push(3)
        }
        
        if (Math.abs(y - attach_point - level) < 0.1) {
          intersection = Math.abs(x)
        }
        xs.push(x)
        ys.push(y)
        vs.push(1)
      }

      // draw liquid level
      drawLine(0, attach_point + level, len, xs, ys, vs, -intersection, intersection, false, 5);
      
      // draw stick
      var res = drawStick(attach_point, level, intersection, len, xs, ys, vs)

      return [attach_point, res[0], res[1]]
    }

    function drawHandle(base_len, height_len, len, xs, ys, vs) {
      var delta_angle = 0.001
      var circle_len = Math.ceil(p.TWO_PI*2 / delta_angle)
      var a = 1
      var b = 1
      var n2 = 2
      var n3 = n2
      var m1 = 2
      var m2 = m1
      var n1 = 2
      var d1 = p.pow(p.pow(p.abs(p.cos(m1 * p.PI / 4) / a), n2) + p.pow(p.abs(p.sin(m2 * p.PI / 4) / b), n3), -(1 / n1));
      var d2 = p.pow(p.pow(p.abs(p.cos(0) / a), n2) + p.pow(p.abs(p.sin(0) / b), n3), -(1 / n1));
      var d = d1 + d2
      var attach = (height_len + len) / (1.2 + rand() * 0.8) - len
      var thick = rand() * 2
      var width = 2 + rand() * 3
      for (var i = 0; i < circle_len; i += 1) {
        var r = p.pow(p.pow(p.abs(p.cos(m1 * i * delta_angle / 4) / a), n2) + p.pow(p.abs(p.sin(m2 * i * delta_angle / 4) / b), n3), -(1 / n1)); 
        var x = r * p.sin(i * delta_angle) * (len - base_len)/(width + rand() * thick);
        var y = (r * p.cos(i * delta_angle) + d1) / d * (height_len - attach)/2 + attach;
        if (x > 0) {
          xs.push(x + base_len)
          ys.push(y)
          vs.push(1)
        }    
      }
    }

    function drawSquareDrink(len, xs, ys, vs) {
      var attach_point = -len
      var base_len = len / (1 + 5 * rand())
      var height_len = 2 * len * (0.3 + rand() * 0.7) - len
      var liquid_len = (height_len + len) * rand() - len
      drawLine(0, -len, len, xs, ys, vs, -base_len, base_len, false);
      drawLine(0, -base_len, len, xs, ys, vs, -len, height_len, true);
      drawLine(0, base_len, len, xs, ys, vs, -len, height_len, true);
      drawLine(0, liquid_len, len, xs, ys, vs, -base_len, base_len, false, 1, rand() > 0.9? true : false);
      
      // draw handle
      if (rand() > 0.1) {
        drawHandle(base_len, height_len, len, xs, ys, vs)
      }
            
      // draw stick
      var res = drawStick(attach_point, liquid_len + len, base_len, len, xs, ys, vs)
      return [attach_point, res[0], res[1]]
    }
    
  
    function renderBoard(){
      var min_x = 0.1
      var min_y = 0.2
      var max_x = 0.9
      var max_y = 0.8
      var delta_x = max_x - min_x
      var delta_y = max_y - min_y

      var xs = [];
      var ys = [];
      var vs = [];
      
      var len = 200
      var res = null
      if (rand() > 0.5) {
        res = drawSquareDrink(len, xs, ys, vs);
      } else {
        res = drawCurvedDrink(len, xs, ys, vs);
      }
      let attach_point = res[0]
      let stick_top = res[1]
      let m = res[2]
      
      var x_0 = min_x + (1/2) * delta_x
      var y_0 = min_y + (1/2) * delta_y   
      for (var i = 0; i < xs.length; i += 1) {
        var y_scaled = ys[i]/len/2;
        if (y_scaled >= -0.5 && y_scaled <= 0.5){
          var x = x_0 + xs[i]/len/2 * delta_x;
          var y = y_0 + y_scaled * delta_y;
          var x_grid = Math.max(Math.min(Math.round(x*rows), rows - 1), 0)
          var y_grid = Math.max(Math.min(Math.round(y*rows), rows - 1), 0)
          
          grid[x_grid][y_grid] = vs[i]
        }
      }
      
      // fill interior (unless it occupies all the space)
      var oldGrid = [];
      for (let i = 0; i < rows; i++) {
        oldGrid[i] = grid[i].slice();
      }
      var x_0_grid = Math.floor(x_0*rows)
      y_0 = y_0 + attach_point/len/2 * delta_y
      var y_0_grid = Math.floor(y_0*rows) + 5
      fill(x_0_grid, y_0_grid, grid)
      fillCount = getFillCount()
      if (fillCount > 0.9 * rows * rows) {
        grid = oldGrid;
      }

      // do the drawing
      let borderColor = p.color(Math.floor(rand() * 255), Math.floor(rand() * 255), Math.floor(rand() * 255));
      let fillColor = p.color(Math.floor(rand() * 255), Math.floor(rand() * 255), Math.floor(rand() * 255));
      let bubbleColor = p.color(Math.floor(rand() * 255), Math.floor(rand() * 255), Math.floor(rand() * 255));
      let bgColor = p.color(Math.floor(rand() * 255), Math.floor(rand() * 255), 130);
      let stickColor = p.color(Math.floor(rand() * 255), Math.floor(rand() * 255), Math.floor(rand() * 255));
      let liquidEdgeColor = borderColor;
      var min_fill_y = 10000
      var max_cond_fill_x = -10000
      var max_fill_y = -10000
      
      for (let x = 0; x < rows; x++) {
        for (let y = 0; y < rows; y++) {      
          if(grid[x][y] == 1) {
            p.stroke(borderColor);
            p.fill(borderColor);
          } else if(grid[x][y] == 2) {
            p.stroke(fillColor)
            p.fill(fillColor);
            min_fill_y = Math.min(min_fill_y, (rows- y)*(p.width / rows))
            max_fill_y = Math.max(max_fill_y, (rows- y)*(p.width / rows))
            if (y < y_0_grid + 10) {
                max_cond_fill_x = Math.max(max_cond_fill_x, Math.abs(x - x_0_grid))
            }
            
          } else if(grid[x][y] == 3) {
            p.stroke(bubbleColor)
            p.fill(bubbleColor);
          } else if(grid[x][y] == 4) {
            p.stroke(stickColor)
            p.fill(stickColor);
          }else if(grid[x][y] == 5) {
            p.stroke(liquidEdgeColor)
            p.fill(liquidEdgeColor);
          }
          else{
            p.stroke(bgColor)
            p.fill(bgColor);
          }
          p.rect(x*(p.width / rows),(rows- y - 1)*(p.width / rows),p.width / rows,p.height / rows)
        }
      }
      var res_ratio = p.height / 400
      // draw flow logo
      if(max_fill_y < p.height * 0.9 && max_fill_y - min_fill_y > flow_logo.height / 4 * res_ratio && max_cond_fill_x >= 12 && rand() > 0.7) {
        p.image(flow_logo, p.width/2 - flow_logo.width / 12 * res_ratio, max_fill_y - flow_logo.height / 4 * res_ratio, flow_logo.width / 4 * res_ratio, flow_logo.height / 4 * res_ratio);
      }
      // draw stick top
      if (stick_top != null) {      
        var xx = (x_0 + stick_top/len/2 * delta_x) * p.width;
        var yy = (1 - min_y - delta_y) * p.width;
        p.push()
        p.imageMode(p.CENTER);
        p.translate(xx, yy)
        var angle = Math.atan(-m * delta_y / delta_x) + Math.sign(m) * p.PI/2
        p.rotate(angle)     
        p.image(stick_img, 0, 0, stick_img.width / 8 * res_ratio, stick_img.height / 8 * res_ratio);
        p.pop()
        
      }
    }
  };

  return sketch;
}
