/**
 * Models Index
 * Central export and relationship definitions
 */

import sequelize from '../config/database.js';

// Import all models
import User from './User.js';
import Account from './Account.js';
import Contact from './Contact.js';
import Deal from './Deal.js';
import Lead from './Lead.js';
import Campaign from './Campaign.js';
import Activity from './Activity.js';
import Task from './Task.js';
import Pipeline from './Pipeline.js';
import PipelineStage from './PipelineStage.js';
import Team from './Team.js';
import SharedInbox from './SharedInbox.js';
import EmailMessage from './EmailMessage.js';
import Notification from './Notification.js';
import Product from './Product.js';
import Quote from './Quote.js';
import Document from './Document.js';
import ImportJob from './ImportJob.js';
import ExportJob from './ExportJob.js';
import AuditLog from './AuditLog.js';
import Comment from './Comment.js';
import Session from './Session.js';

// ============================================
// DEFINE RELATIONSHIPS
// ============================================

// User relationships
User.belongsTo(Team, { foreignKey: 'teamId', as: 'team' });
User.belongsTo(User, { foreignKey: 'managerId', as: 'manager' });
User.hasMany(User, { foreignKey: 'managerId', as: 'directReports' });
User.hasMany(Session, { foreignKey: 'userId', as: 'sessions' });
User.hasMany(Account, { foreignKey: 'ownerId', as: 'ownedAccounts' });
User.hasMany(Contact, { foreignKey: 'ownerId', as: 'ownedContacts' });
User.hasMany(Deal, { foreignKey: 'ownerId', as: 'ownedDeals' });
User.hasMany(Lead, { foreignKey: 'ownerId', as: 'ownedLeads' });
User.hasMany(Task, { foreignKey: 'assignedTo', as: 'assignedTasks' });
User.hasMany(Activity, { foreignKey: 'userId', as: 'activities' });
User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications' });

// Team relationships
Team.hasMany(User, { foreignKey: 'teamId', as: 'members' });
Team.belongsTo(User, { foreignKey: 'managerId', as: 'manager' });
Team.belongsTo(Team, { foreignKey: 'parentTeamId', as: 'parentTeam' });
Team.hasMany(Team, { foreignKey: 'parentTeamId', as: 'childTeams' });
Team.hasMany(Account, { foreignKey: 'teamId', as: 'accounts' });
Team.hasMany(Deal, { foreignKey: 'teamId', as: 'deals' });
Team.hasMany(Lead, { foreignKey: 'teamId', as: 'leads' });

// Account relationships
Account.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });
Account.belongsTo(Team, { foreignKey: 'teamId', as: 'team' });
Account.belongsTo(Account, { foreignKey: 'parentAccountId', as: 'parentAccount' });
Account.hasMany(Account, { foreignKey: 'parentAccountId', as: 'childAccounts' });
Account.hasMany(Contact, { foreignKey: 'accountId', as: 'contacts' });
Account.hasMany(Deal, { foreignKey: 'accountId', as: 'deals' });
Account.hasMany(Activity, { foreignKey: 'accountId', as: 'activities' });
Account.hasMany(Task, { foreignKey: 'accountId', as: 'tasks' });
Account.hasMany(Quote, { foreignKey: 'accountId', as: 'quotes' });
Account.hasMany(Document, { foreignKey: 'accountId', as: 'documents' });
Account.hasMany(EmailMessage, { foreignKey: 'accountId', as: 'emails' });

// Contact relationships
Contact.belongsTo(Account, { foreignKey: 'accountId', as: 'account' });
Contact.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });
Contact.belongsTo(Contact, { foreignKey: 'reportsTo', as: 'reportsToContact' });
Contact.hasMany(Contact, { foreignKey: 'reportsTo', as: 'directReports' });
Contact.hasMany(Deal, { foreignKey: 'contactId', as: 'deals' });
Contact.hasMany(Activity, { foreignKey: 'contactId', as: 'activities' });
Contact.hasMany(Task, { foreignKey: 'contactId', as: 'tasks' });
Contact.hasMany(Quote, { foreignKey: 'contactId', as: 'quotes' });
Contact.hasMany(EmailMessage, { foreignKey: 'contactId', as: 'emails' });

