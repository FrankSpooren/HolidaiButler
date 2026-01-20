import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { candidateAPI } from '../services/api';
import {
  FiArrowLeft,
  FiMapPin,
  FiMail,
  FiPhone,
  FiLinkedin,
  FiGlobe,
  FiUser,
  FiAward,
  FiBriefcase,
  FiMessageSquare,
  FiEdit,
  FiTrash2,
  FiCheckCircle,
  FiAlertCircle
} from 'react-icons/fi';
import toast from 'react-hot-toast';

const CandidateDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch candidate details
  const { data, isLoading } = useQuery({
    queryKey: ['candidate', id],
    queryFn: () => candidateAPI.getById(id),
  });

  // Update candidate mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => candidateAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['candidate', id]);
      toast.success('Kandidaat bijgewerkt');
    },
    onError: () => {
      toast.error('Fout bij bijwerken kandidaat');
    },
  });

  const candidate = data?.data?.data;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="spinner w-12 h-12"></div>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="card text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Kandidaat niet gevonden</h3>
        <p className="text-gray-600 mb-4">Deze kandidaat bestaat niet of is verwijderd</p>
        <Link to="/candidates" className="btn btn-primary">
          Terug naar Kandidaten
        </Link>
      </div>
    );
  }

  const scores = candidate.scores || [];
  const messages = candidate.messages || [];
  const experience = candidate.experience || [];
  const education = candidate.education || [];
  const skills = candidate.skills || [];
  const languages = candidate.languages || [];

  const handleStatusChange = (newStatus) => {
    updateMutation.mutate({
      id: candidate.id,
      data: { status: newStatus },
    });
  };

  const handleDelete = async () => {
    if (!confirm('Weet je zeker dat je deze kandidaat wilt verwijderen?')) return;

    try {
      await candidateAPI.delete(id);
      toast.success('Kandidaat succesvol verwijderd');
      navigate('/candidates');
    } catch (error) {
      toast.error('Fout bij verwijderen kandidaat');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      sourced: 'blue',
      qualified: 'green',
      contacted: 'yellow',
      responded: 'purple',
      interview: 'indigo',
      hired: 'success',
      rejected: 'red'
    };
    return colors[status] || 'gray';
  };

  const getStatusLabel = (status) => {
    const labels = {
      sourced: 'Gevonden',
      qualified: 'Gekwalificeerd',
      contacted: 'Gecontacteerd',
      responded: 'Gereageerd',
      interview: 'Gesprek',
      hired: 'Aangenomen',
      rejected: 'Afgewezen'
    };
    return labels[status] || status;
  };

  const getMatchColor = (percentage) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-blue-600';
    if (percentage >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          to={candidate.vacancy ? `/vacancies/${candidate.vacancy.id}` : '/candidates'}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <FiArrowLeft size={20} />
          Terug {candidate.vacancy && `naar ${candidate.vacancy.title}`}
        </Link>

        <div className="card">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Profile Picture Placeholder */}
            <div className="flex-shrink-0">
              <div className="w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-3xl sm:text-4xl font-bold">
                {candidate.firstName?.charAt(0)}{candidate.lastName?.charAt(0)}
              </div>
            </div>

            {/* Candidate Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                <div className="flex-1">
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                    {candidate.firstName} {candidate.lastName}
                  </h1>
                  {candidate.currentTitle && (
                    <p className="text-lg text-gray-700 mb-1">
                      {candidate.currentTitle}
                      {candidate.currentCompany && (
                        <span className="text-gray-600"> bij {candidate.currentCompany}</span>
                      )}
                    </p>
                  )}
                  {candidate.location && (
                    <div className="flex items-center gap-1 text-gray-600">
                      <FiMapPin size={16} />
                      <span>{candidate.location}</span>
                      {candidate.nationality && <span> • {candidate.nationality}</span>}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button className="btn btn-secondary inline-flex items-center gap-2">
                    <FiEdit size={18} />
                    <span className="hidden sm:inline">Bewerken</span>
                  </button>
                  <button
                    onClick={handleDelete}
                    className="btn btn-secondary text-red-600 hover:bg-red-50 inline-flex items-center gap-2"
                  >
                    <FiTrash2 size={18} />
                  </button>
                </div>
              </div>

              {/* Contact Info */}
              <div className="flex flex-wrap gap-4 text-sm mb-4">
                {candidate.email && (
                  <a
                    href={`mailto:${candidate.email}`}
                    className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
                  >
                    <FiMail size={16} />
                    <span>{candidate.email}</span>
                  </a>
                )}
                {candidate.phone && (
                  <a
                    href={`tel:${candidate.phone}`}
                    className="flex items-center gap-1 text-gray-600 hover:text-gray-900"
                  >
                    <FiPhone size={16} />
                    <span>{candidate.phone}</span>
                  </a>
                )}
                {candidate.linkedinUrl && (
                  <a
                    href={candidate.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
                  >
                    <FiLinkedin size={16} />
                    <span>LinkedIn Profiel</span>
                  </a>
                )}
              </div>

              {/* Status and Match Score */}
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Status Selector */}
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={candidate.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="sourced">Gevonden</option>
                    <option value="qualified">Gekwalificeerd</option>
                    <option value="contacted">Gecontacteerd</option>
                    <option value="responded">Gereageerd</option>
                    <option value="interview">Gesprek</option>
                    <option value="hired">Aangenomen</option>
                    <option value="rejected">Afgewezen</option>
                  </select>
                </div>

                {/* Match Score */}
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Match Score
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-gray-200 rounded-full h-3">
                      <div
                        className="h-3 rounded-full bg-gradient-to-r from-blue-500 to-green-500 transition-all"
                        style={{ width: `${candidate.matchPercentage || 0}%` }}
                      ></div>
                    </div>
                    <span className={`text-2xl font-bold ${getMatchColor(candidate.matchPercentage || 0)}`}>
                      {candidate.matchPercentage || 0}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Vacancy Info */}
      {candidate.vacancy && (
        <div className="card mb-6 bg-blue-50 border-blue-200">
          <div className="flex items-center gap-3">
            <FiBriefcase className="text-blue-600" size={24} />
            <div>
              <p className="text-sm text-gray-600">Vacature</p>
              <Link
                to={`/vacancies/${candidate.vacancy.id}`}
                className="text-lg font-semibold text-blue-600 hover:text-blue-700"
              >
                {candidate.vacancy.title}
              </Link>
              {candidate.vacancy.organization && (
                <span className="text-gray-600"> • {candidate.vacancy.organization}</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
              activeTab === 'overview'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Overzicht
          </button>
          <button
            onClick={() => setActiveTab('scores')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
              activeTab === 'scores'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Scores ({scores.length})
          </button>
          <button
            onClick={() => setActiveTab('messages')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
              activeTab === 'messages'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Berichten ({messages.length})
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Work Experience */}
          {experience.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FiBriefcase size={20} />
                Werkervaring
              </h3>
              <div className="space-y-4">
                {experience.map((exp, idx) => (
                  <div key={idx} className="border-l-2 border-blue-200 pl-4">
                    <h4 className="font-semibold text-gray-900">{exp.title}</h4>
                    <p className="text-gray-700">{exp.company}</p>
                    <p className="text-sm text-gray-500">{exp.duration}</p>
                    {exp.description && (
                      <p className="text-sm text-gray-600 mt-1">{exp.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Education */}
          {education.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FiAward size={20} />
                Opleiding
              </h3>
              <div className="space-y-4">
                {education.map((edu, idx) => (
                  <div key={idx} className="border-l-2 border-green-200 pl-4">
                    <h4 className="font-semibold text-gray-900">{edu.degree} {edu.field}</h4>
                    <p className="text-gray-700">{edu.school}</p>
                    <p className="text-sm text-gray-500">{edu.duration}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Skills & Languages */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Skills */}
            {skills.length > 0 && (
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Vaardigheden</h3>
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Languages */}
            {languages.length > 0 && (
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Talen</h3>
                <div className="space-y-2">
                  {languages.map((lang, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <span className="font-medium text-gray-900">{lang.language}</span>
                      <span className="badge badge-gray">{lang.level}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Source Info */}
          <div className="card bg-gray-50">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <FiUser size={16} />
              <span>
                Toegevoegd via <strong>{candidate.source === 'linkedin_scrape' ? 'LinkedIn Scraping' : candidate.source === 'linkedin_applicant' ? 'LinkedIn Sollicitatie' : 'Handmatig'}</strong>
              </span>
              {candidate.createdAt && (
                <span className="ml-auto">
                  {new Date(candidate.createdAt).toLocaleDateString('nl-NL')}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'scores' && (
        <div>
          {scores.length > 0 ? (
            <div className="space-y-4">
              {scores.map((score) => (
                <div key={score.id} className="card">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-1">
                        {score.criterion?.name || 'Onbekend criterium'}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {score.criterion?.description}
                      </p>
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-sm text-gray-500">Score</div>
                      <div className="text-2xl font-bold text-blue-600">
                        {score.rawScore || 0}/{score.criterion?.scoreType === 'scale' ? '10' : '1'}
                      </div>
                    </div>
                  </div>

                  {/* Score Bar */}
                  <div className="mb-2">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-blue-600 transition-all"
                        style={{ width: `${((score.rawScore || 0) / (score.criterion?.scoreType === 'scale' ? 10 : 1)) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Weighted Score */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">
                      Criterium gewicht: <strong>{score.criterion?.weight || 0}/10</strong>
                    </span>
                    <span className="font-medium text-gray-900">
                      Gewogen score: <strong className="text-blue-600">{score.weightedScore?.toFixed(1) || '0.0'}</strong>
                    </span>
                  </div>

                  {/* Match reason */}
                  {score.matchReason && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-start gap-2">
                        <FiCheckCircle className="text-blue-600 mt-0.5" size={16} />
                        <p className="text-sm text-gray-700">{score.matchReason}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Total Score Summary */}
              <div className="card bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-90">Totale Match Score</p>
                    <p className="text-3xl font-bold">{candidate.matchPercentage || 0}%</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm opacity-90">Gewogen Totaal</p>
                    <p className="text-2xl font-bold">{candidate.totalScore?.toFixed(1) || '0.0'}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="card text-center py-12">
              <FiAlertCircle className="mx-auto text-gray-400 mb-4" size={48} />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nog geen scores</h3>
              <p className="text-gray-600 mb-4">
                Deze kandidaat is nog niet gescoord tegen de selectiecriteria
              </p>
              <button className="btn btn-primary">Score Kandidaat</button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'messages' && (
        <div>
          {messages.length > 0 ? (
            <div className="space-y-4">
              {messages.map((message) => (
                <div key={message.id} className="card">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <FiMessageSquare size={20} className="text-blue-600" />
                      <div>
                        <p className="font-semibold text-gray-900">
                          {message.type === 'initial' ? 'Eerste benadering' : 'Opvolging'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {new Date(message.createdAt).toLocaleDateString('nl-NL')}
                        </p>
                      </div>
                    </div>
                    <span className={`badge badge-${message.status === 'sent' ? 'success' : message.status === 'draft' ? 'gray' : 'blue'}`}>
                      {message.status}
                    </span>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{message.content}</p>
                  </div>
                  {message.sentAt && (
                    <p className="text-xs text-gray-500 mt-2">
                      Verzonden: {new Date(message.sentAt).toLocaleString('nl-NL')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="card text-center py-12">
              <FiMessageSquare className="mx-auto text-gray-400 mb-4" size={48} />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nog geen berichten</h3>
              <p className="text-gray-600 mb-4">
                Genereer een gepersonaliseerd bericht om contact op te nemen
              </p>
              <button className="btn btn-primary inline-flex items-center gap-2">
                <FiMessageSquare size={18} />
                Genereer Bericht
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CandidateDetailPage;
