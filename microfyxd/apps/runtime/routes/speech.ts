import { Router } from 'express';

/**
 * Legacy compatibility route.
 *
 * Direct provider calls were removed. Speech actions must be registered as a
 * Plugin Registry capability and invoked through the Tier-0-governed
 * `/api/autonomy/integrations/route` endpoint, which delegates only to
 * OmniRouter.
 */
export const speechRouter = Router();

speechRouter.all('/api/speech/:operation', (_req, res) => {
  res.status(410).json({
    success: false,
    error: 'Legacy speech integration is retired. Register a speech plugin and route the operation through OmniRouter.',
    authority: 'Paragon Dissector Tier-0',
  });
});
