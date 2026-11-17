import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import { Item } from '../models/Item.js';
import { Supplier } from '../models/Supplier.js';
import { Contract } from '../models/Contract.js';
import { POHistory } from '../models/POHistory.js';
import { Policy } from '../models/Policy.js';
import { RequirementGroup } from '../models/RequirementGroup.js';
import { PurchaseOrder } from '../models/PurchaseOrder.js';
import { PurchaseRequisition } from '../models/PurchaseRequisition.js';
import { DecisionService } from '../engine/decisionService.js';

export class BatchController {
  /**
   * POST /api/process-batch
   */
  static async processBatch(req, res) {
    try {
      let csvContent = '';

      if (req.file) {
        csvContent = req.file.buffer.toString('utf-8');
      } else if (req.body && req.body.csvData) {
        csvContent = req.body.csvData;
      } else {
        return res.status(400).json({ error: 'No CSV file or csvData provided.' });
      }

      // Strip UTF-8 BOM if present
      if (csvContent.charCodeAt(0) === 0xfeff) {
        csvContent = csvContent.slice(1);
      }

      // Parse CSV rows with normalized column headers
      const records = parse(csvContent, {
        columns: (header) =>
          header.map((h) =>
            h.trim().replace(/^\ufeff/, '').toLowerCase().replace(/[\s-]+/g, '_')
          ),
        skip_empty_lines: true,
        trim: true,
      });

      if (!records || records.length === 0) {
        return res.status(400).json({ error: 'CSV file is empty or invalid.' });
      }

      // Map CSV records to RawPRLine format safely
      const rawLines = records
        .filter((r) => r.pr_no || r.pr_number || r.description)
        .map((r) => {
          const prNo = r.pr_no || r.pr_number || r.prno || '';
          const prLine = parseInt(r.pr_line || r.line || r.pr_line_no || '1', 10);
          const estPrice = r.estimated_unit_price ? parseFloat(r.estimated_unit_price) : undefined;
          return {
            pr_no: String(prNo).trim(),
            pr_line: isNaN(prLine) ? 1 : prLine,
            created_at: r.created_at ? new Date(r.created_at) : new Date(),
            requester: r.requester || 'Requester',
            department: r.department || 'Operations',
            plant: String(r.plant || '').trim().toUpperCase(),
            item_code: r.item_code ? String(r.item_code).trim() : undefined,
            description: String(r.description || '').trim(),
            quantity: parseFloat(r.quantity) || 1,
            uom: String(r.uom || 'NOS').trim().toUpperCase(),
            estimated_unit_price: isNaN(estPrice) ? undefined : estPrice,
            need_by_date: r.need_by_date || '',
            urgency: r.urgency || 'Normal',
          };
        });

      // Load master data from database
      const [items, suppliers, contracts, poHistory] = await Promise.all([
        Item.find().lean(),
        Supplier.find().lean(),
        Contract.find().lean(),
        POHistory.find().lean(),
      ]);

      // Resolve policy to apply
      const requestedPolicyVersion = req.query.policyVersion;
      let policyDoc;
      if (requestedPolicyVersion) {
        policyDoc = await Policy.findOne({ version: requestedPolicyVersion });
      }
      if (!policyDoc) {
        // Find currently active policy, or latest
        policyDoc = await Policy.findOne({ status: 'ACTIVE' }).sort({ effective_date: -1 });
      }
      if (!policyDoc) {
        policyDoc = await Policy.findOne().sort({ effective_date: -1 });
      }

      if (!policyDoc) {
        return res.status(500).json({ error: 'No procurement policy found in database.' });
      }

      // Execute Decision Engine
      const service = new DecisionService(items, suppliers, contracts, poHistory);
      const result = service.processBatch(rawLines, policyDoc);

      // Persist in DB (optional flag: persist=true, default true)
      const persist = req.query.persist !== 'false';
      const batchId = `BATCH-${Date.now()}`;

      if (persist) {
        // Clear prior pending batch or store under unique batchId
        for (const reqGroup of result.requirements) {
          await RequirementGroup.create({
            group_id: reqGroup.group_id,
            batch_id: batchId,
            plant: reqGroup.plant,
            resolved_item_code: reqGroup.resolved_item_code,
            total_quantity: reqGroup.total_quantity,
            unit_price: reqGroup.unit_price,
            group_value_inr: reqGroup.group_value_inr,
            need_by_date: reqGroup.need_by_date,
            created_at: reqGroup.created_at,
            is_emergency: reqGroup.is_emergency,
            is_new: reqGroup.is_new,
            decision: reqGroup.decision,
            route: reqGroup.route,
            supplier_id: reqGroup.supplier_id,
            suggested_supplier_ids: reqGroup.suggested_supplier_ids,
            po_id: reqGroup.po_id,
            policy_version: reqGroup.policy_version,
            clause: reqGroup.clause,
            reason: reqGroup.reason,
            pr_lines: reqGroup.lines.map((l) => ({
              pr_no: l.pr_no,
              pr_line: l.pr_line,
              description: l.description,
              quantity: l.quantity,
              need_by_date: l.need_by_date,
              urgency: l.urgency,
            })),
            status: 'DECIDED',
          });
        }
      }

      return res.json({
        batchId,
        policyVersion: policyDoc.version,
        summary: {
          totalPrLines: result.totalPrLines,
          totalRequirements: result.totalRequirements,
          totalPOs: result.totalPOs,
          notProcessedCount: result.notProcessedCount,
          poDecisions: result.requirements.filter((r) => r.decision === 'PO').length,
          sourcingRequests: result.requirements.filter((r) => r.decision === 'SOURCING_REQUEST').length,
          emergencyRequirements: result.requirements.filter((r) => r.is_emergency).length,
        },
        records: result.records,
        requirements: result.requirements,
      });
    } catch (err) {
      console.error('[BatchController] Error processing batch:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * POST /api/export-decisions
   * Returns CSV matching the 13 required columns
   */
  static async exportDecisionsCSV(req, res) {
    try {
      const records = req.body.records;
      if (!records || !Array.isArray(records)) {
        return res.status(400).json({ error: 'No records provided for CSV export.' });
      }

      const csvData = stringify(records, {
        header: true,
        columns: [
          'pr_no',
          'pr_line',
          'resolved_item_code',
          'group_id',
          'po_id',
          'decision',
          'route',
          'supplier_id',
          'unit_price',
          'group_value_inr',
          'suggested_supplier_ids',
          'policy_version',
          'reason',
        ],
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="decisions.csv"');
      return res.send(csvData);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
}
