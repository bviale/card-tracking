const width = 1200,
  height = 1621;

const CARD_RATIO = 1.42;
const CARD_RATIO_ERROR = 0.1;

const DISPLAY = {
  ORIGINAL_PICTURE: true,
  FEATURES: true,
  EMPTY: true,
  TEMP_CARDS: true,
  CARDS: true
};

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
  const context = canvas.getContext('2d');

  const img = await loadImage('./cards/pok2.jpg');
  context.drawImage(img, 0, 0);

  const features = await initDetectFeatures(canvas);

  const cards = detectCards(features);

  if (DISPLAY.CARDS) {
    context.strokeStyle = 'blue';
    context.lineWidth = 8;
    context.beginPath();
    for (var card of cards) {
      context.moveTo(card.start.X, card.start.Y);
      context.lineTo(card.end.X, card.start.Y);
      context.lineTo(card.end.X, card.end.Y);
      context.lineTo(card.start.X, card.end.Y);
      context.lineTo(card.start.X, card.start.Y);
      context.stroke();
    }
  }
}

initDetectFeatures = (canvas) => {
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

  const emptyLines = [],
        emptyColumns = [];
  for (var i = 0; i < height; i++) {
    if (matrix[i].indexOf(1) < 0) {
      emptyColumns.push(i);
    }
  }

  for (var j = 0; j < width; j++) {
    let found = false;
    for (var i = 0; i < height; i++) {
      if (matrix[i][j]) {
        console.log(i, j)
        found = true;
        break;
      }
    }

    if (!found) {
      emptyLines.push(j);
    }
  }
console.log('matrix', matrix, matrix.length)
  console.log('empty lines', emptyLines)

  if (DISPLAY.EMPTY) {
    const canvas = document.getElementById('canvas');
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
  for (let i = 1; i < height - 1; i++) {
    let isEmpty = emptyLines.indexOf(i) >= 0;
    
    if (isEmpty) {
      if (isScanningCard) {
        // We were scanning a card block and we reached its end
        // We compute the rectangle ratio to see if it matches a card

        // context.strokeStyle = 'black';
        // context.strokeRect(0, currentCard[0], width, currentCard.length);

        // The cards computed for this block of lines
        const cards = computeCardsFromLinesBlocks(currentCard, emptyColumns);
        
        const actualCards = [];
        for (const card of cards) {
          let height = card.end.Y - card.start.Y;
          let width = card.end.X - card.start.X;

          const diff = CARD_RATIO - (height / width);
          if (Math.abs(diff) < CARD_RATIO_ERROR) {
            actualCards.push(card);
          }
        }

        // No card with good ration was found on this block of lines
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

document.addEventListener('DOMContentLoaded', () => {
  init();
}, false);

// Misc
mouseMove = (evt) => {
  var canvas = document.getElementById('canvas');
  var coordinates = document.getElementById('coordinates');
  var rect = canvas.getBoundingClientRect();
  var c =  {
    x: evt.clientX - rect.left,
    y: evt.clientY - rect.top
  };
  coordinates.innerHTML = c.x + ';' + c.y;
}