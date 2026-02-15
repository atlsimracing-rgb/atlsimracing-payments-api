
  import express from "express";
import { Client, Environment } from "square";
import crypto from "crypto";

const app = express();
app.use(express.json());

// Square setup
const squareClient = new Client({
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
  environment: process.env.SQUARE_ENVIRONMENT === "production"
    ? Environment.Production
    : Environment.Sandbox,
});

app.get("/healthz", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/create-payment", async (req, res) => {
  try {
    const { sourceId, amount } = req.body;

    const response = await squareClient.paymentsApi.createPayment({
      sourceId,
      idempotencyKey: crypto.randomUUID(),
      amountMoney: {
        amount: amount,
        currency: "USD",
      },
      locationId: process.env.SQUARE_LOCATION_ID,
    });

    res.json(response.result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

export default app;
