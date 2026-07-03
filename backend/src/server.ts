import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectDB } from "./db";
import { sessionMiddleware } from "./middleware/session";
import transcriptRouter from "./routes/transcript";
import historyRouter from "./routes/history";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:5173";

// credentials: true + an explicit origin (not "*") are both required for the
// session cookie to be sent on cross-origin requests from the Vite dev server.
app.use(cors({ origin: FRONTEND_ORIGIN, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(sessionMiddleware);

app.use("/api", transcriptRouter);
app.use("/api", historyRouter);

const DB_STATES: Record<number, string> = {
  0: "disconnected",
  1: "connected",
  2: "connecting",
  3: "disconnecting",
};

app.get("/", (_req, res) => {
  res.json({ name: "subtitled. backend", version: "1.0.0" });
});

app.get("/health", (_req, res) => {
  const dbState = mongoose.connection.readyState;
  const db = DB_STATES[dbState] ?? "unknown";
  const ok = dbState === 1;

  res.status(ok ? 200 : 503).json({
    status: ok ? "ok" : "degraded",
    db,
  });
});

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`YT Translator backend running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("[db] Failed to connect to MongoDB:", err);
    process.exit(1);
  });
