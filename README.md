<h2 align="center">HTTP ExpressJS</h1>

<p align="center">
    <img width="250" src="screenshot/http/Demo2.png" alt="Console">
</p>

Its still the same as other `DDoS ​​HTTP Flood Requests`, in this version it just adds a web UI to make it more pleasing good. this is made with expressjs and still not fixed for serverless hosting experiments such as vercel, etc. if u want to try serverless, you can add scripted it yourself. cuz only here to make perpose educational lessons.

If u want it to be used so that everyone can use it, u can use `Ngrok` as a server to get it online thid script.

#### Requirements

```javascript
npm install express cloudscraper ws multer fs path
```

#### Installation

```javascript
npm install webjsflood && mv node_modules/webjsflood ./ && cd webjsflood
```

#### Lets try

```javascript
node app.js
```

#### Ngrok server

u want to put this web script server online with Ngrok, u can follow the steps below, but u must already have the Ngrok token, if you dont have it, you can register first. [Register Ngrok](https://dashboard.ngrok.com/).


- Installation resource ngrok

```javascript
curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null && echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list && sudo apt update && sudo apt install ngrok
```
- Change this `<token>` with u token ngrok

```javascript
ngrok config add-authtoken <token>
```

- adjust the port u want to use, 3000 has been provided as in the script.

```javascript
ngrok http 3000
````

#### License

This project is licensed under the [GPL-3.0 License](https://github.com/naix0x/http-express/blob/main/LICENSE).
