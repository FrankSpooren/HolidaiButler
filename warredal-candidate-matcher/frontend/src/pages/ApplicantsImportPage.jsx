import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { vacancyAPI } from '../services/api';
import { FiUpload, FiDownload, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import axios from 'axios';

const ApplicantsImportPage = () => {
  const [selectedVacancy, setSelectedVacancy] = useState('');
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const navigate = useNavigate();

  const { data: vacancies, isLoading } = useQuery({
    queryKey: ['vacancies'],
    queryFn: () => vacancyAPI.getAll({ status: 'active' }),
  });

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Validate file type
      const validTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
      if (!validTypes.includes(selectedFile.type)) {
        toast.error('Please upload a CSV or Excel file');
        return;
      }

      // Validate file size (max 10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }

      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!selectedVacancy) {
      toast.error('Please select a vacancy');
      return;
    }

    if (!file) {
      toast.error('Please select a file to upload');
      return;
    }

    setIsUploading(true);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('vacancyId', selectedVacancy);

      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/applicants/import-linkedin-csv`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`
          }
        }
      );

      setUploadResult(response.data.data);
      toast.success(`Successfully imported ${response.data.data.imported} applicants!`);

      // Reset form
      setFile(null);
      document.getElementById('fileInput').value = '';

    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.response?.data?.message || 'Failed to import applicants');
    } finally {
      setIsUploading(false);
    }
  };

  const downloadTemplate = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/applicants/templates/csv`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      // Create blob and download
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'linkedin-applicants-template.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('Template downloaded');
    } catch (error) {
      toast.error('Failed to download template');
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Import LinkedIn Sollicitanten</h1>
        <p className="text-gray-600 mt-1">
          Upload een CSV bestand met sollicitanten uit LinkedIn Easy Apply
        </p>
      </div>

      {/* Instructions Card */}
      <div className="card mb-6 bg-blue-50 border border-blue-200">
        <h2 className="text-lg font-semibold text-blue-900 mb-3">📝 Hoe werkt het?</h2>
        <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
          <li>Exporteer je LinkedIn sollicitanten naar CSV (via LinkedIn Recruiter of Jobs)</li>
          <li>Of download de template en vul handmatig in</li>
          <li>Selecteer de vacature waar sollicitanten bij horen</li>
          <li>Upload het CSV bestand</li>
          <li>Sollicitanten worden automatisch gescoord en toegevoegd</li>
        </ol>

        <button
          onClick={downloadTemplate}
          className="btn btn-secondary btn-sm mt-4 inline-flex items-center gap-2"
        >
          <FiDownload size={16} />
          Download CSV Template
        </button>
      </div>

      {/* Upload Form */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Upload Sollicitanten</h2>

        <div className="space-y-4">
          {/* Vacancy Selection */}
          <div>
            <label className="label">Selecteer Vacature *</label>
            {isLoading ? (
              <div className="input bg-gray-50">Laden...</div>
            ) : (
              <select
                value={selectedVacancy}
                onChange={(e) => setSelectedVacancy(e.target.value)}
                className="input"
                required
              >
                <option value="">-- Kies vacature --</option>
                {vacancies?.data?.data?.map((vacancy) => (
                  <option key={vacancy.id} value={vacancy.id}>
                    {vacancy.title} - {vacancy.organization}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* File Upload */}
          <div>
            <label className="label">CSV Bestand *</label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-500 transition-colors">
              <input
                id="fileInput"
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
              />
              <label htmlFor="fileInput" className="cursor-pointer">
                <FiUpload className="mx-auto text-gray-400 mb-2" size={32} />
                {file ? (
                  <p className="text-sm font-medium text-gray-900">{file.name}</p>
                ) : (
                  <>
                    <p className="text-sm font-medium text-gray-900">
                      Klik om bestand te selecteren
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      CSV of Excel (.xlsx) - Max 10MB
                    </p>
                  </>
                )}
              </label>
            </div>
          </div>

          {/* Upload Button */}
          <button
            onClick={handleUpload}
            disabled={isUploading || !selectedVacancy || !file}
            className="btn btn-primary w-full"
          >
            {isUploading ? (
              <>
                <div className="spinner w-5 h-5 mr-2"></div>
                Bezig met uploaden...
              </>
            ) : (
              <>
                <FiUpload size={20} className="mr-2" />
                Upload en Importeer
              </>
            )}
          </button>
        </div>
      </div>

      {/* Upload Result */}
      {uploadResult && (
        <div className="card mt-6">
          <h2 className="text-lg font-semibold mb-4">Import Resultaat</h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-600 mb-1">Totaal</p>
              <p className="text-2xl font-bold text-blue-900">{uploadResult.total}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-green-600 mb-1">Geïmporteerd</p>
              <p className="text-2xl font-bold text-green-900">{uploadResult.imported}</p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <p className="text-sm text-yellow-600 mb-1">Overgeslagen</p>
              <p className="text-2xl font-bold text-yellow-900">{uploadResult.skipped}</p>
            </div>
          </div>

          {/* Imported Candidates */}
          {uploadResult.candidates && uploadResult.candidates.length > 0 && (
            <div className="mb-4">
              <h3 className="font-medium mb-2 flex items-center gap-2">
                <FiCheckCircle className="text-green-500" />
                Geïmporteerde Kandidaten
              </h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {uploadResult.candidates.map((candidate, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm"
                  >
                    <div>
                      <p className="font-medium">{candidate.name}</p>
                      <p className="text-gray-500">{candidate.email}</p>
                    </div>
                    <span className="badge badge-success">
                      {candidate.matchPercentage}% match
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Errors */}
          {uploadResult.errors && uploadResult.errors.length > 0 && (
            <div>
              <h3 className="font-medium mb-2 flex items-center gap-2 text-red-600">
                <FiAlertCircle />
                Errors ({uploadResult.errors.length})
              </h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {uploadResult.errors.map((error, index) => (
                  <div key={index} className="p-2 bg-red-50 rounded text-sm text-red-700">
                    <span className="font-medium">Rij {error.row || index + 1}:</span> {error.error}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => navigate('/candidates')}
              className="btn btn-primary flex-1"
            >
              Bekijk Kandidaten
            </button>
            <button
              onClick={() => {
                setUploadResult(null);
                setFile(null);
              }}
              className="btn btn-secondary flex-1"
            >
              Nieuwe Import
            </button>
          </div>
        </div>
      )}

      {/* Help Section */}
      <div className="card mt-6 bg-gray-50">
        <h2 className="text-lg font-semibold mb-3">💡 Tips</h2>
        <ul className="space-y-2 text-sm text-gray-700">
          <li>• <strong>LinkedIn Easy Apply</strong>: Exporteer sollicitanten via LinkedIn Jobs dashboard</li>
          <li>• <strong>CSV Formaat</strong>: Zorg dat je CSV de volgende kolommen bevat: First Name, Last Name, Email</li>
          <li>• <strong>Optioneel</strong>: Phone, LinkedIn Profile URL, Location, Current Title, Cover Letter</li>
          <li>• <strong>Duplicaten</strong>: Bestaande sollicitanten (zelfde email + vacature) worden automatisch overgeslagen</li>
          <li>• <strong>Automatische Scoring</strong>: Alle geïmporteerde sollicitanten worden automatisch gescoord op basis van vacature criteria</li>
        </ul>
      </div>
    </div>
  );
};

export default ApplicantsImportPage;
