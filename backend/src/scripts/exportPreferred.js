import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { stringify } from 'csv-stringify/sync';
import { connectDB, disconnectDB } from '../config/db.js';
import { Item } from '../models/Item.js';
import { Supplier } from '../models/Supplier.js';
import { Contract } from '../models/Contract.js';
import { POHistory } from '../models/POHistory.js';
import { SupplierRanker } from '../engine/supplierRanker.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runExportPreferred() {
  try {
    await connectDB();

    const args = process.argv.slice(2);
    const asOfDateStr = args[0] || '2026-11-01';
    const outputArg = args[1];

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

    const csvOutput = stringify(rows, {
      header: true,
      columns: ['item_code', 'rank', 'supplier_id', 'reference_price', 'top_3'],
    });

    const submissionDir = path.resolve(__dirname, '../../../submission');
    if (!fs.existsSync(submissionDir)) {
      fs.mkdirSync(submissionDir, { recursive: true });
    }

    const outputFile = outputArg
      ? path.resolve(process.cwd(), outputArg)
      : path.join(submissionDir, 'sample_preferred_suppliers.csv');

    fs.writeFileSync(outputFile, csvOutput, 'utf-8');
    console.log(`[Export] Successfully exported ${rows.length} preferred supplier rankings (as of ${asOfDateStr}) to ${outputFile}`);
  } catch (err) {
    console.error('[Export Preferred] Error:', err.message);
  } finally {
    await disconnectDB();
    process.exit(0);
  }
}

runExportPreferred();
