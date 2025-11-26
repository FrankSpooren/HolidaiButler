import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Candidate = sequelize.define('Candidate', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  vacancyId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'vacancies',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  // Basis informatie
  firstName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isEmail: true
    }
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  location: {
    type: DataTypes.STRING,
    allowNull: true
  },
  nationality: {
    type: DataTypes.STRING,
    allowNull: true
  },

  // LinkedIn specifiek
  linkedinUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true
  },
  linkedinProfileData: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: 'Volledige LinkedIn profiel data'
  },

  // Professionele informatie
  currentTitle: {
    type: DataTypes.STRING,
    allowNull: true
  },
  currentCompany: {
    type: DataTypes.STRING,
    allowNull: true
  },
  experience: {
    type: DataTypes.JSONB,
    defaultValue: [],
    comment: 'Array van werkervaring objecten'
  },
  education: {
    type: DataTypes.JSONB,
    defaultValue: [],
    comment: 'Array van opleiding objecten'
  },
  skills: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  languages: {
    type: DataTypes.JSONB,
    defaultValue: [],
    comment: 'Array van talen met niveau'
  },

  // Berekende scores
  totalScore: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0,
    comment: 'Gewogen totaalscore (0-100)'
  },
  matchPercentage: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0,
    comment: 'Match percentage (0-100)'
  },

  // Status & tracking
  status: {
    type: DataTypes.ENUM(
      'sourced',           // Gevonden
      'qualified',         // Gekwalificeerd
      'message_drafted',   // Bericht opgesteld
      'contacted',         // Benaderd
      'responded',         // Gereageerd
      'interview',         // Interview gepland
      'offer',             // Aanbieding gedaan
      'hired',             // Aangenomen
      'rejected',          // Afgewezen
      'not_interested'     // Niet geïnteresseerd
    ),
    defaultValue: 'sourced'
  },

  // Source tracking
  source: {
    type: DataTypes.ENUM('linkedin_scrape', 'linkedin_api', 'manual', 'referral', 'other'),
    defaultValue: 'manual'
  },
  sourceUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },

  // Notes & metadata
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  tags: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },

  // Scraping metadata
  lastScrapedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  scrapingErrors: {
    type: DataTypes.JSONB,
    defaultValue: null
  },

  addedBy: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'candidates',
  indexes: [
    {
      fields: ['vacancy_id']
    },
    {
      fields: ['status']
    },
    {
      fields: ['match_percentage']
    },
    {
      fields: ['linkedin_url']
    },
    {
      unique: true,
      fields: ['vacancy_id', 'linkedin_url'],
      name: 'unique_candidate_per_vacancy'
    }
  ]
});

// Instance methods
Candidate.prototype.getFullName = function() {
  return `${this.firstName} ${this.lastName}`;
};

Candidate.prototype.updateMatchPercentage = function(totalPossibleScore) {
  if (totalPossibleScore > 0) {
    this.matchPercentage = (this.totalScore / totalPossibleScore) * 100;
  }
  return this.matchPercentage;
};

export default Candidate;
