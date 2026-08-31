import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { setupWebSocket } from './services/websocket.service.js';
import { errorHandler } from './middlewares/errorHandler.js';

// Import routes
import authRoutes from './routes/auth.routes.js';
import distritosRoutes from './routes/distritos.routes.js';
import localesRoutes from './routes/locales.routes.js';
import mesasRoutes from './routes/mesas.routes.js';
import candidatosRoutes from './routes/candidatos.routes.js';
import usuariosRoutes from './routes/usuarios.routes.js';
import asignacionesRoutes from './routes/asignaciones.routes.js';
import resultadosRoutes from './routes/resultados.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// WebSocket setup
setupWebSocket(httpServer);

// Security middlewares
app.use(helmet());

// CORS configuration (supports comma-separated origins)
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map(o => o.trim());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { success: false, message: 'Demasiados intentos. Intente nuevamente en 1 minuto.' }
});
app.use('/api/auth', authLimiter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now(), environment: process.env.NODE_ENV || 'development' });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/distritos', distritosRoutes);
app.use('/api/locales', localesRoutes);
app.use('/api/mesas', mesasRoutes);
app.use('/api/candidatos', candidatosRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/asignaciones', asignacionesRoutes);
app.use('/api/resultados', resultadosRoutes);
app.use('/api/dashboard', dashboardRoutes);

// 404 handler
app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint no encontrado' });
});

// Centralized Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🗳️  Sistema Electoral Backend`);
  console.log(`   Entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Puerto:  ${PORT}`);
  console.log(`   CORS:    ${allowedOrigins.join(', ')}`);
});

export default app;
