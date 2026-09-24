const mongoose = require('mongoose');

const sprintSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true
    },
    name: {
      type: String,
      required: [true, 'Sprint name is required'],
      trim: true
    },
    goal: {
      type: String,
      default: ''
    },
    startDate: {
      type: Date
    },
    endDate: {
      type: Date
    },
    status: {
      type: String,
      enum: ['planned', 'active', 'completed'],
      default: 'planned'
    },
    velocity: {
      type: Number,
      default: 0
    },
    retrospective: {
      type: String,
      default: ''
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Sprint', sprintSchema);
