const width = 1200,
  height = 1621;

loadImage = (url) => new Promise((resolve, reject) => {
  const img = new Image(width, height);
  img.addEventListener('load', () => {
    resolve(img);
  });
  img.src = url;
});

init = async () => {
  const canvas = document.getElementById('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  const img = await loadImage('./cards/pok2.jpg');
  ctx.drawImage(img, 0, 0);

  await initDetectFeatures(canvas);
}

initDetectFeatures = (canvas) => {
  const context = canvas.getContext('2d');

  tracking.Fast.THRESHOLD = 20;
  var imageData = context.getImageData(0, 0, width, height);
  var gray = tracking.Image.grayscale(imageData.data, width, height);
  var corners = tracking.Fast.findCorners(gray, width, height);

  context.clearRect(0, 0, canvas.width, canvas.height);

  console.log('detect features', gray, corners);

  for (var i = 0; i < corners.length; i += 2) {
    context.fillStyle = '#f00';
    context.fillRect(corners[i], corners[i + 1], 3, 3);
  }

  const features = detectCards(corners);
};

detectCards = (corners) => {
  const points = [];


};

// initDetectFeatures = async (canvas) => {
//   const context = canvas.getContext('2d');

//   // load pattern
//   const patternImg = await loadImage('./cards/2.shape.jpg');
//   context.drawImage(patternImg, width, 0);

//   tracking.Fast.THRESHOLD = 20;
//   tracking.Brief.N = 512

//   window.descriptorLength = 256;
//   window.matchesShown = 200;
//   window.blurRadius = 3;

//   var imageData1 = context.getImageData(0, 0, width, height);
//   var imageData2 = context.getImageData(width, 0, width, height);

//   var gray1 = tracking.Image.grayscale(tracking.Image.blur(imageData1.data, width, height, blurRadius), width, height);
//   var gray2 = tracking.Image.grayscale(tracking.Image.blur(imageData2.data, width, height, blurRadius), width, height);

//   var corners1 = tracking.Fast.findCorners(gray1, width, height);
//   var corners2 = tracking.Fast.findCorners(gray2, width, height);

//   console.log('shape corners', gray2, corners2)

//   var descriptors1 = tracking.Brief.getDescriptors(gray1, width, corners1);
//   var descriptors2 = tracking.Brief.getDescriptors(gray2, width, corners2);

//   var matches = tracking.Brief.reciprocalMatch(corners1, descriptors1, corners2, descriptors2);
//   matches.sort(function(a, b) {
//     return b.confidence - a.confidence;
//   });

//   for (var i = 0; i < Math.min(window.matchesShown, matches.length); i++) {
//     var color = '#' + Math.floor(Math.random()*16777215).toString(16);
//     context.fillStyle = color;
//     context.strokeStyle = color;
//     context.fillRect(matches[i].keypoint1[0], matches[i].keypoint1[1], 4, 4);
//     context.fillRect(matches[i].keypoint2[0] + width, matches[i].keypoint2[1], 4, 4);
//     context.beginPath();
//     context.moveTo(matches[i].keypoint1[0], matches[i].keypoint1[1]);
//     context.lineTo(matches[i].keypoint2[0] + width, matches[i].keypoint2[1]);
//     context.stroke();
//   }
// };

document.addEventListener('DOMContentLoaded', () => {
  init();
}, false);
