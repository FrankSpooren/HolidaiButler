import { Candidate, Criterion, CandidateScore } from '../../models/index.js';
import { logger } from '../../utils/logger.js';

class MatchingEngine {
  /**
   * Score a single candidate against all criteria
   */
  async scoreCandidate(candidateId, userId = null) {
    try {
      logger.info(`🎯 Scoring candidate: ${candidateId}`);

      const candidate = await Candidate.findByPk(candidateId, {
        include: [
          {
            model: Criterion,
            as: 'scores',
            through: { attributes: [] }
          }
        ]
      });

      if (!candidate) {
        throw new Error('Candidate not found');
      }

      // Get all criteria for this vacancy
      const criteria = await Criterion.findAll({
        where: { vacancyId: candidate.vacancyId },
        order: [['order', 'ASC']]
      });

      if (criteria.length === 0) {
        logger.warn('⚠️ No criteria defined for this vacancy');
        return { totalScore: 0, matchPercentage: 0, scores: [] };
      }

      const scores = [];
      let totalWeightedScore = 0;
      let totalPossibleScore = 0;

      // Score each criterion
      for (const criterion of criteria) {
        const score = await this.scoreCriterion(candidate, criterion, userId);
        scores.push(score);

        totalWeightedScore += score.weightedScore || 0;
        totalPossibleScore += (10 * criterion.weight); // Max score per criterion is 10
      }

      // Calculate percentage
      const matchPercentage = totalPossibleScore > 0
        ? (totalWeightedScore / totalPossibleScore) * 100
        : 0;

      // Update candidate
      await candidate.update({
        totalScore: totalWeightedScore,
        matchPercentage: parseFloat(matchPercentage.toFixed(2))
      });

      logger.info(`✅ Candidate scored: ${matchPercentage.toFixed(2)}%`);

      return {
        candidateId,
        totalScore: totalWeightedScore,
        matchPercentage: parseFloat(matchPercentage.toFixed(2)),
        scores
      };

    } catch (error) {
      logger.error('❌ Error scoring candidate:', error);
      throw error;
    }
  }

  /**
   * Score a candidate on a specific criterion
   */
  async scoreCriterion(candidate, criterion, userId = null) {
    const candidateData = {
      education: candidate.education || [],
      experience: candidate.experience || [],
      skills: candidate.skills || [],
      languages: candidate.languages || [],
      location: candidate.location || '',
      nationality: candidate.nationality || '',
      currentTitle: candidate.currentTitle || '',
      linkedinProfileData: candidate.linkedinProfileData || {}
    };

    let rawScore = 0;
    let confidence = 0.5; // Default confidence
    let evidence = [];
    let booleanValue = null;
    let textValue = null;

    // Score based on category
    switch (criterion.category) {
      case 'education':
        ({ rawScore, confidence, evidence } = this.scoreEducation(candidateData, criterion));
        break;

      case 'experience':
        ({ rawScore, confidence, evidence } = this.scoreExperience(candidateData, criterion));
        break;

      case 'skills':
        ({ rawScore, confidence, evidence } = this.scoreSkills(candidateData, criterion));
        break;

      case 'network':
        ({ rawScore, confidence, evidence } = this.scoreNetwork(candidateData, criterion));
        break;

      case 'location':
        ({ rawScore, confidence, evidence } = this.scoreLocation(candidateData, criterion));
        break;

      case 'personality':
        // Personality requires manual scoring
        rawScore = 0;
        confidence = 0;
        evidence = ['Requires manual assessment'];
        break;

      default:
        rawScore = 0;
        confidence = 0;
        evidence = ['Unknown criterion category'];
    }

    // For boolean type criteria
    if (criterion.scoreType === 'boolean') {
      booleanValue = rawScore >= 5; // >= 5/10 = true
      rawScore = booleanValue ? 10 : 0;
    }

    const weightedScore = rawScore * criterion.weight;

    // Save or update score
    const [candidateScore, created] = await CandidateScore.upsert({
      candidateId: candidate.id,
      criterionId: criterion.id,
      rawScore,
      weightedScore,
      booleanValue,
      textValue,
      confidence,
      evidence,
      isAutomated: true,
      scoredBy: userId,
      scoredAt: new Date()
    }, {
      returning: true
    });

    return {
      criterionId: criterion.id,
      criterionName: criterion.name,
      rawScore,
      weightedScore,
      confidence,
      evidence
    };
  }

  /**
   * Score education criterion
   */
  scoreEducation(candidateData, criterion) {
    const keywords = criterion.keywords || [];
    const education = candidateData.education;

    let rawScore = 0;
    let confidence = 0.8;
    const evidence = [];

    if (!education || education.length === 0) {
      return { rawScore: 0, confidence: 1, evidence: ['No education data'] };
    }

    // Check for keyword matches
    for (const edu of education) {
      const eduText = `${edu.degree} ${edu.field} ${edu.school}`.toLowerCase();

      for (const keyword of keywords) {
        if (eduText.includes(keyword.toLowerCase())) {
          rawScore += 3;
          evidence.push(`Match: ${keyword} in ${edu.degree || edu.school}`);
        }
      }

      // Bonus for higher education
      if (edu.degree && (edu.degree.toLowerCase().includes('master') ||
          edu.degree.toLowerCase().includes('bachelor') ||
          edu.degree.toLowerCase().includes('universitair'))) {
        rawScore += 2;
        evidence.push(`Higher education: ${edu.degree}`);
      }
    }

    // Cap at 10
    rawScore = Math.min(10, rawScore);

    return { rawScore, confidence, evidence };
  }

