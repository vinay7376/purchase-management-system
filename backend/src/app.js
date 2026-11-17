import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import batchRoutes from './routes/batchRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import policyRoutes from './routes/policyRoutes.js';
import contractRoutes from './routes/contractRoutes.js';
import supplierRoutes from './routes/supplierRoutes.js';
import buyerRoutes from './routes/buyerRoutes.js';
import dataRoutes from './routes/dataRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const createApp = () => {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      service: 'Corvo Engineering Procurement Engine',
      version: '1.0.0',
    });
  });

  // Mount API routes
  app.use('/api', batchRoutes);
  app.use('/api/chat', chatRoutes);
  app.use('/api/policies', policyRoutes);
  app.use('/api/contracts', contractRoutes);
  app.use('/api/suppliers', supplierRoutes);
  app.use('/api/buyer', buyerRoutes);
  app.use('/api/data', dataRoutes);

  // Serve static frontend in production if built
  const candidatePaths = [
    path.resolve(__dirname, '../../frontend/dist'),
    path.resolve(__dirname, '../frontend/dist'),
    path.resolve(process.cwd(), 'frontend/dist'),
  ];
  const frontendDistPath = candidatePaths.find((p) => fs.existsSync(p));
  if (frontendDistPath) {
    app.use(express.static(frontendDistPath));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) {
        return next();
      }
      res.sendFile(path.join(frontendDistPath, 'index.html'));
    });
  }

  return app;
};
