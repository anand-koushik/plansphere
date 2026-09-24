const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true
    },
    key: {
      type: String,
      required: [true, 'Project key is required'],
      uppercase: true,
      trim: true
    },
    description: {
      type: String,
      default: ''
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true
    },
    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['planning', 'active', 'on_hold', 'completed', 'archived'],
      default: 'active'
    },
    category: {
      type: String,
      enum: ['software', 'business'],
      default: 'software'
    },
    startDate: {
      type: Date
    },
    targetDate: {
      type: Date
    },
    budget: {
      type: Number,
      default: 0
    },
    riskLevel: {
      type: String,
      enum: ['Low', 'Medium', 'High'],
      default: 'Low'
    }
  },
  { timestamps: true }
);

projectSchema.index({ organization: 1, key: 1 }, { unique: true });

module.exports = mongoose.model('Project', projectSchema);
