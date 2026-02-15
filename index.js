import express from "express";

const app = express();
app.use(express.json());

// Health route
app.get("/healthz", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// Square payment endpoint
app.post("/api/payments/process", async (req, res) => {
  try {
    const { amount, sourceId, idempotencyKey, currency = "USD" } = req.body;

    if (!amount || !sourceId || !idempotencyKey) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
      });
    }

    const accessToken = process.env.SQUARE_ACCESS_TOKEN;
    const locationId = process.env.SQUARE_LOCATION_ID;

    if (!accessToken || !locationId) {
      return res.status(500).json({
        success: false,
        error: "Square credentials not configured",
      });
    }

    const squareResponse = await fetch(
      "https://connect.squareupsandbox.com/v2/payments",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "Square-Version": "2024-01-18",
        },
        body: JSON.stringify({
          source_id: sourceId,
          idempotency_key: idempotencyKey,
          location_id: locationId,
          amount_money: {
            amount: Math.round(amount),
            currency,
          },
        }),
      }
    );

    const data = await squareResponse.json();

    if (!squareResponse.ok) {
      return res.status(squareResponse.status).json({
        success: false,
        error: data,
      });
    }

    return res.json({
      success: true,
      payment: data.payment,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

export default app;
