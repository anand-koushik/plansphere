const Activity = require('../models/Activity');
const Notification = require('../models/Notification');
const User = require('../models/User');

/**
 * Log an activity event in the audit trail and optionally notify recipients.
 */
const logActivity = async ({
  project,
  organization,
  user,
  action,
  entityType,
  entityId,
  entityTitle,
  details = {}
}) => {
  try {
    const activity = await Activity.create({
      project,
      organization,
      user,
      action,
      entityType,
      entityId,
      entityTitle,
      details
    });

    return activity;
  } catch (error) {
    console.error('Failed to log activity:', error.message);
  }
};

/**
 * Scan text for @mentions (e.g. @Sarah or @alex) and create notifications.
 */
const parseMentionsAndNotify = async ({
  text,
  senderId,
  projectId,
  organizationId,
  entityType,
  entityTitle,
  link
}) => {
  try {
    if (!text || typeof text !== 'string') return [];

    // Match words after @
    const matches = text.match(/@([a-zA-Z0-9._-]+)/g);
    if (!matches) return [];

    const mentionedNamesOrEmails = matches.map((m) => m.substring(1).toLowerCase());
    
    // Find matching users by name or email prefix
    const users = await User.find({
      _id: { $ne: senderId }
    });

    const matchedUsers = users.filter((u) => {
      const emailPrefix = u.email.split('@')[0].toLowerCase();
      const firstName = u.name.split(' ')[0].toLowerCase();
      const fullNameClean = u.name.replace(/\s+/g, '').toLowerCase();
      return mentionedNamesOrEmails.some(
        (m) =>
          m === emailPrefix ||
          m === firstName ||
          m === fullNameClean ||
          u.email.toLowerCase().includes(m)
      );
    });

    for (const recipient of matchedUsers) {
      await Notification.create({
        recipient: recipient._id,
        sender: senderId,
        project: projectId,
        organization: organizationId,
        type: 'mention',
        title: `Mentioned in ${entityType}`,
        message: `You were mentioned in "${entityTitle}"`,
        link: link || ''
      });
    }

    return matchedUsers.map((u) => u._id);
  } catch (error) {
    console.error('Error parsing mentions:', error.message);
    return [];
  }
};

/**
 * Dispatch a direct notification.
 */
const createNotification = async ({
  recipient,
  sender,
  project,
  organization,
  type,
  title,
  message,
  link
}) => {
  try {
    if (!recipient || recipient.toString() === (sender ? sender.toString() : '')) {
      return null;
    }
    return await Notification.create({
      recipient,
      sender,
      project,
      organization,
      type,
      title,
      message,
      link
    });
  } catch (error) {
    console.error('Error creating notification:', error.message);
  }
};

module.exports = {
  logActivity,
  parseMentionsAndNotify,
  createNotification
};
