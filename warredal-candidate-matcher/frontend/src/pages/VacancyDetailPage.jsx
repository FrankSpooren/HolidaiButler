import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { vacancyAPI } from '../services/api';
import {
  FiArrowLeft,
  FiMapPin,
  FiGlobe,
  FiUsers,
  FiTrendingUp,
  FiDownload,
  FiPlus,
  FiEdit,
  FiTrash2,
  FiMail,
  FiExternalLink
} from 'react-icons/fi';
import toast from 'react-hot-toast';

const VacancyDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch vacancy details
  const { data: vacancyData, isLoading: loadingVacancy } = useQuery({
    queryKey: ['vacancy', id],
    queryFn: () => vacancyAPI.getById(id),
  });

  // Fetch vacancy statistics
  const { data: statsData, isLoading: loadingStats } = useQuery({
    queryKey: ['vacancy-stats', id],
    queryFn: () => vacancyAPI.getStats(id),
  });

  const vacancy = vacancyData?.data?.data;
  const stats = statsData?.data?.data;

  if (loadingVacancy || loadingStats) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="spinner w-12 h-12"></div>
      </div>
    );
  }

  if (!vacancy) {
    return (
      <div className="card text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Vacature niet gevonden</h3>
        <p className="text-gray-600 mb-4">Deze vacature bestaat niet of is verwijderd</p>
        <Link to="/vacancies" className="btn btn-primary">
          Terug naar Vacatures
        </Link>
      </div>
    );
  }

  const candidates = vacancy.candidates || [];
  const criteria = vacancy.criteria || [];

  // Sort candidates by match percentage
  const sortedCandidates = [...candidates].sort((a, b) =>
    (b.matchPercentage || 0) - (a.matchPercentage || 0)
  );

  const handleDelete = async () => {
    if (!confirm('Weet je zeker dat je deze vacature wilt verwijderen?')) return;

    try {
      await vacancyAPI.delete(id);
      toast.success('Vacature succesvol verwijderd');
      navigate('/vacancies');
    } catch (error) {
      toast.error('Fout bij verwijderen vacature');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      sourced: 'blue',
      qualified: 'green',
      contacted: 'yellow',
      responded: 'purple',
      interview: 'indigo',
      hired: 'success'
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
      hired: 'Aangenomen'
    };
    return labels[status] || status;
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/vacancies"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <FiArrowLeft size={20} />
          Terug naar vacatures
        </Link>

        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                {vacancy.title}
              </h1>
              <span className={`badge badge-${vacancy.status === 'active' ? 'success' : 'gray'}`}>
                {vacancy.status}
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 text-gray-600">
              <span className="font-medium">{vacancy.organization}</span>
              <span className="hidden sm:inline">•</span>
              <div className="flex items-center gap-1">
                <FiMapPin size={16} />
                <span>{vacancy.location}</span>
              </div>
              {vacancy.websiteUrl && (
                <>
                  <span className="hidden sm:inline">•</span>
                  <a
                    href={vacancy.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
                  >
                    <FiGlobe size={16} />
                    <span>Website</span>
                    <FiExternalLink size={14} />
                  </a>
                </>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button className="btn btn-secondary inline-flex items-center gap-2">
              <FiDownload size={18} />
              <span className="hidden sm:inline">Exporteren</span>
            </button>
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
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Totaal Kandidaten</span>
              <FiUsers className="text-blue-600" size={20} />
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.totalCandidates}</div>
            <div className="text-xs text-gray-500 mt-1">
              {vacancy.targetCount ? `Doel: ${vacancy.targetCount}` : 'Geen doel ingesteld'}
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Gemiddelde Match</span>
              <FiTrendingUp className="text-green-600" size={20} />
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.averageMatchPercentage}%</div>
            <div className="text-xs text-gray-500 mt-1">Van alle kandidaten</div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Gekwalificeerd</span>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.byStatus.qualified}</div>
            <div className="text-xs text-gray-500 mt-1">Klaar voor contact</div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">In Gesprek</span>
              <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {stats.byStatus.interview + stats.byStatus.responded}
            </div>
            <div className="text-xs text-gray-500 mt-1">Actief in proces</div>
          </div>
        </div>
      )}

      {/* Status Pipeline */}
      {stats && stats.totalCandidates > 0 && (
        <div className="card mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Kandidaten Pipeline</h3>
          <div className="space-y-3">
            {Object.entries(stats.byStatus).map(([status, count]) => {
              if (count === 0) return null;
              const percentage = (count / stats.totalCandidates) * 100;
              return (
                <div key={status}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`badge badge-${getStatusColor(status)}`}>
                        {getStatusLabel(status)}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {count} ({percentage.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full bg-${getStatusColor(status)}-500`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
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
            onClick={() => setActiveTab('candidates')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
              activeTab === 'candidates'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Kandidaten ({candidates.length})
          </button>
          <button
            onClick={() => setActiveTab('criteria')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
              activeTab === 'criteria'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Criteria ({criteria.length})
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Functieomschrijving</h3>
            <div className="prose max-w-none text-gray-700 whitespace-pre-wrap">
              {vacancy.description || 'Geen beschrijving beschikbaar'}
            </div>
          </div>

          {vacancy.requirements && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Functie-eisen</h3>
              <div className="prose max-w-none text-gray-700 whitespace-pre-wrap">
                {vacancy.requirements}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'candidates' && (
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Alle Kandidaten ({candidates.length})
            </h3>
            <div className="flex gap-2">
              <Link
                to="/applicants/import"
                className="btn btn-secondary inline-flex items-center gap-2"
              >
                <FiPlus size={18} />
                Importeer Sollicitanten
              </Link>
              <button className="btn btn-primary inline-flex items-center gap-2">
                <FiMail size={18} />
                Genereer Berichten
              </button>
            </div>
          </div>

          {sortedCandidates.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {sortedCandidates.map((candidate) => (
                <Link
                  key={candidate.id}
                  to={`/candidates/${candidate.id}`}
                  className="card card-hover"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    {/* Candidate Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="text-lg font-semibold text-gray-900">
                            {candidate.firstName} {candidate.lastName}
                          </h4>
                          <p className="text-gray-600 text-sm">
                            {candidate.currentTitle}
                            {candidate.currentCompany && ` bij ${candidate.currentCompany}`}
                          </p>
                        </div>
                        <span className={`badge badge-${getStatusColor(candidate.status)} ml-2`}>
                          {getStatusLabel(candidate.status)}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 mb-3">
                        {candidate.location && (
                          <div className="flex items-center gap-1">
                            <FiMapPin size={14} />
                            <span>{candidate.location}</span>
                          </div>
                        )}
                        {candidate.email && (
                          <span className="truncate">{candidate.email}</span>
                        )}
                      </div>

                      {/* Match Percentage Bar */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-700">Match Score</span>
                          <span className="text-sm font-bold text-blue-600">
                            {candidate.matchPercentage || 0}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-green-500 transition-all"
                            style={{ width: `${candidate.matchPercentage || 0}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="card text-center py-12">
              <FiUsers className="mx-auto text-gray-400 mb-4" size={48} />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nog geen kandidaten</h3>
              <p className="text-gray-600 mb-4">Begin met het zoeken of importeren van kandidaten</p>
              <div className="flex justify-center gap-2">
                <Link to="/applicants/import" className="btn btn-secondary inline-flex items-center gap-2">
                  <FiPlus size={18} />
                  Importeer Sollicitanten
                </Link>
                <button className="btn btn-primary inline-flex items-center gap-2">
                  <FiUsers size={18} />
                  Zoek Kandidaten
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'criteria' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Selectiecriteria ({criteria.length})
            </h3>
            <button className="btn btn-primary inline-flex items-center gap-2">
              <FiPlus size={18} />
              Nieuw Criterium
            </button>
          </div>

          {criteria.length > 0 ? (
            <div className="space-y-3">
              {criteria.map((criterion) => (
                <div key={criterion.id} className="card">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-gray-900">{criterion.name}</h4>
                        {criterion.required && (
                          <span className="badge badge-red text-xs">Verplicht</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{criterion.description}</p>
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-sm text-gray-500">Gewicht</div>
                      <div className="text-lg font-bold text-blue-600">{criterion.weight}/10</div>
                    </div>
                  </div>

                  {/* Weight Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                    <div
                      className="h-1.5 rounded-full bg-blue-600"
                      style={{ width: `${(criterion.weight / 10) * 100}%` }}
                    ></div>
                  </div>

                  {criterion.keywords && criterion.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {criterion.keywords.map((keyword, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="card text-center py-12">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nog geen criteria</h3>
              <p className="text-gray-600 mb-4">
                Voeg selectiecriteria toe om kandidaten automatisch te scoren
              </p>
              <button className="btn btn-primary inline-flex items-center gap-2">
                <FiPlus size={18} />
                Nieuw Criterium
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VacancyDetailPage;
