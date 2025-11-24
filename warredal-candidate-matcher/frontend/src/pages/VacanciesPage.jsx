import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { vacancyAPI } from '../services/api';
import { FiPlus, FiMapPin, FiUsers } from 'react-icons/fi';

const VacanciesPage = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['vacancies'],
    queryFn: () => vacancyAPI.getAll(),
  });

  const vacancies = data?.data?.data || [];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Vacatures</h1>
          <p className="text-gray-600 mt-1">Beheer je openstaande vacatures</p>
        </div>
        <Link to="/vacancies/new" className="btn btn-primary inline-flex items-center justify-center gap-2">
          <FiPlus size={20} />
          Nieuwe Vacature
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="spinner w-12 h-12"></div>
        </div>
      ) : vacancies.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {vacancies.map((vacancy) => (
            <Link
              key={vacancy.id}
              to={`/vacancies/${vacancy.id}`}
              className="card card-hover"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{vacancy.title}</h3>
                  <p className="text-gray-600">{vacancy.organization}</p>
                </div>
                <span className={`badge badge-${vacancy.status === 'active' ? 'success' : 'gray'}`}>
                  {vacancy.status}
                </span>
              </div>

              <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                <div className="flex items-center gap-1">
                  <FiMapPin size={16} />
                  <span>{vacancy.location}</span>
                </div>
                <div className="flex items-center gap-1">
                  <FiUsers size={16} />
                  <span>{vacancy.candidates?.length || 0} kandidaten</span>
                </div>
              </div>

              <p className="text-sm text-gray-600 line-clamp-2">{vacancy.description}</p>
            </Link>
          ))}
        </div>
      ) : (
        <div className="card text-center py-12">
          <FiBriefcase className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nog geen vacatures</h3>
          <p className="text-gray-600 mb-4">Begin met het aanmaken van je eerste vacature</p>
          <Link to="/vacancies/new" className="btn btn-primary inline-flex items-center gap-2">
            <FiPlus size={20} />
            Nieuwe Vacature
          </Link>
        </div>
      )}
    </div>
  );
};

export default VacanciesPage;
