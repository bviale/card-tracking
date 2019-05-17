const width = 3024,
  height = 4032;

const CARD_RATIO = 1.42;
const CARD_RATIO_ERROR = 0.05;

const STARTING_ANGLE_DEGREES = -1;
const ENDING_ANGLE_DEGREES = 1;
const STEP_ANGLES = 0.2;

const DISPLAY = {
  ORIGINAL_PICTURE: true,
  FEATURES: false,
  ISOLATED_FEATURES: false,
  EMPTY: false,
  TEMP_CARDS: false,
  CARDS: false
};

const OPTIONS = {
  REMOVE_ISOLATED_FEATURES_POINTS: true
};

let canvas;

loadImage = (url) => new Promise((resolve, reject) => {
  const img = new Image(width, height);
  img.addEventListener('load', () => {
    resolve(img);
  });
  img.src = url;
});

init = async () => {
  canvas = document.getElementById('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.addEventListener('mousemove', mouseMove);
  
  // Scan the same picture with different angles
  let allScannedCards = [];
  for (let i = STARTING_ANGLE_DEGREES; i <= ENDING_ANGLE_DEGREES; i = (i + STEP_ANGLES)) {
    console.log('Scanning with an angle of ' + i.toFixed(1) + '°...');
    const cards = await scanCanvas(i);
    allScannedCards = allScannedCards.concat(cards);
  }

  // Keep only 1 picture per starting point (remove doubles)
  allScannedCards = allScannedCards.reduce((acc, card) => {
    const isDouble = acc.filter((c) => 
      Math.abs(c.start.X - card.start.X) < 100 &&
      Math.abs(c.start.Y - card.start.Y) < 100
    ).length > 0;
    if (!isDouble) {
      acc.push(card);
    }
    return acc;
  }, []);

  const cardsImages = extractImages(allScannedCards);

  for (const cardImage of cardsImages) {
    const image = new Image();
    image.src = cardImage;
    document.body.append(image);
  }
}

scanCanvas = async (angle) => {
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, canvas.width, canvas.height);

  const img = await loadImage('./cards/pok7.jpg');

  context.save();
  context.rotate(angle * Math.PI / 180);
  context.drawImage(img, 0, 0);
  context.restore();

  const features = await initDetectFeatures();

  const cards = detectCards(features);

  if (DISPLAY.CARDS) {
    context.strokeStyle = 'blue';
    context.lineWidth = 8;
    context.beginPath();
    for (const card of cards) {
      context.moveTo(card.start.X, card.start.Y);
      context.lineTo(card.end.X, card.start.Y);
      context.lineTo(card.end.X, card.end.Y);
      context.lineTo(card.start.X, card.end.Y);
      context.lineTo(card.start.X, card.start.Y);
      context.stroke();
    }
  }

  return cards;
}

initDetectFeatures = () => {
  const context = canvas.getContext('2d');

  tracking.Fast.THRESHOLD = 20;
  var imageData = context.getImageData(0, 0, width, height);
  var gray = tracking.Image.grayscale(imageData.data, width, height);
  var corners = tracking.Fast.findCorners(gray, width, height);

  if (!DISPLAY.ORIGINAL_PICTURE) {
    context.clearRect(0, 0, canvas.width, canvas.height);
  }

  if (DISPLAY.FEATURES) {
    for (var i = 0; i < corners.length; i += 2) {
      context.fillStyle = '#f00';
      context.fillRect(corners[i], corners[i + 1], 3, 3);
    }
  }

  return corners;
};

detectCards = (corners) => {
  const points = [];
  const matrix = [];

  // Transform array
  for (var index = 0; index < corners.length; index += 2) {
    const i = corners[index],
          j = corners[index + 1];
    points.push([i, j]);
  }
  
  for (var i = 0; i < height; i++) {
    matrix[i] = new Array(width);
  }

  for (const point of points) {
    matrix[point[0]][point[1]] = 1;
  }

  if (OPTIONS.REMOVE_ISOLATED_FEATURES_POINTS) {
    removeIsolatedPointsFilter(matrix);
  }

  const emptyLines = [],
        emptyColumns = [];
  for (var i = 0; i < width; i++) {
    if (matrix[i].indexOf(1) < 0) {
      emptyColumns.push(i);
    }
  }

  for (var j = 0; j < height; j++) {
    let found = false;
    for (var i = 0; i < width; i++) {
      if (matrix[i][j]) {
        found = true;
        break;
      }
    }

    if (!found) {
      emptyLines.push(j);
    }
  }

  if (DISPLAY.EMPTY) {
    const ctx = canvas.getContext('2d');
  
    ctx.strokeStyle = 'yellow';
    ctx.beginPath();
    for (let line of emptyLines) {
      ctx.moveTo(0, line);
      ctx.lineTo(width - 1, line);
      ctx.stroke();
    }
  
    for (let col of emptyColumns) {
      ctx.moveTo(col, 0);
      ctx.lineTo(col, height - 1);
      ctx.stroke();
    }
  }
  
  return extractCardsFromEmpty(emptyLines, emptyColumns);
};

