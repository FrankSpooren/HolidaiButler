import sequelize from '../config/database.js';
import User from './User.js';
import Vacancy from './Vacancy.js';
import Criterion from './Criterion.js';
import Candidate from './Candidate.js';
import CandidateScore from './CandidateScore.js';
import Message from './Message.js';
import Outreach from './Outreach.js';

// ==================== Relaties ====================

// User relaties
User.hasMany(Vacancy, { foreignKey: 'createdBy', as: 'vacancies' });
User.hasMany(Candidate, { foreignKey: 'addedBy', as: 'addedCandidates' });
User.hasMany(Message, { foreignKey: 'createdBy', as: 'createdMessages' });
User.hasMany(Outreach, { foreignKey: 'sentBy', as: 'sentOutreach' });

// Vacancy relaties
Vacancy.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
Vacancy.hasMany(Criterion, { foreignKey: 'vacancyId', as: 'criteria', onDelete: 'CASCADE' });
Vacancy.hasMany(Candidate, { foreignKey: 'vacancyId', as: 'candidates', onDelete: 'CASCADE' });
Vacancy.hasMany(Message, { foreignKey: 'vacancyId', as: 'messages', onDelete: 'CASCADE' });

// Criterion relaties
Criterion.belongsTo(Vacancy, { foreignKey: 'vacancyId', as: 'vacancy' });
Criterion.hasMany(CandidateScore, { foreignKey: 'criterionId', as: 'scores', onDelete: 'CASCADE' });

// Candidate relaties
Candidate.belongsTo(Vacancy, { foreignKey: 'vacancyId', as: 'vacancy' });
Candidate.belongsTo(User, { foreignKey: 'addedBy', as: 'addedByUser' });
Candidate.hasMany(CandidateScore, { foreignKey: 'candidateId', as: 'scores', onDelete: 'CASCADE' });
Candidate.hasMany(Message, { foreignKey: 'candidateId', as: 'messages', onDelete: 'CASCADE' });
Candidate.hasMany(Outreach, { foreignKey: 'candidateId', as: 'outreach', onDelete: 'CASCADE' });

// CandidateScore relaties
CandidateScore.belongsTo(Candidate, { foreignKey: 'candidateId', as: 'candidate' });
CandidateScore.belongsTo(Criterion, { foreignKey: 'criterionId', as: 'criterion' });
CandidateScore.belongsTo(User, { foreignKey: 'scoredBy', as: 'scorer' });

// Message relaties
Message.belongsTo(Candidate, { foreignKey: 'candidateId', as: 'candidate' });
Message.belongsTo(Vacancy, { foreignKey: 'vacancyId', as: 'vacancy' });
Message.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
Message.belongsTo(User, { foreignKey: 'approvedBy', as: 'approver' });
Message.hasMany(Outreach, { foreignKey: 'messageId', as: 'outreach', onDelete: 'CASCADE' });

// Outreach relaties
Outreach.belongsTo(Candidate, { foreignKey: 'candidateId', as: 'candidate' });
Outreach.belongsTo(Message, { foreignKey: 'messageId', as: 'message' });
Outreach.belongsTo(User, { foreignKey: 'sentBy', as: 'sender' });

// ==================== Export ====================

const models = {
  User,
  Vacancy,
  Criterion,
  Candidate,
  CandidateScore,
  Message,
  Outreach,
  sequelize
};

export {
  User,
  Vacancy,
  Criterion,
  Candidate,
  CandidateScore,
  Message,
  Outreach,
  sequelize
};

export default models;
