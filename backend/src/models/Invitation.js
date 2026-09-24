const mongoose = require('mongoose');

const invitationSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    role: {
      type: String,
      enum: ['Org Admin', 'Member', 'Guest'],
      default: 'Member'
    },
    projectRoles: [
      {
        project: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Project'
        },
        role: {
          type: String,
          enum: ['Project Manager', 'Team Lead', 'Developer/Member', 'Stakeholder'],
          default: 'Developer/Member'
        }
      }
    ],
    token: {
      type: String,
      required: true,
      unique: true
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'expired'],
      default: 'pending'
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Invitation', invitationSchema);