  /**
   * Score experience criterion
   */
  scoreExperience(candidateData, criterion) {
    const keywords = criterion.keywords || [];
    const experience = candidateData.experience;

    let rawScore = 0;
    let confidence = 0.8;
    const evidence = [];

    if (!experience || experience.length === 0) {
      return { rawScore: 0, confidence: 1, evidence: ['No experience data'] };
    }

    // Calculate total years of experience (rough estimate)
    let totalYears = 0;
    for (const exp of experience) {
      if (exp.duration) {
        const years = this.extractYears(exp.duration);
        totalYears += years;

        // Check for keyword matches
        const expText = `${exp.title} ${exp.company} ${exp.description}`.toLowerCase();
        for (const keyword of keywords) {
          if (expText.includes(keyword.toLowerCase())) {
            rawScore += 2;
            evidence.push(`Match: ${keyword} in ${exp.title || exp.company}`);
          }
        }
      }
    }

    // Score based on years (e.g., 5+ years = high score)
    if (totalYears >= 5) {
      rawScore += 5;
      evidence.push(`${totalYears}+ years of experience`);
    } else if (totalYears >= 3) {
      rawScore += 3;
      evidence.push(`${totalYears} years of experience`);
    } else if (totalYears >= 1) {
      rawScore += 1;
      evidence.push(`${totalYears} year(s) of experience`);
    }

    rawScore = Math.min(10, rawScore);

    return { rawScore, confidence, evidence };
  }

  /**
   * Score skills criterion
   */
  scoreSkills(candidateData, criterion) {
    const keywords = criterion.keywords || [];
    const skills = candidateData.skills || [];

    let rawScore = 0;
    let confidence = 0.9;
    const evidence = [];

    if (skills.length === 0) {
      return { rawScore: 0, confidence: 1, evidence: ['No skills listed'] };
    }

    // Count keyword matches
    for (const keyword of keywords) {
      for (const skill of skills) {
        if (skill.toLowerCase().includes(keyword.toLowerCase())) {
          rawScore += 2;
          evidence.push(`Match: ${skill}`);
        }
      }
    }

    rawScore = Math.min(10, rawScore);

    return { rawScore, confidence, evidence };
  }

  /**
   * Score network criterion (requires manual assessment mostly)
   */
  scoreNetwork(candidateData, criterion) {
    // Network is hard to automatically assess from public profiles
    // This would require LinkedIn connection count, etc.

    const evidence = ['Network size requires manual assessment'];

    // Check location as proxy for network
    if (candidateData.location) {
      const location = candidateData.location.toLowerCase();
      if (location.includes('belgi') || location.includes('vlaanderen') ||
          location.includes('antwerp') || location.includes('brussels')) {
        return {
          rawScore: 5,
          confidence: 0.3,
          evidence: ['Located in Belgium - potential network']
        };
      }
      if (location.includes('nederlan') || location.includes('netherlands')) {
        return {
          rawScore: 3,
          confidence: 0.3,
          evidence: ['Located in Netherlands - potential network']
        };
      }
    }

    return { rawScore: 0, confidence: 0, evidence };
  }

  /**
   * Score location criterion
   */
  scoreLocation(candidateData, criterion) {
    const keywords = criterion.keywords || [];
    const location = candidateData.location ? candidateData.location.toLowerCase() : '';

    if (!location) {
      return { rawScore: 0, confidence: 1, evidence: ['No location data'] };
    }

    let rawScore = 0;
    const evidence = [];

    for (const keyword of keywords) {
      if (location.includes(keyword.toLowerCase())) {
        rawScore = 10;
        evidence.push(`Location match: ${location}`);
        break;
      }
    }

    return { rawScore, confidence: 0.9, evidence };
  }

  /**
   * Extract years from duration string (rough estimate)
   */
  extractYears(duration) {
    if (!duration) return 0;

    // Try to find "X yr" or "X year"
    const yearMatch = duration.match(/(\d+)\s*(yr|year)/i);
    if (yearMatch) {
      return parseInt(yearMatch[1], 10);
    }

    // Try to find "X mo" or "X month" and convert to years
    const monthMatch = duration.match(/(\d+)\s*(mo|month)/i);
    if (monthMatch) {
      return parseInt(monthMatch[1], 10) / 12;
    }

    return 0;
  }

  /**
   * Batch score all candidates for a vacancy
   */
  async scoreAllCandidates(vacancyId, userId = null) {
    logger.info(`🎯 Scoring all candidates for vacancy: ${vacancyId}`);

    const candidates = await Candidate.findAll({
      where: { vacancyId }
    });

    const results = [];

    for (const candidate of candidates) {
      try {
        const result = await this.scoreCandidate(candidate.id, userId);
        results.push(result);
      } catch (error) {
        logger.error(`❌ Failed to score candidate ${candidate.id}:`, error);
        results.push({
          candidateId: candidate.id,
          error: error.message
        });
      }
    }

    logger.info(`✅ Scored ${results.length} candidates`);
    return results;
  }
}

export default MatchingEngine;
