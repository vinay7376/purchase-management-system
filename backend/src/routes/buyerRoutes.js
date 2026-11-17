import { Router } from 'express';
import { BuyerController } from '../controllers/buyerController.js';

const router = Router();

router.get('/dashboard', BuyerController.getDashboardStats);
router.get('/requirements', BuyerController.listRequirements);
router.get('/requirements/:id', BuyerController.getRequirementDetail);
router.post('/requirements/:id/approve', BuyerController.approveRequirement);
router.post('/requirements/:id/override', BuyerController.overrideRequirement);
router.get('/audit-logs', BuyerController.listAuditLogs);

export default router;
