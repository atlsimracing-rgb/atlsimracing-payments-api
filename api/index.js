import express from "express";
import { Client } from "square";

const app = express();
app.use(express.json());

// Root route
app.get("/", (req, res) => {
  res.send("Atlanta Sim Racing Payments API Running ✅");
});

// Health check
app.get("/healthz", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Test Square connection
app.get("/square-test", async (req, res) => {
  try {
    const client = new Client({
      accessToken: process.env.SQUARE_ACCESS_TOKEN,
      environment: "sandbox",
    });

    const response = await client.locationsApi.listLocations();
    res.json(response.result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/*
🔥 THIS PART IS CRITICAL FOR VERCEL
*/
export default function handler(req, res) {
  return app(req, res);
}