// Deal relationships
Deal.belongsTo(Pipeline, { foreignKey: 'pipelineId', as: 'pipeline' });
Deal.belongsTo(PipelineStage, { foreignKey: 'stageId', as: 'currentStage' });
Deal.belongsTo(Account, { foreignKey: 'accountId', as: 'account' });
Deal.belongsTo(Contact, { foreignKey: 'contactId', as: 'primaryContact' });
Deal.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });
Deal.belongsTo(Team, { foreignKey: 'teamId', as: 'team' });
Deal.belongsTo(Campaign, { foreignKey: 'campaignId', as: 'campaign' });
Deal.belongsTo(Lead, { foreignKey: 'leadId', as: 'sourceLead' });
Deal.hasMany(Activity, { foreignKey: 'dealId', as: 'activities' });
Deal.hasMany(Task, { foreignKey: 'dealId', as: 'tasks' });
Deal.hasMany(Quote, { foreignKey: 'dealId', as: 'quotes' });
Deal.hasMany(Document, { foreignKey: 'dealId', as: 'documents' });
Deal.hasMany(EmailMessage, { foreignKey: 'dealId', as: 'emails' });

// Lead relationships
Lead.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });
Lead.belongsTo(Team, { foreignKey: 'teamId', as: 'team' });
Lead.belongsTo(Campaign, { foreignKey: 'campaignId', as: 'campaign' });
Lead.belongsTo(Account, { foreignKey: 'convertedAccountId', as: 'convertedAccount' });
Lead.belongsTo(Contact, { foreignKey: 'convertedContactId', as: 'convertedContact' });
Lead.belongsTo(Deal, { foreignKey: 'convertedDealId', as: 'convertedDeal' });
Lead.hasMany(Activity, { foreignKey: 'leadId', as: 'activities' });
Lead.hasMany(Task, { foreignKey: 'leadId', as: 'tasks' });
Lead.hasMany(EmailMessage, { foreignKey: 'leadId', as: 'emails' });

// Campaign relationships
Campaign.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });
Campaign.belongsTo(Team, { foreignKey: 'teamId', as: 'team' });
Campaign.belongsTo(Campaign, { foreignKey: 'parentCampaignId', as: 'parentCampaign' });
Campaign.hasMany(Campaign, { foreignKey: 'parentCampaignId', as: 'childCampaigns' });
Campaign.hasMany(Lead, { foreignKey: 'campaignId', as: 'leads' });
Campaign.hasMany(Deal, { foreignKey: 'campaignId', as: 'deals' });
Campaign.hasMany(Activity, { foreignKey: 'campaignId', as: 'activities' });
Campaign.hasMany(EmailMessage, { foreignKey: 'campaignId', as: 'emails' });

// Pipeline relationships
Pipeline.belongsTo(Team, { foreignKey: 'teamId', as: 'team' });
Pipeline.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
Pipeline.hasMany(PipelineStage, { foreignKey: 'pipelineId', as: 'stages' });
Pipeline.hasMany(Deal, { foreignKey: 'pipelineId', as: 'deals' });

// PipelineStage relationships
PipelineStage.belongsTo(Pipeline, { foreignKey: 'pipelineId', as: 'pipeline' });
PipelineStage.hasMany(Deal, { foreignKey: 'stageId', as: 'deals' });

