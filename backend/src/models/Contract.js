import mongoose from 'mongoose';

const ContractLineSchema = new mongoose.Schema({
  item_code: { type: String, required: true },
  description: { type: String, required: true },
  uom: { type: String, required: true },
  rate: { type: Number, required: true },
});

const ContractSchema = new mongoose.Schema({
  contract_id: { type: String, required: true, unique: true },
  supplier_id: { type: String, required: true },
  supplier_name: { type: String, required: true },
  start_date: { type: String, required: true },
  end_date: { type: String, required: true },
  value_cap: { type: Number, required: true },
  consumed_value: { type: Number, required: true, default: 0 },
  lines: [ContractLineSchema],
  source: { type: String, enum: ['REGISTER', 'PDF_UPLOAD'], default: 'REGISTER' },
  created_at: { type: Date, default: Date.now },
});

export const Contract = mongoose.model('Contract', ContractSchema);
