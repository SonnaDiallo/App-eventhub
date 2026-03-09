import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import os from 'os';
import './config/firebaseAdmin';
import { validateEnv } from './config/validateEnv';
import { apiLimiter } from './middleware/rateLimit';
import { errorHandler } from './middleware/errorHandler';
import healthRoutes from './routes/healthRoutes';
import eventRoutes from './routes/eventRoutes';
import authRoutes from './routes/authRoutes';
import categoryRoutes from './routes/categoryRoutes';
import ticketRoutes from './routes/ticketRoutes';
import friendRoutes from './routes/friendRoutes';
import chatRoutes from './routes/chatRoutes';
import externalRegistrationRoutes from './routes/externalRegistrationRoutes';
import uploadRoutes from './routes/uploadRoutes';
import reviewRoutes from './routes/reviewRoutes';
import paymentRoutes from './routes/paymentRoutes';
import ticketPdfRoutes from './routes/ticketPdfRoutes';
import userRoutes from './routes/userRoutes';
import adminRoutes from './routes/adminRoutes';

dotenv.config();

const app = express();

app.use(cors());
// IMPORTANT: Le webhook Stripe doit recevoir le body brut, donc on configure express.json après
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));
app.use(apiLimiter);

const publicPath = path.join(__dirname, '../public');
app.use('/images', express.static(path.join(publicPath, 'images')));

app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/external-events', externalRegistrationRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/payments', paymentRoutes);

app.use('/api/ticket-pdf', ticketPdfRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);

app.use((_req, res) => res.status(404).json({ message: 'Not found', path: 'API route not found' }));
app.use(errorHandler);

validateEnv();
const PORT = Number(process.env.PORT) || 5000;

/** Affiche les URLs d'accès et la ligne à mettre dans mobile/.env (plus besoin de toucher au code) */
function printLocalUrls() {
  const ifaces = os.networkInterfaces();
  const all: string[] = [];
  const preferred: string[] = []; // 172.20.x = souvent hotspot iPhone ; 192.168.x = WiFi / partage Android
  for (const name of Object.keys(ifaces)) {
    const iface = ifaces[name];
    if (!iface) continue;
    for (const conf of iface) {
      if (conf.family === 'IPv4' && !conf.internal) {
        const url = `http://${conf.address}:${PORT}/api`;
        all.push(url);
        if (/^192\.168\.|^172\.20\.|^10\./.test(conf.address)) preferred.push(url);
      }
    }
  }
  const suggested = preferred.length > 0 ? preferred[0] : all[0];
  console.log('\n--- API EventHub ---');
  console.log(`Port: ${PORT}`);
  if (all.length > 0) {
    if (preferred.length > 0) {
      console.log('Recommandé (partage / WiFi classique) :');
      preferred.forEach((u) => console.log('  ', u));
    }
    if (all.length > 1) {
      console.log('Autres interfaces :');
      all.filter((u) => !preferred.includes(u)).forEach((u) => console.log('  ', u));
    }
    console.log('\nDans mobile/.env mets (essaie la première si ça ne marche pas, une autre) :');
    console.log('  API_URL=' + suggested);
  } else {
    console.log('  (IP locale non détectée – utilise ton IP manuellement)');
  }
  console.log('---\n');
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  printLocalUrls();
});