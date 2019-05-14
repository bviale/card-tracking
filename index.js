require('https://trackingjs.com/bower/tracking.js/build/tracking-min.js')

const img = new Image(300, 300);
img.addEventListener('load', () => {
  console.log('loaded')
});
img.src = 'https://stackblitz.io/files/image-tracking/github/bviale/card-tracking/master/shapes1.png';
img.crossOrigin = "anonymous";

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

ctx.drawImage(img, 0, 0);

var MyTracker = function() {
  MyTracker.prototype.track = function(pixels, width, height) {
    // Your code here
    console.log('tracking')
    this.emit('track', {
      // Your results here
    });
  }
}
tracking.inherits(MyTracker, tracking.Tracker);


var myTracker = new MyTracker();

myTracker.on('track', function(event) {
  // Results are inside the event
});

tracking.track(canvas, myTracker);