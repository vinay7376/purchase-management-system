import { Contract } from '../models/Contract.js';
import { PDFExtractionService } from '../services/pdfExtractionService.js';
import { Supplier } from '../models/Supplier.js';
import { AuditLog } from '../models/AuditLog.js';

export class ContractController {
  /**
   * GET /api/contracts
   */
  static async listContracts(req, res) {
    try {
      const contracts = await Contract.find().sort({ start_date: -1 });
      const suppliers = await Supplier.find().lean();
      const supMap = new Map(suppliers.map((s) => [s.supplier_id, s]));

      const enriched = contracts.map((c) => {
        const sup = supMap.get(c.supplier_id);
        const remaining = Math.max(0, c.value_cap - c.consumed_value);
        const utilizationPct = c.value_cap > 0 ? (c.consumed_value / c.value_cap) * 100 : 0;
        return {
          ...c.toObject(),
          supplier_status: sup ? sup.status : 'Unknown',
          remaining_ceiling: remaining,
          utilization_pct: Math.round(utilizationPct * 10) / 10,
          is_active_supplier: sup?.status === 'Active',
        };
      });

      return res.json(enriched);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * POST /api/contracts/upload-pdf
   */
  static async uploadContractPDF(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Contract PDF file required.' });
      }

      const text = await PDFExtractionService.extractText(req.file.buffer);
      const parsed = PDFExtractionService.parseContractText(text);

      if (!parsed.contract_id || !parsed.supplier_id) {
        return res.status(400).json({
          error: 'Failed to extract required contract details from PDF.',
          extractedPreview: text.slice(0, 300),
        });
      }

      // Check supplier name in supplier master if missing
      if (!parsed.supplier_name) {
        const sup = await Supplier.findOne({ supplier_id: parsed.supplier_id });
        if (sup) parsed.supplier_name = sup.name;
      }

      // Upsert contract
      let contract = await Contract.findOne({ contract_id: parsed.contract_id });
      if (contract) {
        contract.supplier_id = parsed.supplier_id;
        contract.supplier_name = parsed.supplier_name;
        contract.start_date = parsed.start_date;
        contract.end_date = parsed.end_date;
        contract.value_cap = parsed.value_cap;
        contract.lines = parsed.lines;
        contract.source = 'PDF_UPLOAD';
        await contract.save();
      } else {
        contract = await Contract.create({
          contract_id: parsed.contract_id,
          supplier_id: parsed.supplier_id,
          supplier_name: parsed.supplier_name,
          start_date: parsed.start_date,
          end_date: parsed.end_date,
          value_cap: parsed.value_cap,
          consumed_value: 0,
          lines: parsed.lines,
          source: 'PDF_UPLOAD',
        });
      }

      await AuditLog.create({
        user: req.body.user || 'Buyer',
        action: 'CONTRACT_PDF_REGISTERED',
        entity_type: 'CONTRACT',
        entity_id: parsed.contract_id,
        details: parsed,
      });

      return res.json({
        success: true,
        message: `Contract ${parsed.contract_id} successfully parsed and registered!`,
        contract,
      });
    } catch (err) {
      console.error('[ContractController] Error uploading PDF:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * POST /api/contracts
   */
  static async createContract(req, res) {
    try {
      const { contract_id, supplier_id, supplier_name, start_date, end_date, value_cap, lines } = req.body;

      if (!contract_id || !supplier_id || !start_date || !end_date || !value_cap) {
        return res.status(400).json({ error: 'Missing required contract fields.' });
      }

      const contract = await Contract.create({
        contract_id,
        supplier_id,
        supplier_name,
        start_date,
        end_date,
        value_cap: parseFloat(value_cap),
        consumed_value: 0,
        lines: lines || [],
        source: 'REGISTER',
      });

      return res.json({ success: true, contract });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
}
