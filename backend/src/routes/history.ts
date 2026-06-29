import { Router, Request, Response } from "express";
import { getHistoryForSession } from "../services/historyService";

const router = Router();

router.get("/history", async (req: Request, res: Response) => {
  try {
    const history = await getHistoryForSession(req.sessionId);
    return res.json({ history });
  } catch (err) {
    console.error("[history] Failed:", err);
    return res.status(500).json({
      error: "Failed to fetch history",
      details: err instanceof Error ? err.message : String(err),
    });
  }
});

export default router;
