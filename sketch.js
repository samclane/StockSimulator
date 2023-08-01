let stockPrice;
let history = [];

let drift = 0.001; // Average rate of return
let volatility = 0.01; // Standard deviation of returns

let playerMoney = 1000;
let stocksOwned = 0;

let dividendRate = 0.01; // Dividend rate
let priceLimit = 0.05; // Limit on price change per update
let eventRate = 0.01; // Chance of a market event per update
let eventImpact = 0.2; // Impact of a market event on price

// The general mood of the market, which can affect the stock price
let marketMood = 0;
let marketMoodVolatility = 0.001; // The volatility of the market mood


let dollarBills = [];
let dollarBillImage;

let smaDays = 100;
let smaValues = [];

let emaDays = 100;
let emaValues = [];

let keySequence = [];
let konamiCode = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "b",
  "a"
];
let codeEntered = false;

let xAdjustSmooth = 0;
let yAdjustSmooth = 0;

function preload() {
  dollarBillImage = loadImage("dollar_bill.png");
}


function setup() {
  createCanvas(windowWidth, windowHeight);
  stockPrice = 100; // Start the stock price at $100

  // Create an "invest" button
  let investButton = createButton("Invest");
  investButton.position(10, 10);
  investButton.mousePressed(invest);

  // Create a "Sell" button
  let sellButton = createButton("Sell");
  sellButton.position(60, 10);
  sellButton.mousePressed(sell);
}

function draw() {
  background(220);
  updateAndDrawDollarBills();
  updateStock();
  payDividends();
  drawGraph();
  displayPrice();
  displayPlayerMoney();
  drawLegend();
}

function updateStock() {
  // Update the market mood with some randomness
  marketMood += random(-marketMoodVolatility, marketMoodVolatility);

  // Limit the market mood to the range [-1, 1]
  marketMood = constrain(marketMood, -1, 1);

  if (codeEntered) {
    marketMood = 0.25;
  }

  let changePercent = constrain(
    drift / 252 + randomGaussian() * volatility,
    -priceLimit,
    priceLimit
  );

  // Modify the change percent based on the market mood
  // The market mood has a 1% influence on the change percent
  changePercent += marketMood * 0.01;

  if (random() < eventRate) {
    changePercent += random(-1, 1) * eventImpact;
  }

  let newLogPrice = log(stockPrice) + changePercent;
  stockPrice = exp(newLogPrice);

  history.push(stockPrice);
}

function drawGraph() {
  // Calculate the y position of the latest stock price
  let latestY = map(history[history.length - 1], 0, 200, height, 0);

  // Adjust the y position of all points so the latest point is at 3/4
  // of the height
  let yAdjust = height * 3 / 4 - latestY;

  // Calculate the x position of the latest stock price
  let latestX = map(history.length - 1, 0, history.length, 0, width);

  // Adjust the x position of all points so the latest point is at the
  // center of the width
  let xAdjust = width / 2 - latestX;

  // Gradually adjust the smooth camera positions towards the target positions
  xAdjustSmooth += (xAdjust - xAdjustSmooth) * 0.05;
  yAdjustSmooth += (yAdjust - yAdjustSmooth) * 0.05;

  // Draw the graph
  for (let i = 1; i < history.length; i++) {
    let x = map(i, 0, history.length, 0, width) + xAdjustSmooth;
    let y = map(history[i], 0, 200, height, 0) + yAdjustSmooth;
    let prevX = map(i - 1, 0, history.length, 0, width) + xAdjustSmooth;
    let prevY = map(history[i - 1], 0, 200, height, 0) + yAdjustSmooth;

    // Check if the stock price is going up or down and change the
    // stroke color accordingly
    if (history[i] > history[i - 1]) {
      stroke("green");
    } else {
      stroke("red");
    }

    line(prevX, prevY, x, y);
  }

  // Reset the stroke color
  stroke(0);

  // Calculate the SMA and add it to the smaValues array
  if (history.length >= smaDays) {
    let smaSum = 0;
    for (let i = 0; i < smaDays; i++) {
      smaSum += history[history.length - 1 - i];
    }
    let sma = smaSum / smaDays;
    smaValues.push(sma);
  }

  // Draw the SMA line
  stroke("blue");
  for (let i = 1; i < smaValues.length; i++) {
    let x = map(
      i + history.length - smaValues.length,
      0,
      history.length,
      0,
      width
    ) + xAdjustSmooth;
    let y = map(smaValues[i], 0, 200, height, 0) + yAdjustSmooth;
    let prevX = map(
      i - 1 + history.length - smaValues.length,
      0,
      history.length,
      0,
      width
    ) + xAdjustSmooth;
    let prevY = map(smaValues[i - 1], 0, 200, height, 0) + yAdjustSmooth;
    line(prevX, prevY, x, y);
  }

  // Calculate the EMA and add it to the emaValues array
  emaValues = [];
  let k = 2 / (emaDays + 1); // smoothing constant
  for (let i = 0; i < history.length; i++) {
    if (i < emaDays) {
      // Calculate the SMA for the first emaDays prices to initialize the EMA
      let smaSum = 0;
      for (let j = 0; j <= i; j++) {
        smaSum += history[j];
      }
      emaValues.push(smaSum / (i + 1));
    } else {
      // Calculate the EMA for each subsequent price
      let ema = (history[i] - emaValues[i - 1]) * k + emaValues[i - 1];
      emaValues.push(ema);
    }
  }

  // Draw the EMA line
  stroke("purple");
  for (let i = 1; i < emaValues.length; i++) {
    let x = map(i, 0, history.length, 0, width) + xAdjustSmooth;
    let y = map(emaValues[i], 0, 200, height, 0) + yAdjustSmooth;
    let prevX = map(i - 1, 0, history.length, 0, width) + xAdjustSmooth;
    let prevY = map(emaValues[i - 1], 0, 200, height, 0) + yAdjustSmooth;
    line(prevX, prevY, x, y);
  }

  // Reset the stroke color
  stroke(0);

  // Remove the oldest price if the history gets too long
  if (history.length > 2 * width) {
    history.splice(0, 1);
  }
  if (smaValues.length > 2 * width) {
    smaValues.splice(0, 1);
  }
  if (emaValues.length > 2 * width) {
    emaValues.splice(0, 1);
  }
}


