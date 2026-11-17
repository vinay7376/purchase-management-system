import mongoose from 'mongoose';

const PurchaseOrderSchema = new mongoose.Schema({
  po_id: { type: String, required: true },
  batch_id: { type: String },
  supplier_id: { type: String, required: true },
  plant: { type: String, required: true },
  route: { type: String, required: true },
  created_at: { type: Date, required: true },
  requirement_ids: [{ type: String, required: true }],
  total_value_inr: { type: Number, required: true },
  status: { type: String, enum: ['DRAFT', 'ISSUED', 'CANCELLED'], default: 'DRAFT' },
});

PurchaseOrderSchema.index({ po_id: 1, batch_id: 1 });

export const PurchaseOrder = mongoose.model('PurchaseOrder', PurchaseOrderSchema);
