import { Router } from 'express';
import * as orderController from '../controllers/order.controller.js';
import { protect, restrictTo } from '../middlewares/auth.middleware.js';
import type { Router as ExpressRouter } from 'express';

const router: ExpressRouter = Router();

router.post('/', protect, restrictTo('CUSTOMER'), orderController.createOrder);
router.get('/', protect, orderController.getMyOrders);
router.patch('/:id/status', protect, restrictTo('PROVIDER'), orderController.updateOrderStatus);

export default router;