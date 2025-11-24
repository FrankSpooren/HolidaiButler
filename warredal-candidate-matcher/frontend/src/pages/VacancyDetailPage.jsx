import { useParams } from 'react-router-dom';

const VacancyDetailPage = () => {
  const { id } = useParams();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Vacature Details</h1>
      <div className="card">
        <p className="text-gray-600">Vacature ID: {id}</p>
        <p className="text-sm text-gray-500 mt-2">Deze pagina wordt verder uitgewerkt...</p>
      </div>
    </div>
  );
};

export default VacancyDetailPage;
