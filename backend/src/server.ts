import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import './config/firebaseAdmin';
import validateEnv from './config/validateEnv';
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

dotenv.config();

const app = express();

app.use(cors());
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

app.use((_req, res) => res.status(404).json({ message: 'Not found', path: 'API route not found' }));
app.use(errorHandler);

validateEnv();
const PORT = Number(process.env.PORT) || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT} (Firestore only)`);
});