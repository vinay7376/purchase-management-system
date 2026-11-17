import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import { connectDB, disconnectDB } from '../config/db.js';
import { Item } from '../models/Item.js';
import { Supplier } from '../models/Supplier.js';
import { Contract } from '../models/Contract.js';
import { POHistory } from '../models/POHistory.js';
import { Policy } from '../models/Policy.js';
import { DecisionService } from '../engine/decisionService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runExport() {
  try {
    await connectDB();

    const args = process.argv.slice(2);
    const inputArg = args[0];
    const policyVersionArg = args[1] || '5.0';
    const outputArg = args[2];

    const [items, suppliers, contracts, poHistory, policyDoc] = await Promise.all([
      Item.find().lean(),
      Supplier.find().lean(),
      Contract.find().lean(),
      POHistory.find().lean(),
      Policy.findOne({ version: policyVersionArg }).lean(),
    ]);

    if (!policyDoc) {
      throw new Error(`Policy ${policyVersionArg} not found in database.`);
    }

    let prBatchFile;
    if (inputArg && fs.existsSync(inputArg)) {
      prBatchFile = inputArg;
    } else {
      const kitDir = process.env.DATA_DIR || path.resolve(__dirname, '../../../Cantill_FullStack_Task_Kit');
      prBatchFile = path.join(kitDir, 'pr_batches', 'sample_pr_batch.csv');
      if (!fs.existsSync(prBatchFile)) {
        // Fallback to local
        prBatchFile = path.resolve(__dirname, '../../../../Cantill_FullStack_Task_Kit_vf/Cantill_FullStack_Task_Kit/pr_batches/sample_pr_batch.csv');
      }
    }

    if (!fs.existsSync(prBatchFile)) {
      throw new Error(`PR batch file not found: ${prBatchFile}`);
    }

    let fileContent = fs.readFileSync(prBatchFile, 'utf-8');
    if (fileContent.charCodeAt(0) === 0xFEFF) {
      fileContent = fileContent.substring(1);
    }

    const records = parse(fileContent, {
      columns: (headers) => headers.map((h) => h.trim().toLowerCase().replace(/[\s-]+/g, '_')),
      skip_empty_lines: true,
      trim: true,
    });

    const rawLines = records
      .filter((r) => r.pr_no && r.pr_line)
      .map((r) => ({
        pr_no: r.pr_no,
        pr_line: parseInt(r.pr_line, 10),
        created_at: new Date(r.created_at),
        requester: r.requester || 'Requester',
        department: r.department || 'Operations',
        plant: r.plant,
        item_code: r.item_code || undefined,
        description: r.description,
        quantity: parseFloat(r.quantity),
        uom: r.uom,
        estimated_unit_price: r.estimated_unit_price ? parseFloat(r.estimated_unit_price) : undefined,
        need_by_date: r.need_by_date,
        urgency: r.urgency || 'Normal',
      }));

    const decisionService = new DecisionService(items, suppliers, contracts, poHistory);
    const result = decisionService.processBatch(rawLines, policyDoc);

    const csvOutput = stringify(result.records, {
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

    const submissionDir = path.resolve(__dirname, '../../../submission');
    if (!fs.existsSync(submissionDir)) {
      fs.mkdirSync(submissionDir, { recursive: true });
    }

    const outputFile = outputArg ? path.resolve(process.cwd(), outputArg) : path.join(submissionDir, 'sample_pr_batch_decisions.csv');
    fs.writeFileSync(outputFile, csvOutput, 'utf-8');

    console.log(`[Export] Successfully exported ${result.records.length} records to ${outputFile}`);
  } catch (err) {
    console.error('[Export] Error:', err.message);
  } finally {
    await disconnectDB();
    process.exit(0);
  }
}

runExport();
