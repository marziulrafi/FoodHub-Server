import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import authRoutes from './auth.routes.js';


const router: ExpressRouter = Router();

router.use('/auth', authRoutes);


export default router;