extractCardsFromEmpty = (emptyLines, emptyColumns) => {        
  let totalCards = [];
  let isScanningCard = false;
  let currentCard = [];
  const context = canvas.getContext('2d')
  for (let i = 1; i < height - 1; i++) {
    let isEmpty = emptyLines.indexOf(i) >= 0;
    
    if (isEmpty) {
      if (isScanningCard) {
        // We were scanning a card block and we reached its end
        // We compute the rectangle ratio to see if it matches a card

        // The cards computed for this block of lines
        const cards = computeCardsFromLinesBlocks(currentCard, emptyColumns);
        
        // context.strokeStyle = 'red';
        // context.lineWidth = 8;
        // context.beginPath();
        // for (const card of cards) {
        //   context.moveTo(card.start.X, card.start.Y);
        //   context.lineTo(card.end.X, card.start.Y);
        //   context.lineTo(card.end.X, card.end.Y);
        //   context.lineTo(card.start.X, card.end.Y);
        //   context.lineTo(card.start.X, card.start.Y);
        //   context.stroke();
        // }

        const actualCards = [];
        for (const card of cards) {
          let height = card.end.Y - card.start.Y;
          let width = card.end.X - card.start.X;

          const diff = CARD_RATIO - (height / width);
          const hasAtLeastMinimumSize = width > 100 && height > 100;
          if ((Math.abs(diff) < CARD_RATIO_ERROR) && hasAtLeastMinimumSize) {
            actualCards.push(card);
          }
        }

        // No card with good ratio was found on this block of lines
        // Delete the empty row to try with a bigger block of lines
        if (cards.length > 0 && actualCards.length == 0) {
          let hasReachedNextBlock = false;
          let nextLine = i;
          while (!hasReachedNextBlock && nextLine < height - 1) {
            emptyLines.splice(emptyLines.indexOf(nextLine), 1);
            nextLine++;
            hasReachedNextBlock = emptyLines.indexOf(nextLine) < 0;
          }
        } else {
          totalCards = totalCards.concat(actualCards);
          isScanningCard = false;
          currentCard = [];
        }
      }
    } else {
      // Line is not empty
      if (isScanningCard) {
        currentCard.push(i);
      } else {
        isScanningCard = true;
        currentCard = [ i ];
      }
    }
  }

  return totalCards;
};

computeCardsFromLinesBlocks = (linesBlock, emptyColumns) => {
  let cards = [];
  let isScanningCard = false;
  let currentCard = [];
  for (let j = 1; j < width - 1; j++) {
    let isEmpty = emptyColumns.indexOf(j) >= 0;
    if (isEmpty) {
      if (isScanningCard) {
        cards.push({
          start: {
            X: currentCard[0],
            Y: linesBlock[0]
          },
          end: {
            X: currentCard[currentCard.length - 1],
            Y: linesBlock[linesBlock.length - 1]
          }
        });

        isScanningCard = false;
        currentCard = [];
      }
    } else {
      if (isScanningCard) {
        currentCard.push(j);
      } else {
        isScanningCard = true;
        currentCard = [ j ];
      }
    }
  }

  return cards;
};

extractImages = (cards) => {
  const context = canvas.getContext('2d');
  const images = [];

  for (let card of cards) {
    const imageWidth = card.end.X - card.start.X;
    const imageHeight = card.end.Y - card.start.Y;

    // Retrieve the image data from the main canvas
    const imageData = context.getImageData(card.start.X, card.start.Y, imageWidth, imageHeight);

    // Create a temp canvas for image data to dataUrl conversion
    const tmpCanvas = document.createElement('canvas');
    tmpCanvas.width = imageWidth;
    tmpCanvas.height = imageHeight;
    const tmpCtx = tmpCanvas.getContext('2d');
    tmpCtx.putImageData(imageData, 0, 0);
    images.push(tmpCanvas.toDataURL());
  }

  return images;
};

removeIsolatedPointsFilter = (matrix) => {
  const context = canvas.getContext('2d');
  let nbNeighbours = (x, y, range) => {
    let minI = x - range,
        maxI = x + range,
        minJ = y - range,
        maxJ = y + range,
        nb = -1;

    if (minI < 0)
      minI = 0;
    
    if (maxI > width) 
      maxI = width;

    if (minJ < 0)
      minJ = 0;

    if (maxJ > height)
      maxJ = height;

    for (var j = minJ; j < maxJ; j++) {
      for (var i = minI; i < maxI; i++) {
        if (matrix[i][j]) {
          nb++;
        }
      }
    }

    return nb;
  }

  for (var j = 0; j < height; j++) {
    for (var i = 0; i < width; i++) {
      if (matrix[i][j]) {
        if (nbNeighbours(i, j, 15) < 5) {
          matrix[i][j] = null;

          if (DISPLAY.ISOLATED_FEATURES) {
            context.fillStyle = 'green';
            context.fillRect(i, j, 3, 3);
          }
        }
      }
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  init();
}, false);

// Misc
mouseMove = (evt) => {
  var coordinates = document.getElementById('coordinates');
  var rect = canvas.getBoundingClientRect();
  var c =  {
    x: evt.clientX - rect.left,
    y: evt.clientY - rect.top
  };
  coordinates.innerHTML = c.x + ';' + c.y;
}