import { Router } from 'express';
import { DataController } from '../controllers/dataController.js';

const router = Router();

router.post('/seed', DataController.seedEndpoint);
router.get('/status', DataController.getStatus);

export default router;
