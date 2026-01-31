import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import type { Router as ExpressRouter } from 'express';

const router: ExpressRouter = Router();

router.post('/register', authController.register);
router.post('/login', authController.login);

export default router;