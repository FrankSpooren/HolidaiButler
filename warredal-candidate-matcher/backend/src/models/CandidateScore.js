import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const CandidateScore = sequelize.define('CandidateScore', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  candidateId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'candidates',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  criterionId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'criteria',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  // Score data
  rawScore: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    comment: 'Ruwe score (0-10 of boolean)'
  },
  weightedScore: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    comment: 'Gewogen score (rawScore * criteriumWeight)'
  },
  textValue: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Voor text-type scores'
  },
  booleanValue: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    comment: 'Voor boolean-type scores'
  },
  // Metadata
  confidence: {
    type: DataTypes.DECIMAL(3, 2),
    defaultValue: 1.0,
    validate: {
      min: 0,
      max: 1
    },
    comment: 'Confidence level voor automatische scoring (0-1)'
  },
  isAutomated: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Is deze score automatisch bepaald?'
  },
  evidence: {
    type: DataTypes.JSONB,
    defaultValue: [],
    comment: 'Bewijs/onderbouwing voor de score'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  scoredBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  scoredAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'candidate_scores',
  indexes: [
    {
      fields: ['candidate_id']
    },
    {
      fields: ['criterion_id']
    },
    {
      unique: true,
      fields: ['candidate_id', 'criterion_id'],
      name: 'unique_candidate_criterion_score'
    }
  ]
});

export default CandidateScore;
