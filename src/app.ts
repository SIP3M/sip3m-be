import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import authRoute from './auth/auth.routes';
import usersRoute from './users/users.routes';
import dosenRoute from './dosen/dosen.routes';

dotenv.config();

const app = express();

// middleware global
app.use(cors());
app.use(express.json());

app.use((req, _res, next) => {
  console.log('[INCOMING]', req.method, req.url);
  next();
});


// routes
app.use('/api', authRoute);
app.use('/api', usersRoute);
app.use('/api', dosenRoute);

// health check (penting buat test)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

export default app;
