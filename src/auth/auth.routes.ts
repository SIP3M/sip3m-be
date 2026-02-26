import { Router } from 'express';
import { loginController, me, registerDosenController, registerReviewerController } from './auth.controller';
import { authMiddleware } from './middleware/auth.middleware';
import multer from 'multer';

const router = Router();
const upload = multer({ 
  dest: 'uploads/cv/', 
  limits: { 
    fileSize: 5 * 1024 * 1024 
  } 
});
// Register route
router.post('/auth/register/dosen', registerDosenController);

// Login route
router.post(
  '/auth/register/reviewer', 
  upload.single('cv'), 
  registerReviewerController
);

// Login route
router.post('/auth/login', loginController);

// Protected route to get current user info
router.get('/auth/me', authMiddleware,me);

// Oauth route
router.get('/auth/oauth/google', (req, res) => {
  const oauthUrl =
    'https://google-oauth-teal.vercel.app/api/auth/google';
  return res.redirect(oauthUrl);
});
export default router;
