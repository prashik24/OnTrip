import express from "express";
import {
  register,
  verifyRegisterOtp,
  login,
  sendLoginOtp,
  verifyLoginOtp,
  googleLogin,
  me,
  updateProfile,
  uploadProfileImage,
} from "../controllers/authController.js";
import { protect } from "../middleware/auth.js";
import upload from "../middleware/upload.js";

const router = express.Router();

router.post("/register", register);
router.post("/verify-register-otp", verifyRegisterOtp);
router.post("/login", login);
router.post("/send-login-otp", sendLoginOtp);
router.post("/verify-login-otp", verifyLoginOtp);
router.post("/google", googleLogin);

router.get("/me", protect, me);
router.put("/me", protect, updateProfile);
router.post("/upload-profile-image", protect, upload.single("image"), uploadProfileImage);

export default router;