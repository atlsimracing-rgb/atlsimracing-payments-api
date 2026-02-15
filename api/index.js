
import express from "express";
import crypto from "crypto";
import { Client } from "square";

const app = express();
app.use(express.json());

/**
 * Root
 */
app.get("/", (req, res) => {
  res.status(200).send("Atlanta Sim Racing Payments API Running ✅");
});

/**
 * Health check
 */
app.get("/healthz", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

/**
 * Square auth + locations test
 * Visit: /square-test
 */
app.get("/square-test", async (req, res) => {
  try {
    const env =
      (process.env.SQUARE_ENVIRONMENT || "sandbox").toLowerCase() === "production"
        ? "production"
        : "sandbox";

    const client = new Client({
      accessToken: process.env.SQUARE_ACCESS_TOKEN,
      environment: env,
    });

    const response = await client.locationsApi.listLocations();
    res.status(200).json(response.result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message || "Square test failed" });
  }
});

/**
 * CREATE PAYMENT (the one Wix calls)
 * POST /create-payment
 *
 * Body:
 * {
 *   sourceId: string,        // token from Square Web Payments SDK
 *   amountCents: number,     // subtotal in cents (ex: 4500)
 *   taxCents: number,        // tax in cents (ex: 315)
 *   bookingId?: string,
 *   customerEmail?: string,
 *   note?: string
 * }
 */
app.post("/create-payment", async (req, res) => {
  try {
    const {
      sourceId,
      amountCents,
      taxCents = 0,
      bookingId,
      customerEmail,
      note,
    } = req.body || {};

    if (!sourceId) return res.status(400).json({ ok: false, error: "Missing sourceId" });
    if (!amountCents || Number(amountCents) <= 0) {
      return res.status(400).json({ ok: false, error: "Invalid amountCents" });
    }

    const subtotal = Number(amountCents);
    const tax = Number(taxCents) || 0;
    const total = subtotal + tax;

    const env =
      (process.env.SQUARE_ENVIRONMENT || "sandbox").toLowerCase() === "production"
        ? "production"
        : "sandbox";

    const squareAccessToken = process.env.SQUARE_ACCESS_TOKEN;
    const squareLocationId = process.env.SQUARE_LOCATION_ID;

    if (!squareAccessToken || !squareLocationId) {
      return res.status(500).json({
        ok: false,
        error: "Missing Square env vars (SQUARE_ACCESS_TOKEN / SQUARE_LOCATION_ID)",
      });
    }

    const client = new Client({
      accessToken: squareAccessToken,
      environment: env,
    });

    const result = await client.paymentsApi.createPayment({
      sourceId,
      idempotencyKey: crypto.randomUUID(),
      amountMoney: { amount: total, currency: "USD" },
      locationId: squareLocationId,
      note:
        note ||
        (bookingId ? `Booking ${bookingId} (subtotal=${subtotal}, tax=${tax})` : "Booking payment"),
      receiptEmail: customerEmail || undefined,
    });

    return res.status(200).json({
      ok: true,
      payment: result.result.payment,
    });
  } catch (err) {
    // Square errors usually have useful text in err.message
    return res.status(500).json({
      ok: false,
      error: err?.message || "Payment failed",
    });
  }
});

/**
 * 🔥 Critical for Vercel serverless
 */
export default function handler(req, res) {
  return app(req, res);
}
