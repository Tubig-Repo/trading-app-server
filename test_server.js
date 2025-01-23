const express = require("express");
const app = express();
const cors = require("cors");
const axios = require("axios");
const expressWS = require("express-ws");
// Accept Request from the frontend

const corsOptions = {
  origin: "*",
  credentials: true, //access-control-allow-credentials:true
  optionSuccessStatus: 200,
};
// Apply the cors config to the app
app.use(cors(corsOptions));

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
