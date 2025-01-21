const express = require("express");
const app = express();
const cors = require("cors");
const axios = require("axios");
const WebSocket = require("ws");
const { Server } = require("ws");

// Accept Request from the front end
const corsOptions = {
   origin:'*', 
   credentials:true,            //access-control-allow-credentials:true
   optionSuccessStatus:200,
};

app.use(cors(corsOptions));

app.get("/api", (req, res) => {
  res.json({ fruits: ["apple", "orange", "grapes"] });
});

app.get("/btc", async (req, res) => {
  const {
    symbol = "BTCUSDT",
    interval = "1",
    limit = 200,
    category = "inverse",
  } = req.query;

  const url = "https://api.bybit.com/v5/market/kline";

  const response = await axios.get(url, {
    params: {
      category,
      symbol,
      interval,
      limit,
    },
  });

  const klineData = response.data.result.list
    .map((item) => ({
      time: Math.floor(new Date(parseInt(item[0])).getTime() / 1000),
      open: parseFloat(item[1]),
      high: parseFloat(item[2]),
      low: parseFloat(item[3]),
      close: parseFloat(item[4]),
    }))
    .sort((a, b) => a.time - b.time);
  // Send response
  res.json({
    success: true,
    data: klineData,
  });

  console.log(klineData)
});
// Websocket connection to Bybit testnet
const btcSocket = new WebSocket("wss://stream.bybit.com/v5/public/linear");
// Websocket server for clients
const webSocketServer = new Server({ port: 3000 });
//Send Data to the Client
btcSocket.on("open", () => {
  console.log("Connected to Bybit WebSocket");
  btcSocket.send(
    JSON.stringify({
      op: "subscribe",
      args: ["kline.1.BTCUSDT"], // Replace with your desired market
    })
  );
});

btcSocket.on("message", (data) => {
  const parsedData = JSON.parse(data);
  const liveData = parsedData.data; // Extract the last price
  console.log(liveData)
  if (parsedData.topic === "kline.1.BTCUSDT" && liveData.length > 0) {
    const timeStamp =
    liveData.length > 0 && liveData[0].timestamp
      ? Math.floor(new Date(parseInt(liveData[0].timestamp)).getTime() / 1000)
      : null; // or a default value
    const message = JSON.stringify({
      time: timeStamp,
      open: parseFloat(liveData[0].open), 
      high: parseFloat(liveData[0].high),
      low: parseFloat(liveData[0].low),
      close: parseFloat(liveData[0].close),
      confirm: liveData[0].confirm
    });

        
    // Send data to all connected WebSocket clients
    webSocketServer.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }
});

app.listen(8080, () => {
  console.log("server started on port 8080");
});
