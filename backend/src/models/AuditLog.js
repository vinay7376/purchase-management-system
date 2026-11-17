import mongoose from 'mongoose';

const AuditLogSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  user: { type: String, required: true },
  action: { type: String, required: true },
  entity_type: {
    type: String,
    enum: ['REQUIREMENT', 'POLICY', 'CONTRACT', 'PO', 'PR'],
    required: true,
  },
  entity_id: { type: String, required: true },
  previous_state: { type: mongoose.Schema.Types.Mixed },
  new_state: { type: mongoose.Schema.Types.Mixed },
  reason: { type: String },
});

AuditLogSchema.index({ timestamp: -1 });
AuditLogSchema.index({ entity_id: 1, entity_type: 1 });

export const AuditLog = mongoose.model('AuditLog', AuditLogSchema);
