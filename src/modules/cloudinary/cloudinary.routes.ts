import { Router } from 'express';
import { getUploadSignature } from './cloudinary.controller';
import { requireAuth } from '../../middleware/auth.middleware';

const router: Router = Router();

router.post('/signature', requireAuth, getUploadSignature);

export default router;
