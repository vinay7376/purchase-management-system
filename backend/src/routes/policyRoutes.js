import { Router } from 'express';
import multer from 'multer';
import { PolicyController } from '../controllers/policyController.js';

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

router.get('/', PolicyController.listPolicies);
router.get('/:version', PolicyController.getPolicy);
router.post('/upload-amendment', upload.single('file'), PolicyController.uploadAmendment);
router.post('/:version/approve', PolicyController.approvePolicy);
router.post('/:version/reject', PolicyController.rejectPolicy);

export default router;
