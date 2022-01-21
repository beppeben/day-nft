window.onload = function() {
  var today = new Date();
  var date = today.getUTCDate().toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping:false}) + 
              '-' + (today.getUTCMonth()+1).toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping:false}) + 
              '-' + today.getUTCFullYear();

  const sketch = document.getElementById('p5sketch');
  var n_pixels = sketch.offsetWidth;
  var myp5 = new p5(sketchWithParams(date, "What's the point of NFTs?", n_pixels), 'p5sketch');

  const inputHandler = function(e) {
    myp5.remove();  
    myp5 = new p5(sketchWithParams("30-12-2021", e.target.value, n_pixels), 'p5sketch');
  }

  const msg = document.getElementById('msg');
  msg.addEventListener('input', inputHandler);
  msg.addEventListener('propertychange', inputHandler);
}
