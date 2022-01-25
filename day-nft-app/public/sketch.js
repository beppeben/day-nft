var sketchWithParams = function(date, message, n_pixels) {

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

  let seed = xmur3(date.concat(message));
  let rand = mulberry32(seed());

  let font_out = null;
  try {
    font_out = p5.loadFont('slkscr.ttf');
  } catch (err) {}

  
  let sketch = function(p) {
    var grid = [];
    const rows = 100;
    let font;
      
    p.preload = function() {
      font = p.loadFont('slkscr.ttf')
    }
    
    p.setup = function() {
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
      //p.text(date, 0.5 * n_pixels, 0.07 * n_pixels)
      
      message = message.replaceAll("\\n", "\n")
      p.text(message, 0.5 * n_pixels, 0.9 * n_pixels)

      if (font_out != null) {
        p.saveCanvas(c, date, 'png');
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
  
    function renderBoard(){
      var min_x = 0.1
      var min_y = 0.15
      var max_x = 0.9
      var max_y = 0.8
      var delta_x = max_x - min_x
      var delta_y = max_y - min_y

      var a = Math.floor(rand() * 20) + 1
      var b = Math.floor(rand() * 20) + 1
      var n2 = Math.floor(rand() * 20) + 1
      var n3 = Math.floor(rand() * 20) + 1
      var m1 = Math.floor(rand() * 20) + 1
      var m2 = Math.floor(rand() * 20) + 1
      var n1 = Math.floor(rand() * 20) + 1
      
      var delta_angle = 0.001
      var len = Math.ceil(p.TWO_PI*2 / delta_angle)
      var xs = new Array(len).fill(0.0);
      var ys = new Array(len).fill(0.0);
      var xmax = 0.0
      var ymax = 0.0
      var xavg = 0.0
      var yavg = 0.0

      for (var i = 0; i < len; i += 1) {
        var r = p.pow(p.pow(p.abs(p.cos(m1 * i * delta_angle / 4) / a), n2) + p.pow(p.abs(p.sin(m2 * i * delta_angle / 4) / b), n3), -(1 / n1)); 
        xs[i] = - r * p.sin(i * delta_angle);
        ys[i] = - r * p.cos(i * delta_angle);
        xmax = Math.max(xmax, Math.abs(xs[i]))
        ymax = Math.max(ymax, Math.abs(ys[i]))
        xavg += xs[i]
        yavg += ys[i]
      }
      xavg /= len
      yavg /= len

      var x_0 = min_x + (1/2 - xavg/xmax) * delta_x
      var y_0 = min_y + (1/2 - yavg/ymax) * delta_y
      var x_0_grid = Math.floor(x_0*rows)
      var y_0_grid = Math.floor(y_0*rows)
      for (var i = 0; i < len; i += 1) {
        var x = x_0 + xs[i]/xmax/2 * delta_x;
        var y = y_0 + ys[i]/ymax/2 * delta_y;
        var x_grid = Math.max(Math.min(Math.round(x*rows), rows - 1), 0)
        var y_grid = Math.max(Math.min(Math.round(y*rows), rows - 1), 0)
        grid[x_grid][y_grid] = 1
      }
      
      var fillCount = getFillCount()
      if (fillCount < 0.005 * rows * rows) {
        // rerender if not enough space filled
        //console.log("rerendering");
        return renderBoard();
      }

      // fill interior (unless it occupies all the space)
      var oldGrid = [];
      for (let i = 0; i < rows; i++) {
        oldGrid[i] = grid[i].slice();
      }
      fill(x_0_grid, y_0_grid, grid)
      fillCount = getFillCount()
      if (fillCount == rows * rows) {
        grid = oldGrid;
      }

      // do the drawing
      let borderColor = p.color(Math.floor(rand() * 255), Math.floor(rand() * 255), Math.floor(rand() * 255));
      let fillColor = p.color(Math.floor(rand() * 255), Math.floor(rand() * 255), Math.floor(rand() * 255));
      let bgColor = p.color(Math.floor(rand() * 255), Math.floor(rand() * 255), 130);
      for (let x = 0; x < rows; x++) {
        for (let y = 0; y < rows; y++) {
          if(grid[x][y] == 1) {
            p.stroke(borderColor);
            p.fill(borderColor);
          } else if(grid[x][y] == 2) {
            p.stroke(fillColor)
            p.fill(fillColor);
          } else{
            p.stroke(bgColor)
            p.fill(bgColor);
          }
          p.rect(x*(p.width / rows),y*(p.width / rows),p.width / rows,p.height / rows)
        }
      }
    }
  };

  return sketch;
}
