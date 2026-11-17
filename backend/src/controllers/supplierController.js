import { Supplier } from '../models/Supplier.js';
import { POHistory } from '../models/POHistory.js';
import { Contract } from '../models/Contract.js';
import { Item } from '../models/Item.js';
import { SupplierRanker } from '../engine/supplierRanker.js';
import { stringify } from 'csv-stringify/sync';

export class SupplierController {
  /**
   * GET /api/suppliers
   */
  static async listSuppliers(req, res) {
    try {
      const { status, category, search } = req.query;
      const query = {};

      if (status && typeof status === 'string') {
        query.status = status;
      }
      if (category && typeof category === 'string') {
        query.categories = { $regex: category, $options: 'i' };
      }
      if (search && typeof search === 'string') {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { supplier_id: { $regex: search, $options: 'i' } },
          { city: { $regex: search, $options: 'i' } },
        ];
      }

      const suppliers = await Supplier.find(query).sort({ status: 1, on_time_pct: -1 });
      return res.json(suppliers);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * GET /api/suppliers/preferred/:itemCode
   */
  static async getPreferredRanking(req, res) {
    try {
      const { itemCode } = req.params;
      const asOfDateStr = req.query.asOfDate || '2026-11-01';

      const [suppliers, poHistory, contracts, item] = await Promise.all([
        Supplier.find().lean(),
        POHistory.find().lean(),
        Contract.find().lean(),
        Item.findOne({ item_code: itemCode }).lean(),
      ]);

      if (!item) {
        return res.status(404).json({ error: `Item ${itemCode} not found in item master.` });
      }

      const ranker = new SupplierRanker(suppliers, poHistory, contracts);
      const ranking = ranker.getPreferredSuppliers(itemCode, asOfDateStr);

      return res.json({
        itemCode,
        description: item.description,
        category: item.category,
        asOfDate: asOfDateStr,
        ranking,
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * GET /api/suppliers/export-preferred
   * Exports CSV in format: item_code,rank,supplier_id,reference_price,top_3
   */
  static async exportPreferredCSV(req, res) {
    try {
      const asOfDateStr = req.query.asOfDate || '2026-11-01';

      const [suppliers, poHistory, contracts, items] = await Promise.all([
        Supplier.find().lean(),
        POHistory.find().lean(),
        Contract.find().lean(),
        Item.find().lean(),
      ]);

      const ranker = new SupplierRanker(suppliers, poHistory, contracts);
      const rows = [];

      for (const item of items) {
        const ranking = ranker.getPreferredSuppliers(item.item_code, asOfDateStr);
        for (const r of ranking) {
          rows.push({
            item_code: item.item_code,
            rank: r.rank,
            supplier_id: r.supplier_id,
            reference_price: r.reference_price !== null ? String(r.reference_price) : '',
            top_3: r.rank <= 3 ? 'true' : 'false',
          });
        }
      }

      const csvData = stringify(rows, {
        header: true,
        columns: ['item_code', 'rank', 'supplier_id', 'reference_price', 'top_3'],
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="preferred_suppliers_${asOfDateStr}.csv"`);
      return res.send(csvData);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
}
