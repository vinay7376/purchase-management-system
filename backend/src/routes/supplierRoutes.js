import { Router } from 'express';
import { SupplierController } from '../controllers/supplierController.js';

const router = Router();

router.get('/', SupplierController.listSuppliers);
router.get('/preferred/:itemCode', SupplierController.getPreferredRanking);
router.get('/export-preferred', SupplierController.exportPreferredCSV);

export default router;
