window.onload = function() {
  loadSketch();
}

console.log(document.getElementById('p5sketch'))
if(document.getElementById('p5sketch') != null) {
  loadSketch();
}

function loadSketch() {
  var today = new Date();
  var date = today.getUTCDate().toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping:false}) + 
              '-' + (today.getUTCMonth()+1).toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping:false}) + 
              '-' + today.getUTCFullYear();

  const sketch = document.getElementById('p5sketch');
  var n_pixels = sketch.offsetWidth;
  var myp5 = new p5(sketchWithParams(date, "What's the point of NFTs?", n_pixels), 'p5sketch');

  const inputHandler = function(e) {
    myp5.remove();  
    myp5 = new p5(sketchWithParams(date, e.target.value, n_pixels), 'p5sketch');
  }

  const msg = document.getElementById('msg');
  msg.addEventListener('input', inputHandler);
  msg.addEventListener('propertychange', inputHandler);
  
  // reload to make sure the sketch is shown
  const target = document.getElementById('bid-container');
  var observer = new MutationObserver(function(){
      location.reload();
  });
  observer.observe(target, { attributes: true, childList: true });
}
