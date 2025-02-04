const WebSocket = require("ws");
const { Server } = require("ws");

const createWebsocketServer = (server) => {
  const webSocketServer = new Server({ port: server, path: "/live" });

  webSocketServer.on("connection", (ws) => {
    console.log("Client connected");

    // Initialize Bybit WebSocket when the first client connects
    bybitSocket = new WebSocket("wss://stream.bybit.com/v5/public/linear");

    // Subscribe to the 1m data
    bybitSocket.on("open", () => {
      console.log("Connected to Bybit WebSocket");
      // Send the attribute of the data to subscribe to
      bybitSocket.send(
        JSON.stringify({
          op: "subscribe",
          args: ["kline.1.BTCUSDT"],
        })
      );
    });

    // Data Received and Sent to the Client
    bybitSocket.on("message", (data) => {
      const parsedData = JSON.parse(data);
      const liveData = parsedData.data;

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

  return webSocketServer;
};

module.exports = createWebsocketServer;
