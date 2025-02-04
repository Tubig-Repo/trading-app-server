const express = require("express");
const app = express();
const cors = require("cors");
const axios = require("axios");
const createWebSocketServer = require("./websocketServer.js");
const crypto = require("crypto");
require("dotenv").config();

// Accept Request from the front end
const corsOptions = {
  origin: "*",
  credentials: true, //access-control-allow-credentials:true
  optionSuccessStatus: 200,
};

app.use(cors(corsOptions));

// Get BTC Kline Data
app.get("/btc", async (req, res) => {
  // Hardcoded Request but should be from the front end
  const {
    symbol = "BTCUSDT",
    interval = "1",
    limit = 200,
    category = "linear",
  } = req.query;
  // End point for kline data
  const url = "https://api.bybit.com/v5/market/kline";
  // fetch properties only needed for the front-end
  const response = await axios.get(url, {
    params: {
      category,
      symbol,
      interval,
      limit,
    },
  });
  // Format data where charts can read it to the front-end
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

app.get("/history", async (req, res) => {
  try {
    // Hardcoded request that should be from the front end request
    const {
      symbol = "BTCUSDT",
      category = "linear",
      execType = "Trade",
    } = req.query;
    // End point for trade history
    const url = "https://api-demo.bybit.com/v5/execution/list";
    // API KEYS and Secret
    const API_KEY = process.env.API_KEY;
    const API_SECRET = process.env.API_SECRET;
    // Parameters for getting the data and API Key
    const params = {
      symbol,
      category,
      execType,
      api_key: API_KEY,
      timestamp: Date.now(),
    };

    // Generate HMAC Signature
    const queryString = Object.keys(params)
      .sort()
      .map((key) => `${key}=${params[key]}`)
      .join("&");

    const signature = crypto
      .createHmac("sha256", API_SECRET)
      .update(queryString)
      .digest("hex");

    // Sign the signature
    params.sign = signature;

    // Make the request
    const response = await axios.get(url, { params });

    console.log(response.data.result);

    res.json({
      success: true,
      data: response.data.result,
    });
  } catch (err) {
    console.error("Error fetching order history:", err.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch order history",
    });
  }
});

// Get Live Data VIA WebSocket
createWebSocketServer(3000);

app.listen(8080, () => {
  console.log("server started on port 8080");
});