// Activity relationships
Activity.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Activity.belongsTo(User, { foreignKey: 'assignedTo', as: 'assignee' });
Activity.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
Activity.belongsTo(Account, { foreignKey: 'accountId', as: 'account' });
Activity.belongsTo(Contact, { foreignKey: 'contactId', as: 'contact' });
Activity.belongsTo(Deal, { foreignKey: 'dealId', as: 'deal' });
Activity.belongsTo(Lead, { foreignKey: 'leadId', as: 'lead' });
Activity.belongsTo(Campaign, { foreignKey: 'campaignId', as: 'campaign' });
Activity.belongsTo(EmailMessage, { foreignKey: 'emailMessageId', as: 'emailMessage' });

// Task relationships
Task.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
Task.belongsTo(User, { foreignKey: 'assignedTo', as: 'assignee' });
Task.belongsTo(User, { foreignKey: 'completedBy', as: 'completer' });
Task.belongsTo(Team, { foreignKey: 'teamId', as: 'team' });
Task.belongsTo(Account, { foreignKey: 'accountId', as: 'account' });
Task.belongsTo(Contact, { foreignKey: 'contactId', as: 'contact' });
Task.belongsTo(Deal, { foreignKey: 'dealId', as: 'deal' });
Task.belongsTo(Lead, { foreignKey: 'leadId', as: 'lead' });
Task.belongsTo(Activity, { foreignKey: 'activityId', as: 'activity' });
Task.belongsTo(Task, { foreignKey: 'parentTaskId', as: 'parentTask' });
Task.hasMany(Task, { foreignKey: 'parentTaskId', as: 'subtasks' });

// SharedInbox relationships
SharedInbox.belongsTo(Team, { foreignKey: 'teamId', as: 'team' });
SharedInbox.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
SharedInbox.hasMany(EmailMessage, { foreignKey: 'sharedInboxId', as: 'emails' });

// EmailMessage relationships
EmailMessage.belongsTo(SharedInbox, { foreignKey: 'sharedInboxId', as: 'inbox' });
EmailMessage.belongsTo(Account, { foreignKey: 'accountId', as: 'account' });
EmailMessage.belongsTo(Contact, { foreignKey: 'contactId', as: 'contact' });
EmailMessage.belongsTo(Deal, { foreignKey: 'dealId', as: 'deal' });
EmailMessage.belongsTo(Lead, { foreignKey: 'leadId', as: 'lead' });
EmailMessage.belongsTo(Campaign, { foreignKey: 'campaignId', as: 'campaign' });
EmailMessage.belongsTo(User, { foreignKey: 'userId', as: 'user' });
EmailMessage.belongsTo(User, { foreignKey: 'assignedTo', as: 'assignee' });
EmailMessage.hasOne(Activity, { foreignKey: 'emailMessageId', as: 'activity' });

// Notification relationships
Notification.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Notification.belongsTo(User, { foreignKey: 'fromUserId', as: 'fromUser' });
Notification.belongsTo(Account, { foreignKey: 'accountId', as: 'account' });
Notification.belongsTo(Contact, { foreignKey: 'contactId', as: 'contact' });
Notification.belongsTo(Deal, { foreignKey: 'dealId', as: 'deal' });
Notification.belongsTo(Lead, { foreignKey: 'leadId', as: 'lead' });
Notification.belongsTo(Task, { foreignKey: 'taskId', as: 'task' });
Notification.belongsTo(Activity, { foreignKey: 'activityId', as: 'activity' });

// Quote relationships
Quote.belongsTo(Account, { foreignKey: 'accountId', as: 'account' });
Quote.belongsTo(Contact, { foreignKey: 'contactId', as: 'contact' });
Quote.belongsTo(Deal, { foreignKey: 'dealId', as: 'deal' });
Quote.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
Quote.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });
Quote.belongsTo(User, { foreignKey: 'approvedBy', as: 'approver' });
Quote.belongsTo(Quote, { foreignKey: 'parentQuoteId', as: 'parentQuote' });
Quote.hasMany(Quote, { foreignKey: 'parentQuoteId', as: 'revisions' });
Quote.hasMany(Document, { foreignKey: 'quoteId', as: 'documents' });

