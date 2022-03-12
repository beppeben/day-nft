window.onload = function() {
  loadSketch();
}

if(document.getElementById('p5sketch') != null) {
  loadSketch();
}

function loadSketch() {
  var today = new Date();
  var date = today.getUTCDate().toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping:false}) + 
              '-' + (today.getUTCMonth()+1).toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping:false}) + 
              '-' + today.getUTCFullYear();
  
  // adapt sketch to screen
  const panel = document.getElementById('left-panel');
  var n_pixels = panel.offsetWidth * 0.8; 
  if (n_pixels == 0) {   
    n_pixels = 250;
  }
    
  const bestBidMsg = document.getElementById('best_bid_msg'); 
  var msgShow = bestBidMsg.getAttribute("value");
  var myp5 = new p5(sketchWithParams(date, msgShow, n_pixels), 'p5sketch');
  
  // update sketch on user input
  const inputHandler = function(e) {
    myp5.remove();  
    myp5 = new p5(sketchWithParams(date, e.target.value, n_pixels), 'p5sketch');
  }
  const msg = document.getElementById('msg');
  msg.addEventListener('input', inputHandler);
  msg.addEventListener('propertychange', inputHandler);
 
  // show sketch of best bid 
  var observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.type === "attributes") {
        myp5.remove();
        msgShow = bestBidMsg.getAttribute("value");
        myp5 = new p5(sketchWithParams(date, msgShow, n_pixels), 'p5sketch');
      }
    });
  });
  observer.observe(bestBidMsg, {
    attributes: true
  });
}
