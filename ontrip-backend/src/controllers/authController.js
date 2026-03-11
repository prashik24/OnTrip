import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import { Readable } from "stream";
import User from "../models/User.js";
import Otp from "../models/Otp.js";
import { generateOtp } from "../utils/generateOtp.js";
import { sendOtpEmail } from "../config/mailer.js";
import { generateToken } from "../utils/generateToken.js";
import cloudinary from "../config/cloudinary.js";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    avatar: user.avatar || "",
    phone: user.phone || "",
    city: user.city || "",
    bio: user.bio || "",
    role: user.role,
    isEmailVerified: user.isEmailVerified,
  };
}

function uploadBufferToCloudinary(buffer, folder = "ontrip/profiles") {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    Readable.from(buffer).pipe(stream);
  });
}

export async function register(req, res) {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    const existing = await User.findOne({ email: cleanEmail });

    if (existing && existing.isEmailVerified) {
      return res.status(400).json({
        message: "Email already registered. Please login.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    let user = existing;

    if (!user) {
      user = await User.create({
        name,
        email: cleanEmail,
        passwordHash,
        isEmailVerified: false,
      });
    } else {
      user.name = name;
      user.passwordHash = passwordHash;
      await user.save();
    }

    await Otp.deleteMany({ email: cleanEmail, purpose: "register" });

    const otp = generateOtp();

    await Otp.create({
      email: cleanEmail,
      code: otp,
      purpose: "register",
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    await sendOtpEmail(cleanEmail, otp);

    return res.json({
      message: "OTP sent to your email",
      email: cleanEmail,
    });
  } catch (error) {
    console.error("register error", error);
    return res.status(500).json({
      message: "Registration failed",
    });
  }
}

export async function verifyRegisterOtp(req, res) {
  try {
    const { email, otp } = req.body;

    const cleanEmail = email.toLowerCase().trim();

    const otpDoc = await Otp.findOne({
      email: cleanEmail,
      code: otp,
      purpose: "register",
    });

    if (!otpDoc) {
      return res.status(400).json({
        message: "Invalid OTP",
      });
    }

    if (otpDoc.expiresAt < new Date()) {
      return res.status(400).json({
        message: "OTP expired",
      });
    }

    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    user.isEmailVerified = true;
    await user.save();

    await Otp.deleteMany({ email: cleanEmail, purpose: "register" });

    const token = generateToken(user._id);

    return res.json({
      message: "Email verified successfully",
      token,
      user: publicUser(user),
    });
  } catch (error) {
    console.error("verifyRegisterOtp error", error);
    return res.status(500).json({
      message: "OTP verification failed",
    });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;

    const cleanEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      return res.status(404).json({
        message: "Email is not registered. Please sign up.",
      });
    }

    if (!user.passwordHash) {
      return res.status(400).json({
        message: "This account uses Google login. Please continue with Google.",
      });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);

    if (!ok) {
      return res.status(400).json({
        message: "Password is wrong.",
      });
    }

    if (!user.isEmailVerified) {
      return res.status(403).json({
        message: "Please verify your email first",
      });
    }

    const token = generateToken(user._id);

    return res.json({
      message: "Login successful",
      token,
      user: publicUser(user),
    });
  } catch (error) {
    console.error("login error", error);
    return res.status(500).json({
      message: "Login failed",
    });
  }
}

export async function sendLoginOtp(req, res) {
  try {
    const { email } = req.body;

    const cleanEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      return res.status(404).json({
        message: "Email is not registered. Please sign up.",
      });
    }

    await Otp.deleteMany({ email: cleanEmail, purpose: "login" });

    const otp = generateOtp();

    await Otp.create({
      email: cleanEmail,
      code: otp,
      purpose: "login",
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    await sendOtpEmail(cleanEmail, otp);

    return res.json({
      message: "Login OTP sent",
    });
  } catch (error) {
    console.error("sendLoginOtp error", error);
    return res.status(500).json({
      message: "Could not send OTP",
    });
  }
}

export async function verifyLoginOtp(req, res) {
  try {
    const { email, otp } = req.body;

    const cleanEmail = email.toLowerCase().trim();

    const otpDoc = await Otp.findOne({
      email: cleanEmail,
      code: otp,
      purpose: "login",
    });

    if (!otpDoc) {
      return res.status(400).json({
        message: "Invalid OTP",
      });
    }

    if (otpDoc.expiresAt < new Date()) {
      return res.status(400).json({
        message: "OTP expired",
      });
    }

    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    await Otp.deleteMany({ email: cleanEmail, purpose: "login" });

    const token = generateToken(user._id);

    return res.json({
      message: "OTP login successful",
      token,
      user: publicUser(user),
    });
  } catch (error) {
    console.error("verifyLoginOtp error", error);
    return res.status(500).json({
      message: "OTP login failed",
    });
  }
}

export async function googleLogin(req, res) {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({
        message: "Google credential missing",
      });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    const googleId = payload.sub;
    const email = payload.email.toLowerCase().trim();
    const name = payload.name || "Google User";
    const picture = payload.picture || "";

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        name,
        email,
        googleId,
        avatar: picture,
        isEmailVerified: true,
      });
    } else {
      user.googleId = googleId;
      if (!user.avatar) user.avatar = picture;
      user.isEmailVerified = true;
      await user.save();
    }

    const token = generateToken(user._id);

    return res.json({
      message: "Google login successful",
      token,
      user: publicUser(user),
    });
  } catch (error) {
    console.error("googleLogin error", error);
    return res.status(400).json({
      message: "Google login failed",
    });
  }
}

export async function me(req, res) {
  return res.json({
    user: publicUser(req.user),
  });
}

export async function updateProfile(req, res) {
  try {
    const { name, phone, city, bio } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    user.name = name?.trim() || user.name;
    user.phone = phone?.trim() || "";
    user.city = city?.trim() || "";
    user.bio = bio?.trim() || "";

    await user.save();

    return res.json({
      message: "Profile updated successfully",
      user: publicUser(user),
    });
  } catch (error) {
    console.error("updateProfile error", error);
    return res.status(500).json({
      message: "Could not update profile",
    });
  }
}

export async function uploadProfileImage(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "Please select an image",
      });
    }

    const result = await uploadBufferToCloudinary(req.file.buffer);

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    user.avatar = result.secure_url;
    await user.save();

    return res.json({
      message: "Profile image uploaded successfully",
      imageUrl: result.secure_url,
      user: publicUser(user),
    });
  } catch (error) {
    console.error("uploadProfileImage error", error);
    return res.status(500).json({
      message: "Image upload failed",
    });
  }
}