// Document relationships
Document.belongsTo(Account, { foreignKey: 'accountId', as: 'account' });
Document.belongsTo(Contact, { foreignKey: 'contactId', as: 'contact' });
Document.belongsTo(Deal, { foreignKey: 'dealId', as: 'deal' });
Document.belongsTo(Quote, { foreignKey: 'quoteId', as: 'quote' });
Document.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
Document.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });
Document.belongsTo(Document, { foreignKey: 'parentDocumentId', as: 'parentDocument' });
Document.hasMany(Document, { foreignKey: 'parentDocumentId', as: 'versions' });

// ImportJob relationships
ImportJob.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
ImportJob.belongsTo(User, { foreignKey: 'assignToUserId', as: 'assignToUser' });
ImportJob.belongsTo(Team, { foreignKey: 'assignToTeamId', as: 'assignToTeam' });

// ExportJob relationships
ExportJob.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

// AuditLog relationships
AuditLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Comment relationships - polymorphic
Comment.belongsTo(User, { foreignKey: 'authorId', as: 'author' });
Comment.belongsTo(Comment, { foreignKey: 'parentId', as: 'parentComment' });
Comment.hasMany(Comment, { foreignKey: 'parentId', as: 'replies' });

// Session relationships
Session.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// ============================================
// EXPORT
// ============================================

const models = {
  User,
  Account,
  Contact,
  Deal,
  Lead,
  Campaign,
  Activity,
  Task,
  Pipeline,
  PipelineStage,
  Team,
  SharedInbox,
  EmailMessage,
  Notification,
  Product,
  Quote,
  Document,
  ImportJob,
  ExportJob,
  AuditLog,
  Comment,
  Session,
  sequelize
};

// Initialize database and sync models
export const initializeDatabase = async (options = {}) => {
  const { force = false, alter = false, seed = false } = options;

  try {
    // Test connection
    await sequelize.authenticate();
    console.log('Database connection established successfully.');

    // Sync models
    await sequelize.sync({ force, alter });
    console.log('Database models synchronized.');

    // Create default pipeline if needed
    if (seed) {
      await seedDefaultData();
    }

    return true;
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    throw error;
  }
};

// Seed default data
const seedDefaultData = async () => {
  // Create default pipeline
  const existingPipeline = await Pipeline.findOne({ where: { isDefault: true } });
  if (!existingPipeline) {
    const pipeline = await Pipeline.create({
      name: 'Default Sales Pipeline',
      type: 'sales',
      isDefault: true,
      isActive: true,
      dealRotting: {
        enabled: true,
        warningDays: 7,
        criticalDays: 14
      }
    });

    // Create default stages
    const stages = [
      { name: 'Lead', type: 'open', order: 1, probability: 10, color: '#94a3b8' },
      { name: 'Qualified', type: 'open', order: 2, probability: 20, color: '#60a5fa' },
      { name: 'Meeting Scheduled', type: 'open', order: 3, probability: 40, color: '#818cf8' },
      { name: 'Proposal Sent', type: 'open', order: 4, probability: 60, color: '#a78bfa' },
      { name: 'Negotiation', type: 'open', order: 5, probability: 80, color: '#c084fc' },
      { name: 'Won', type: 'won', order: 6, probability: 100, color: '#22c55e' },
      { name: 'Lost', type: 'lost', order: 7, probability: 0, color: '#ef4444' }
    ];

    for (const stage of stages) {
      await PipelineStage.create({
        ...stage,
        pipelineId: pipeline.id,
        rottingDays: stage.type === 'open' ? 14 : null
      });
    }

    console.log('Default pipeline and stages created.');
  }
};

export default models;
export {
  sequelize,
  User,
  Account,
  Contact,
  Deal,
  Lead,
  Campaign,
  Activity,
  Task,
  Pipeline,
  PipelineStage,
  Team,
  SharedInbox,
  EmailMessage,
  Notification,
  Product,
  Quote,
  Document,
  ImportJob,
  ExportJob,
  AuditLog,
  Comment,
  Session
};
