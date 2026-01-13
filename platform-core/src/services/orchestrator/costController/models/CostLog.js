import mongoose from 'mongoose';

const costLogSchema = new mongoose.Schema({
  service: {
    type: String,
    required: true,
    enum: ['claude', 'mistral', 'apify', 'mailerlite', 'hetzner', 'other']
  },
  operation: {
    type: String,
    required: true
  },
  cost: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'EUR'
  },
  tokens: {
    input: Number,
    output: Number
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },
  environment: {
    type: String,
    enum: ['development', 'test', 'production'],
    default: 'production'
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  collection: 'cost_logs',
  timestamps: true
});

// Index voor snelle queries per maand
costLogSchema.index({ service: 1, timestamp: -1 });
costLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 }); // 90 dagen retention

const CostLog = mongoose.model('CostLog', costLogSchema);

export default CostLog;
