import { Router } from "express";
import {
  loginController,
  me,
  registerDosenController,
  registerReviewerController,
} from "./auth.controller";
import { authMiddleware } from "./middleware/auth.middleware";
import multer from "multer";
import rateLimit from "express-rate-limit";

const router = Router();

// rate limiter untuk mencegah brute-force attack pada endpoint register dan login
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 50,
  message: {
    message:
      "Terlalu banyak pendaftaran dari jaringan ini. Silakan coba beberapa saat lagi.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  message: {
    message:
      "Akun ini terkunci sementara karena terlalu banyak percobaan gagal. Silakan coba lagi setelah 15 menit.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.body.identifier || req.ip;
  },
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});
// Register route
router.post("/auth/register/dosen", registerLimiter, registerDosenController);

// Login route
router.post(
  "/auth/register/reviewer",
  upload.single("cv"),
  registerLimiter,
  registerReviewerController,
);

// Login route
router.post("/auth/login", loginLimiter, loginController);

// Protected route to get current user info
router.get("/auth/me", authMiddleware, me);

// Oauth route
router.get("/auth/oauth/google", (req, res) => {
  const oauthUrl = "https://google-oauth-teal.vercel.app/api/auth/google";
  return res.redirect(oauthUrl);
});
export default router;
