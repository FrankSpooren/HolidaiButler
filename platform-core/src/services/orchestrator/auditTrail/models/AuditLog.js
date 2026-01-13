import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema({
  // Wie
  actor: {
    type: {
      type: String,
      enum: ["agent", "system", "owner", "user"],
      required: true
    },
    name: String,
    id: String
  },

  // Wat
  action: {
    type: String,
    required: true,
    index: true
  },
  category: {
    type: String,
    enum: ["job", "alert", "approval", "config", "data", "error", "system"],
    required: true
  },

  // Details
  description: String,
  target: {
    type: String,
    id: String
  },

  // Context
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },

  // Status
  status: {
    type: String,
    enum: ["initiated", "completed", "failed", "pending_approval"],
    default: "completed"
  },

  // Resultaat
  result: {
    success: Boolean,
    message: String,
    data: mongoose.Schema.Types.Mixed
  },

  // Environment
  environment: {
    type: String,
    enum: ["development", "test", "production"],
    default: "production"
  },

  // Timing
  duration: Number,
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  collection: "audit_logs",
  timestamps: true
});

// Indexes voor queries
auditLogSchema.index({ "actor.type": 1, timestamp: -1 });
auditLogSchema.index({ category: 1, timestamp: -1 });
auditLogSchema.index({ status: 1 });

// 90 dagen retention
auditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

const AuditLog = mongoose.model("AuditLog", auditLogSchema);
export default AuditLog;
