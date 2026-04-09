import { Router } from 'express';
import {
  uploadImage,
  getUserImages,
  getImage,
  removeImage,
} from './images.controller';
import { requireAuth } from '../../middleware/auth.middleware';

const router: Router = Router();


router.post('/', requireAuth, uploadImage);
router.get('/', requireAuth, getUserImages);
router.get('/:publicId', getImage);
router.delete('/:publicId', requireAuth, removeImage);

export default router;
