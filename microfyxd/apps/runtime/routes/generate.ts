import { Router } from 'express';

/**
 * Legacy compatibility route.
 * Code-generation providers must be declared in Plugin Registry and invoked
 * through the authenticated OmniRouter endpoint under Paragon Dissector Tier-0.
 */
export const generateRouter = Router();

generateRouter.all('/api/generate', (_req, res) => {
  res.status(410).json({
    success: false,
    error: 'Legacy generation is retired. Submit a governed goal or use a registered Plugin Registry capability through OmniRouter.',
    authority: 'Paragon Dissector Tier-0',
  });
});
