import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { candidateAPI } from '../services/api';
import { FiPlus, FiLinkedin } from 'react-icons/fi';

const CandidatesPage = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['candidates'],
    queryFn: () => candidateAPI.getAll(),
  });

  const candidates = data?.data?.data || [];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Kandidaten</h1>
          <p className="text-gray-600 mt-1">Overzicht van alle kandidaten</p>
        </div>
        <button className="btn btn-primary inline-flex items-center justify-center gap-2">
          <FiPlus size={20} />
          Kandidaat Toevoegen
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="spinner w-12 h-12"></div>
        </div>
      ) : candidates.length > 0 ? (
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4">Naam</th>
                <th className="text-left py-3 px-4 hidden md:table-cell">Functie</th>
                <th className="text-left py-3 px-4 hidden lg:table-cell">Locatie</th>
                <th className="text-center py-3 px-4">Match</th>
                <th className="text-center py-3 px-4 hidden sm:table-cell">Status</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((candidate) => (
                <tr key={candidate.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <Link to={`/candidates/${candidate.id}`} className="font-medium text-primary-600 hover:underline">
                      {candidate.firstName} {candidate.lastName}
                    </Link>
                    {candidate.linkedinUrl && (
                      <a
                        href={candidate.linkedinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center ml-2 text-gray-400 hover:text-primary-600"
                      >
                        <FiLinkedin size={16} />
                      </a>
                    )}
                  </td>
                  <td className="py-3 px-4 hidden md:table-cell text-sm text-gray-600">
                    {candidate.currentTitle || '-'}
                  </td>
                  <td className="py-3 px-4 hidden lg:table-cell text-sm text-gray-600">
                    {candidate.location || '-'}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="text-lg font-bold text-primary-600">
                      {candidate.matchPercentage || 0}%
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center hidden sm:table-cell">
                    <span className={`status-${candidate.status}`}>
                      {candidate.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card text-center py-12">
          <p className="text-gray-600 mb-4">Nog geen kandidaten</p>
          <button className="btn btn-primary inline-flex items-center gap-2">
            <FiPlus size={20} />
            Kandidaat Toevoegen
          </button>
        </div>
      )}
    </div>
  );
};

export default CandidatesPage;
