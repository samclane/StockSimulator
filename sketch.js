let N = 5;  // Number of stocks
let stocks = Array.from({ length: N }, () => {
  return {
    stockPrice: 100,  // Starting price
    history: [],
    stocksOwned: 0
  }
});

let maxLength = 1000;  // Max number of points to keep in the graph
let playerMoney = 1000;
let drift = 0.001;
let volatility = 0.01;
let dividendRate = 0.01;
let priceLimit = 0.05;
let eventRate = 0.01;
let eventImpact = 0.2;
let marketMood = 0;
let marketMoodVolatility = 0.001;

let dollarBills = [];
let dollarBillImage;

let smaDays = 100;
let smaValues = Array.from({ length: N }, () => []);
let emaDays = 100;
let emaValues = Array.from({ length: N }, () => []);

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

class GameEvent {
  constructor(callback, start, duration) {
    this.startTime = start;
    this.callback = callback;
    this.endTime = millis() + duration;
    this.yPosition = -30;
    this.alphaValue = 255;
  }

  execute() {
    if (this.callback) {
      this.callback(this);
    }
  }

  isRunning() {
    return (millis() < this.endTime) && (millis() > this.startTime);
  }
}

let events = [];

function preload() {
  dollarBillImage = loadImage("dollar_bill.png");
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  for (let stock of stocks) {
    stock.stockPrice = 100;  // Reset the stock price
  }

  for (let i = 0; i < N; i++) {
    let yPosition = i * 30;
    let investButton = createButton(`Invest in Stock ${i + 1}`);
    investButton.position(10, 80 + yPosition);
    investButton.mousePressed(() => invest(i));

    let sellButton = createButton(`Sell Stock ${i + 1}`);
    sellButton.position(160, 80 + yPosition);
    sellButton.mousePressed(() => sell(i));
  }

  scheduleEvent(() => showMessage(events[0], "Welcome to the stock market!"), 2000, 2000 + 2500);
  scheduleEvent(() => showMessage(events[1], "You sure like playing!"), 100000, 100000 + 2500);
}

function draw() {
  background(220);
  updateAndDrawDollarBills();
  for (let i = 0; i < N; i++) {
    updateStock(i);
    payDividends(i);
  }
  drawGraph();
  for (let i = 0; i < N; i++) {
    displayPrice(i);
  }
  displayPlayerMoney();
  drawLegend();
  updateEvents();
}

function updateStock(stockIndex) {
  let stock = stocks[stockIndex];
  marketMood += random(-marketMoodVolatility, marketMoodVolatility);
  marketMood = constrain(marketMood, -1, 1);
  if (codeEntered) {
    marketMood = 0.25;
  }
  let changePercent = constrain(
    drift / 252 + randomGaussian() * volatility,
    -priceLimit,
    priceLimit
  );
  changePercent += marketMood * 0.01;

  if (random() < eventRate) {
    changePercent += random(-1, 1) * eventImpact;
  }

  let newLogPrice = log(stock.stockPrice) + changePercent;
  stock.stockPrice = exp(newLogPrice);

  stock.history.push(stock.stockPrice);
}


function drawGraph() {
  // Iterate through each stock and draw its graph
  for (let i = 0; i < N; i++) {
    let stock = stocks[i];
    let latestY = map(stock.history[stock.history.length - 1], 0, 200, height, 0);
    let yAdjust = height * 3 / 4 - latestY;
    let latestX = map(stock.history.length - 1, 0, stock.history.length, 0, width);
    let xAdjust = width / 2 - latestX;
    xAdjustSmooth += (xAdjust - xAdjustSmooth) * 0.05;
    yAdjustSmooth += (yAdjust - yAdjustSmooth) * 0.05;

    for (let j = 1; j < stock.history.length; j++) {
      let x = map(j, 0, stock.history.length, 0, width) + xAdjustSmooth;
      let y = map(stock.history[j], 0, 200, height, 0) + yAdjustSmooth;
      let prevX = map(j - 1, 0, stock.history.length, 0, width) + xAdjustSmooth;
      let prevY = map(stock.history[j - 1], 0, 200, height, 0) + yAdjustSmooth;

      if (stock.history[j] > stock.history[j - 1]) {
        stroke("green");
      } else {
        stroke("red");
      }
      line(prevX, prevY, x, y);
    }

    // Draw stock number near the latest point
    stroke(0);
    fill(0);
    textSize(12);
    text(`Stock ${i + 1}`, latestX + xAdjustSmooth + 5, latestY + yAdjustSmooth);

    // Remove the oldest price if we have more than N points
    if (stock.history.length > maxLength) {
      stock.history.shift();
    }
  }
  stroke(0);
}


function displayPrice(stockIndex) {
  let yPosition = stockIndex * 20;
  fill(0);
  textSize(16);
  text(`Stock ${stockIndex + 1} Price: $${stocks[stockIndex].stockPrice.toFixed(2)}`, 10, height - 160 + yPosition);
}

function displayPlayerMoney() {
  fill(0);
  textSize(16);
  text(`Player Money: $${playerMoney.toFixed(2)}`, 10, height - 20);
}

function invest(stockIndex) {
  let stock = stocks[stockIndex];
  if (playerMoney >= stock.stockPrice) {
    playerMoney -= stock.stockPrice;
    stock.stocksOwned += 1;
    stock.stockPrice *= 1.01;
  }
}

function sell(stockIndex) {
  let stock = stocks[stockIndex];
  if (stock.stocksOwned > 0) {
    playerMoney += stock.stockPrice;
    stock.stocksOwned -= 1;
    stock.stockPrice *= 0.99;
  }
}

function payDividends(stockIndex) {
  let stock = stocks[stockIndex];
  if (frameCount % 60 == 0) {
    playerMoney += stock.stocksOwned * stock.stockPrice * dividendRate;
  }
}


function drawLegend() {
  fill(0);
  textSize(16);

  // Draw the Stock price legend
  stroke("red");
  line(10, 20, 40, 20);
  noStroke();
  text("Stock Price", 50, 25);

  // Draw the SMA legend
  stroke("blue");
  line(10, 40, 40, 40);
  noStroke();
  text("SMA", 50, 45);

  // Draw the EMA legend
  stroke("purple");
  line(10, 60, 40, 60);
  noStroke();
  text("EMA", 50, 65);

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

function showMessage(event, message) {
  push();

  fill(0, event.alphaValue);
  textSize(24);
  textAlign(CENTER, CENTER);
  text(message, width / 2, event.yPosition);

  if (event.yPosition < height / 2) {
    event.yPosition += 5;
  } else if (event.alphaValue > 0) {
    event.alphaValue -= 5;
  }

  if (event.yPosition >= height / 2 && event.alphaValue <= 0) {
    event.yPosition = -30;
    event.alphaValue = 255;
  }
  pop();
}

function scheduleEvent(callback, start, duration) {
  console.log("scheduling event at " + start + " for " + duration + " ms");
  events.push(new GameEvent(callback, start, duration));
}

function updateEvents() {
  for (let i = events.length - 1; i >= 0; i--) {
    if (events[i] && events[i].isRunning()) {
      events[i].callback();
    }
  }
}