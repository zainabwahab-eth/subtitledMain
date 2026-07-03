import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/yt-translator";

export async function connectDB(): Promise<void> {
  await mongoose.connect(MONGODB_URI);
  const host = mongoose.connection.host;
  console.log(`[db] Connected to MongoDB (${host})`);
}
