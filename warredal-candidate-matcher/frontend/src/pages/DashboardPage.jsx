import { useQuery } from '@tanstack/react-query';
import { vacancyAPI, candidateAPI } from '../services/api';
import { FiBriefcase, FiUsers, FiMail, FiTrendingUp } from 'react-icons/fi';

const StatCard = ({ icon: Icon, title, value, color }) => (
  <div className="card card-hover">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-600">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      </div>
      <div className={`w-12 h-12 rounded-lg ${color} flex items-center justify-center`}>
        <Icon size={24} className="text-white" />
      </div>
    </div>
  </div>
);

const DashboardPage = () => {
  const { data: vacancies, isLoading: vacanciesLoading } = useQuery({
    queryKey: ['vacancies'],
    queryFn: () => vacancyAPI.getAll({ status: 'active' }),
  });

  const { data: candidates, isLoading: candidatesLoading } = useQuery({
    queryKey: ['candidates'],
    queryFn: () => candidateAPI.getAll(),
  });

  const activeVacancies = vacancies?.data?.count || 0;
  const totalCandidates = candidates?.data?.count || 0;
  const avgMatch = candidates?.data?.data?.length > 0
    ? (candidates.data.data.reduce((sum, c) => sum + parseFloat(c.matchPercentage || 0), 0) / candidates.data.data.length).toFixed(1)
    : 0;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Overzicht van je recruitment activiteiten</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={FiBriefcase}
          title="Actieve Vacatures"
          value={vacanciesLoading ? '...' : activeVacancies}
          color="bg-primary-500"
        />
        <StatCard
          icon={FiUsers}
          title="Kandidaten"
          value={candidatesLoading ? '...' : totalCandidates}
          color="bg-green-500"
        />
        <StatCard
          icon={FiTrendingUp}
          title="Gem. Match"
          value={candidatesLoading ? '...' : `${avgMatch}%`}
          color="bg-purple-500"
        />
        <StatCard
          icon={FiMail}
          title="Berichten"
          value="0"
          color="bg-orange-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Vacancies */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Recente Vacatures</h2>
          {vacanciesLoading ? (
            <p className="text-gray-500">Laden...</p>
          ) : vacancies?.data?.data?.length > 0 ? (
            <div className="space-y-3">
              {vacancies.data.data.slice(0, 5).map((vacancy) => (
                <div key={vacancy.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{vacancy.title}</p>
                    <p className="text-sm text-gray-500">{vacancy.organization}</p>
                  </div>
                  <span className={`badge badge-${vacancy.status === 'active' ? 'success' : 'gray'}`}>
                    {vacancy.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">Nog geen vacatures</p>
          )}
        </div>

        {/* Top Candidates */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Top Kandidaten</h2>
          {candidatesLoading ? (
            <p className="text-gray-500">Laden...</p>
          ) : candidates?.data?.data?.length > 0 ? (
            <div className="space-y-3">
              {candidates.data.data.slice(0, 5).map((candidate) => (
                <div key={candidate.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      {candidate.firstName} {candidate.lastName}
                    </p>
                    <p className="text-sm text-gray-500">{candidate.currentTitle}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-primary-600">
                      {candidate.matchPercentage}%
                    </span>
                    <p className="text-xs text-gray-500">match</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">Nog geen kandidaten</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
