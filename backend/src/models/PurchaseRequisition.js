import mongoose from 'mongoose';

const PurchaseRequisitionSchema = new mongoose.Schema({
  pr_no: { type: String, required: true },
  pr_line: { type: Number, required: true },
  created_at: { type: Date, required: true },
  requester: { type: String, required: true },
  department: { type: String, required: true },
  plant: { type: String, required: true },
  item_code: { type: String },
  description: { type: String, required: true },
  quantity: { type: Number, required: true },
  uom: { type: String, required: true },
  estimated_unit_price: { type: Number },
  need_by_date: { type: String, required: true },
  urgency: { type: String, default: 'Normal' },
  batch_id: { type: String },
  group_id: { type: String },
  resolved_item_code: { type: String },
  status: { type: String, enum: ['PENDING', 'PROCESSED', 'NOT_PROCESSED'], default: 'PENDING' },
  error_message: { type: String },
});

PurchaseRequisitionSchema.index({ pr_no: 1, pr_line: 1 });
PurchaseRequisitionSchema.index({ batch_id: 1 });

export const PurchaseRequisition = mongoose.model(
  'PurchaseRequisition',
  PurchaseRequisitionSchema
);
