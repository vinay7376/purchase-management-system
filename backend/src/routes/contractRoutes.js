import { Router } from 'express';
import multer from 'multer';
import { ContractController } from '../controllers/contractController.js';

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

router.get('/', ContractController.listContracts);
router.post('/', ContractController.createContract);
router.post('/upload-pdf', upload.single('file'), ContractController.uploadContractPDF);

export default router;
