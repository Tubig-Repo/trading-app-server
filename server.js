const express = require("express");
const app = express();
const cors = require("cors");
const axios = require("axios");
const WebSocket = require("ws");
const { Server } = require("ws");

// Accept Request from the front end
const corsOptions = {
  origin: "*",
  credentials: true, //access-control-allow-credentials:true
  optionSuccessStatus: 200,
};

app.use(cors(corsOptions));

app.get("/api", async (req, res) => {
  res.json({ fruits: ["Apple", "Orange", "Grapes"] });
});
// Get BTC Kline Data
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
});

// Get Live Data VIA WebSocket
// WebSocket server for clients
const webSocketServer = new Server({ port: 3000, path: "/live" });

webSocketServer.on("connection", (ws) => {
  console.log("Client connected");

  // Initialize Bybit WebSocket when the first client connects

  bybitSocket = new WebSocket("wss://stream.bybit.com/v5/public/linear");

  bybitSocket.on("open", () => {
    console.log("Connected to Bybit WebSocket");
    bybitSocket.send(
      JSON.stringify({
        op: "subscribe",
        args: ["kline.1.BTCUSDT"],
      })
    );
  });

  bybitSocket.on("message", (data) => {
    const parsedData = JSON.parse(data);
    const liveData = parsedData.data;
    console.log(liveData);

    if (parsedData.topic === "kline.1.BTCUSDT" && liveData.length > 0) {
      const timeStamp =
        liveData.length > 0 && liveData[0].timestamp
          ? Math.floor(
              new Date(parseInt(liveData[0].timestamp)).getTime() / 1000
            )
          : null;

      const message = JSON.stringify({
        time: timeStamp,
        open: parseFloat(liveData[0].open),
        high: parseFloat(liveData[0].high),
        low: parseFloat(liveData[0].low),
        close: parseFloat(liveData[0].close),
        confirm: liveData[0].confirm,
      });

      // Broadcast data to all connected clients
      webSocketServer.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
    }
  });

  bybitSocket.on("error", (error) => {
    console.error("Error with Bybit WebSocket:", error);
  });

  bybitSocket.on("close", () => {
    console.log("Bybit WebSocket closed");
    bybitSocket = null; // Clear the reference
  });

  // Handle client disconnection
  ws.on("close", () => {
    console.log("Client disconnected");

    // Close Bybit WebSocket when no clients are connected
    if (bybitSocket) {
      bybitSocket.close();
      bybitSocket = null;
    }
  });
});
app.listen(8080, () => {
  console.log("server started on port 8080");
});
