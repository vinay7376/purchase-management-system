import { Router } from 'express';
import { ChatController } from '../controllers/chatController.js';

const router = Router();

router.post('/intake', ChatController.intakeMessage);
router.post('/create-pr', ChatController.createPRFromChat);

export default router;
