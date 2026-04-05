import express from "express";
import { subscribeEmail } from "../controllers/subscriberController.js";

const router = express.Router();

router.post("/subscribe", subscribeEmail);

export default router;