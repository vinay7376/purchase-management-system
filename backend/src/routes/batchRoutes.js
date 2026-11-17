import { Router } from 'express';
import multer from 'multer';
import { BatchController } from '../controllers/batchController.js';

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

router.post('/process-batch', upload.single('file'), BatchController.processBatch);
router.post('/export-decisions', BatchController.exportDecisionsCSV);

export default router;
