import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';
import { Plant } from '../models/Plant.js';
import { Item } from '../models/Item.js';
import { Supplier } from '../models/Supplier.js';
import { Contract } from '../models/Contract.js';
import { POHistory } from '../models/POHistory.js';
import { Policy } from '../models/Policy.js';
import { RuleEngine } from '../engine/ruleEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class DataController {
  /**
   * Seeds database from local folder or env path
   */
  static async seedDatabase(kitDirOverride) {
    const kitDir =
      kitDirOverride ||
      process.env.DATA_DIR ||
      path.resolve(__dirname, '../../../Cantill_FullStack_Task_Kit');

    if (!fs.existsSync(kitDir)) {
      throw new Error(`Data kit directory not found at: ${kitDir}. Please configure DATA_DIR.`);
    }

    // 1. Seed Plants
    const plantsFile = path.join(kitDir, 'master_data', 'plants.csv');
    const plantsData = parse(fs.readFileSync(plantsFile, 'utf-8'), { columns: true, skip_empty_lines: true, trim: true });
    await Plant.deleteMany({});
    await Plant.insertMany(plantsData);

    // 2. Seed Items
    const itemsFile = path.join(kitDir, 'master_data', 'item_master.csv');
    const itemsData = parse(fs.readFileSync(itemsFile, 'utf-8'), { columns: true, skip_empty_lines: true, trim: true });
    await Item.deleteMany({});
    const itemsToInsert = itemsData.map((r) => ({
      item_code: r.item_code,
      description: r.description,
      uom: r.uom,
      category: r.category,
      item_type: r.item_type,
      standard_price: parseFloat(r.standard_price),
    }));
    await Item.insertMany(itemsToInsert);

    // 3. Seed Suppliers
    const suppliersFile = path.join(kitDir, 'master_data', 'supplier_master.csv');
    const suppliersData = parse(fs.readFileSync(suppliersFile, 'utf-8'), { columns: true, skip_empty_lines: true, trim: true });
    await Supplier.deleteMany({});
    const suppliersToInsert = suppliersData.map((r) => ({
      supplier_id: r.supplier_id,
      name: r.name,
      city: r.city,
      categories: r.categories.split(/[;,]/).map((c) => c.trim()),
      status: r.status,
      on_time_pct: parseFloat(r.on_time_pct),
      quality_rating: parseFloat(r.quality_rating),
    }));
    await Supplier.insertMany(suppliersToInsert);

    // 4. Seed Contracts (Register + Lines + PDF-only contracts)
    const contractsFile = path.join(kitDir, 'contracts', 'contract_register.csv');
    const contractLinesFile = path.join(kitDir, 'contracts', 'contract_lines.csv');
    const contractsData = parse(fs.readFileSync(contractsFile, 'utf-8'), { columns: true, skip_empty_lines: true, trim: true });
    const contractLinesData = parse(fs.readFileSync(contractLinesFile, 'utf-8'), { columns: true, skip_empty_lines: true, trim: true });

    const contractLinesMap = new Map();
    for (const cl of contractLinesData) {
      if (!contractLinesMap.has(cl.contract_id)) {
        contractLinesMap.set(cl.contract_id, []);
      }
      contractLinesMap.get(cl.contract_id).push({
        item_code: cl.item_code,
        description: cl.description,
        uom: cl.uom,
        rate: parseFloat(cl.rate),
      });
    }

    await Contract.deleteMany({});
    const contractsToInsert = contractsData.map((r) => ({
      contract_id: r.contract_id,
      supplier_id: r.supplier_id,
      supplier_name: r.supplier_name,
      start_date: r.start_date,
      end_date: r.end_date,
      value_cap: parseFloat(r.value_cap),
      consumed_value: parseFloat(r.consumed_value),
      lines: contractLinesMap.get(r.contract_id) || [],
      source: 'REGISTER',
    }));

    // Add PDF-Only Contracts: RC-2026-031 and RC-2026-033
    contractsToInsert.push({
      contract_id: 'RC-2026-031',
      supplier_id: 'S021',
      supplier_name: 'Pneumatic Point',
      start_date: '2026-11-15',
      end_date: '2027-11-14',
      value_cap: 2000000,
      consumed_value: 0,
      lines: [
        { item_code: 'ITM-1036', description: 'Pneumatic cylinder 50x100', uom: 'NOS', rate: 3537.76 },
        { item_code: 'ITM-1037', description: 'Solenoid valve 5/2 1/4 inch', uom: 'NOS', rate: 2439.01 },
        { item_code: 'ITM-1039', description: 'FRL unit 1/2 inch', uom: 'NOS', rate: 2746.87 },
      ],
      source: 'PDF_UPLOAD',
    });

    contractsToInsert.push({
      contract_id: 'RC-2026-033',
      supplier_id: 'S035',
      supplier_name: 'Infoline Systems',
      start_date: '2026-11-20',
      end_date: '2027-11-19',
      value_cap: 5000000,
      consumed_value: 0,
      lines: [
        { item_code: 'ITM-1056', description: 'Laptop i5 16GB 512GB', uom: 'NOS', rate: 64654.36 },
        { item_code: 'ITM-1057', description: '24 inch monitor', uom: 'NOS', rate: 10689.51 },
      ],
      source: 'PDF_UPLOAD',
    });

    await Contract.insertMany(contractsToInsert);

    // 5. Seed PO History
    const poHistoryFile = path.join(kitDir, 'master_data', 'po_history.csv');
    const poHistoryData = parse(fs.readFileSync(poHistoryFile, 'utf-8'), { columns: true, skip_empty_lines: true, trim: true });
    await POHistory.deleteMany({});
    const posToInsert = poHistoryData.map((r) => ({
      po_number: r.po_number,
      po_date: r.po_date,
      supplier_id: r.supplier_id,
      item_code: r.item_code,
      quantity: parseFloat(r.quantity),
      uom: r.uom,
      unit_price: parseFloat(r.unit_price),
      plant: r.plant,
      delivered_on_time: r.delivered_on_time === 'True' || r.delivered_on_time === 'true',
    }));
    await POHistory.insertMany(posToInsert);

    // 6. Seed Policy Version 5.0 (Stored as Data)
    const existingPolicy = await Policy.findOne({ version: '5.0' });
    if (!existingPolicy) {
      await Policy.create({
        version: '5.0',
        title: 'Corvo Engineering Procurement Policy (PR to PO)',
        effective_date: '2026-04-01',
        status: 'ACTIVE',
        rules: RuleEngine.getDefaultPolicyV5Rules(),
        notes: 'Document CORVO-PROC-POL-04 Version 5.0 Effective 1 April 2026',
        uploaded_by: 'Head of Procurement',
        approved_by: 'Head of Procurement',
        approved_at: new Date('2026-04-01'),
      });
    }

    const counts = {
      plantsCount: await Plant.countDocuments(),
      itemsCount: await Item.countDocuments(),
      suppliersCount: await Supplier.countDocuments(),
      contractsCount: await Contract.countDocuments(),
      poCount: await POHistory.countDocuments(),
      policyCount: await Policy.countDocuments(),
    };

    console.log('[Seed] Database successfully seeded:', counts);
    return counts;
  }

  /**
   * POST /api/data/seed
   */
  static async seedEndpoint(req, res) {
    try {
      const counts = await DataController.seedDatabase(req.body.kitDir);
      return res.json({ success: true, message: 'Database seeded successfully', counts });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * GET /api/data/status
   */
  static async getStatus(req, res) {
    try {
      const counts = {
        plants: await Plant.countDocuments(),
        items: await Item.countDocuments(),
        suppliers: await Supplier.countDocuments(),
        contracts: await Contract.countDocuments(),
        poHistory: await POHistory.countDocuments(),
        policies: await Policy.countDocuments(),
      };
      return res.json(counts);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
}