function displayPrice() {
  fill(0);
  textSize(16);
  text("Stock Price: $" + stockPrice.toFixed(2), 10, height - 60);
}

function displayPlayerMoney() {
  fill(0);
  textSize(16);
  text("Player Money: $" + playerMoney.toFixed(2), 10, height - 40);
  text("Stocks Owned: " + stocksOwned, 10, height - 20);
}

function invest() {
  if (playerMoney >= stockPrice) {
    playerMoney -= stockPrice;
    stocksOwned += 1;
    stockPrice *= 1.01; // Increase the stock price by 1%
  }
}

function sell() {
  if (stocksOwned > 0) {
    playerMoney += stockPrice;
    stocksOwned -= 1;
    stockPrice *= 0.99; // Decrease the stock price by 1%
  }
}

function payDividends() {
  if (frameCount % 60 == 0) {
    playerMoney += stocksOwned * stockPrice * dividendRate;
  }
}


function updateAndDrawDollarBills() {
  // Add a new dollar bill every 30 frames
  if (frameCount % 30 == 0) {
    dollarBills.push(new DollarBill());
  }

  // Update and draw each dollar bill
  for (let i = dollarBills.length - 1; i >= 0; i--) {
    dollarBills[i].update();
    dollarBills[i].draw();
    // Remove the dollar bill if it"s off the screen
    if (dollarBills[i].y > height) {
      dollarBills.splice(i, 1);
    }
  }
}

function drawLegend() {
  fill(0);
  textSize(16);

  // Draw the Stock price legend
  stroke("red");
  line(10, 50, 40, 50);
  noStroke();
  text("Stock Price", 50, 55);

  // Draw the SMA legend
  stroke("blue");
  line(10, 70, 40, 70);
  noStroke();
  text("SMA", 50, 75);

  // Draw the EMA legend
  stroke("purple");
  line(10, 90, 40, 90);
  noStroke();
  text("EMA", 50, 95);

  noStroke();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

class DollarBill {
  constructor() {
    this.x = random(width);
    this.y = -dollarBillImage.height;
    // Speed is based on player"s money
    this.speed = map(playerMoney, 0, 10000, 1, 5);
  }

  update() {
    this.y += this.speed;
  }

  draw() {
    image(dollarBillImage, this.x, this.y, 100, 100);
  }
}

function updateAndDrawDollarBills() {
  // Add a new dollar bill every 30 frames
  if (frameCount % 30 == 0 && (random() * playerMoney) > 500) {
    dollarBills.push(new DollarBill());
  }

  // Update and draw each dollar bill
  for (let i = dollarBills.length - 1; i >= 0; i--) {
    dollarBills[i].update();
    dollarBills[i].draw();
    // Remove the dollar bill if it"s off the screen
    if (dollarBills[i].y > height) {
      dollarBills.splice(i, 1);
    }
  }
}

function keyPressed() {
  keySequence.push(key);

  if (keySequence.length > konamiCode.length) {
    keySequence.shift();
  }

  if (JSON.stringify(keySequence) === JSON.stringify(konamiCode)) {
    codeEntered = true;
    console.log("line go up");
  }
}
