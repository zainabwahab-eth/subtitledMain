import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/yt-translator";

export async function connectDB(): Promise<void> {
  await mongoose.connect(MONGODB_URI);
  console.log(`[db] Connected to MongoDB (${MONGODB_URI})`);
}
