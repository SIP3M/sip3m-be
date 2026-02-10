import { Router } from 'express';
import { login, me, register } from './auth.controller';
import { authMiddleware } from './middleware/auth.middleware';

const router = Router();

// Register route
router.post('/auth/register', register);

// Login route
router.post('/auth/login', login);

console.log('[AUTH MIDDLEWARE TYPE]', typeof authMiddleware);
console.log('[AUTH MIDDLEWARE VALUE]', authMiddleware);

// Protected route to get current user info
router.get('/auth/me', authMiddleware,me);

// comingsoon route

// Admin & staff only assign reviewer, approve hibah
// router.post(
//   '/proposals/:id/assign-reviewer',
//   authMiddleware,
//   requireRole([ROLES.ADMIN_LPPM, ROLES.STAFF_LPPM]),
//   assignReviewer,
// );

// Dosen only submit proposal
// router.post(
//   '/proposals',
//   authMiddleware,
//   requireRole(['DOSEN']),
//   submitProposal,
// );

// Reviewer only submit review
// router.post(
//   '/reviews',
//   authMiddleware,
//   requireRole(['REVIEWER']),
//   submitReview,
// );




export default router;
