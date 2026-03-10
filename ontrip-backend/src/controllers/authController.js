import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import User from "../models/User.js";
import Otp from "../models/Otp.js";
import { generateOtp } from "../utils/generateOtp.js";
import { sendOtpEmail } from "../config/mailer.js";
import { generateToken } from "../utils/generateToken.js";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export async function register(req, res) {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing && existing.isEmailVerified) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    let user = existing;
    if (!user) {
      user = await User.create({
        name,
        email: email.toLowerCase(),
        passwordHash,
        isEmailVerified: false,
      });
    } else {
      user.name = name;
      user.passwordHash = passwordHash;
      await user.save();
    }

    await Otp.deleteMany({ email: user.email, purpose: "register" });

    const otp = generateOtp();
    await Otp.create({
      email: user.email,
      code: otp,
      purpose: "register",
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    await sendOtpEmail(user.email, otp);

    return res.json({
      message: "OTP sent to email",
      email: user.email,
    });
  } catch (error) {
    console.error("register error", error);
    return res.status(500).json({ message: "Registration failed" });
  }
}

export async function verifyRegisterOtp(req, res) {
  try {
    const { email, otp } = req.body;

    const otpDoc = await Otp.findOne({
      email: email.toLowerCase(),
      code: otp,
      purpose: "register",
    });

    if (!otpDoc) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (otpDoc.expiresAt < new Date()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.isEmailVerified = true;
    await user.save();
    await Otp.deleteMany({ email: user.email, purpose: "register" });

    const token = generateToken(user._id);

    return res.json({
      message: "Email verified successfully",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isEmailVerified: user.isEmailVerified,
      },
    });
  } catch (error) {
    console.error("verifyRegisterOtp error", error);
    return res.status(500).json({ message: "OTP verification failed" });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !user.passwordHash) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    if (!user.isEmailVerified) {
      return res.status(403).json({ message: "Please verify your email first" });
    }

    const token = generateToken(user._id);

    return res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isEmailVerified: user.isEmailVerified,
      },
    });
  } catch (error) {
    console.error("login error", error);
    return res.status(500).json({ message: "Login failed" });
  }
}

export async function sendLoginOtp(req, res) {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await Otp.deleteMany({ email: user.email, purpose: "login" });

    const otp = generateOtp();
    await Otp.create({
      email: user.email,
      code: otp,
      purpose: "login",
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    await sendOtpEmail(user.email, otp);

    return res.json({ message: "Login OTP sent" });
  } catch (error) {
    console.error("sendLoginOtp error", error);
    return res.status(500).json({ message: "Could not send OTP" });
  }
}

export async function verifyLoginOtp(req, res) {
  try {
    const { email, otp } = req.body;

    const otpDoc = await Otp.findOne({
      email: email.toLowerCase(),
      code: otp,
      purpose: "login",
    });

    if (!otpDoc) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (otpDoc.expiresAt < new Date()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await Otp.deleteMany({ email: user.email, purpose: "login" });

    const token = generateToken(user._id);

    return res.json({
      message: "OTP login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("verifyLoginOtp error", error);
    return res.status(500).json({ message: "OTP login failed" });
  }
}

export async function googleLogin(req, res) {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ message: "Google credential missing" });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    const googleId = payload.sub;
    const email = payload.email;
    const name = payload.name || "Google User";
    const picture = payload.picture || "";

    let user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      user = await User.create({
        name,
        email: email.toLowerCase(),
        googleId,
        avatar: picture,
        isEmailVerified: true,
      });
    } else {
      user.googleId = googleId;
      user.avatar = picture;
      user.isEmailVerified = true;
      await user.save();
    }

    const token = generateToken(user._id);

    return res.json({
      message: "Google login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    console.error("googleLogin error", error);
    return res.status(400).json({ message: "Google login failed" });
  }
}

export async function me(req, res) {
  return res.json({
    user: req.user,
  });
}