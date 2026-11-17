import mongoose from 'mongoose';

const RequirementGroupSchema = new mongoose.Schema({
  group_id: { type: String, required: true },
  batch_id: { type: String },
  plant: { type: String, required: true },
  resolved_item_code: { type: String, required: true },
  total_quantity: { type: Number, required: true },
  unit_price: { type: Number, required: true },
  group_value_inr: { type: Number, required: true },
  need_by_date: { type: String, required: true },
  created_at: { type: Date, required: true },
  is_emergency: { type: Boolean, default: false },
  is_new: { type: Boolean, default: false },
  decision: { type: String, enum: ['PO', 'SOURCING_REQUEST'], required: true },
  route: { type: String, required: true },
  supplier_id: { type: String },
  suggested_supplier_ids: [{ type: String }],
  po_id: { type: String },
  policy_version: { type: String, required: true },
  clause: { type: String, required: true },
  reason: { type: String, required: true },
  pr_lines: [{
    pr_no: { type: String, required: true },
    pr_line: { type: Number, required: true },
    description: { type: String, required: true },
    quantity: { type: Number, required: true },
    need_by_date: { type: String, required: true },
    urgency: { type: String, required: true },
  }],
  status: {
    type: String,
    enum: ['DECIDED', 'APPROVED', 'REJECTED', 'OVERRIDDEN'],
    default: 'DECIDED',
  },
  override_reason: { type: String },
  overridden_by: { type: String },
  overridden_at: { type: Date },
  approved_by: { type: String },
  approved_at: { type: Date },
});

RequirementGroupSchema.index({ group_id: 1, batch_id: 1 });

export const RequirementGroup = mongoose.model(
  'RequirementGroup',
  RequirementGroupSchema
);
