import mongoose from 'mongoose';

const SupplierSchema = new mongoose.Schema({
  supplier_id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  city: { type: String, required: true },
  categories: [{ type: String, required: true }],
  status: { type: String, enum: ['Active', 'Blocked', 'Inactive'], required: true },
  on_time_pct: { type: Number, required: true },
  quality_rating: { type: Number, required: true },
});

export const Supplier = mongoose.model('Supplier', SupplierSchema);
