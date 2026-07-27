/**
 * Route index — mounts all backend routes onto the Express app.
 */

import { Express } from 'express';
import { groqRouter } from './groq.js';
import { generateRouter } from './generate.js';
import { importRouter } from './import.js';
import { exportRouter } from './export.js';
import { speechRouter } from './speech.js';

export function mountRoutes(app: Express) {
  app.use(groqRouter);
  app.use(generateRouter);
  app.use(importRouter);
  app.use(exportRouter);
  app.use(speechRouter);
}
