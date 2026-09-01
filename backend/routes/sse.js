import express from "express";
import { handleSubscribeClients } from "../SSE_service/subscribeClients.js";

const router = express.Router();

router.get("/", handleSubscribeClients);

export default router;
