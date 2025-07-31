import React, { useState } from 'react';
import { Download, FileText, Calendar, User, Eye } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useData } from '../hooks/useData';
import { ReportPreview } from '../components/Reports/ReportPreview';

export const Reports: React.FC = () => {
  const { t } = useTranslation();
  const { reports, samples, clients, testResults } = useData();
  const [selectedSamples, setSelectedSamples] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [previewType, setPreviewType] = useState<'single' | 'batch'>('single');

  const completedSamples = samples.filter(s => s.status === 'completed');

  const handleSampleToggle = (sampleId: string) => {
    setSelectedSamples(prev => 
      prev.includes(sampleId) 
        ? prev.filter(id => id !== sampleId)
        : [...prev, sampleId]
    );
  };

  const handlePreview = (type: 'single' | 'batch') => {
    setPreviewType(type);
    setShowPreview(true);
  };

  const generateReport = (type: 'single' | 'batch') => {
    // In a real app, this would generate and download the PDF
    console.log('Generating', type, 'report for samples:', selectedSamples);
    setShowPreview(false);
    setSelectedSamples([]);
  };

  const getClient = (clientId: string) => clients.find(c => c.id === clientId);

  const selectedSampleData = samples.filter(s => selectedSamples.includes(s.id));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('reports.title')}</h1>
        <p className="text-gray-600 mt-1">{t('reports.subtitle')}</p>
      </div>

      {/* Report Generation */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">{t('reports.generateNew')}</h2>
        </div>
        
        <div className="p-6">
          <div className="mb-6">
            <h3 className="text-md font-medium text-gray-900 mb-3">{t('reports.selectSamples')}</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {completedSamples.map(sample => {
                const client = getClient(sample.clientId);
                return (
                  <label key={sample.id} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedSamples.includes(sample.id)}
                      onChange={() => handleSampleToggle(sample.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900">{sample.code}</span>
                        <span className="text-sm text-gray-500">{client?.name}</span>
                      </div>
                      <p className="text-sm text-gray-600">{sample.plantSpecies} • {sample.description}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex items-center space-x-4 mb-4">
            <button
              onClick={() => handlePreview('single')}
              disabled={selectedSamples.length !== 1}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              <Eye className="h-4 w-4 mr-2" />
              {t('reports.previewSingle')}
            </button>
            
            <button
              onClick={() => handlePreview('batch')}
              disabled={selectedSamples.length < 2}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              <Eye className="h-4 w-4 mr-2" />
              {t('reports.previewBatch')}
            </button>
          </div>
          
          <p className="text-sm text-gray-600">
            {t('reports.samplesSelected', { count: selectedSamples.length })}
          </p>
        </div>
      </div>

      {/* Generated Reports */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">{t('reports.generatedReports')}</h2>
        </div>
        
        <div className="divide-y divide-gray-200">
          {reports.map(report => {
            const client = getClient(report.clientId);
            return (
              <div key={report.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-medium text-gray-900">
                        {report.type === 'diagnostic' ? t('reports.singleReport') : t('reports.batchReport')}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        report.status === 'generated' 
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {report.status}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-gray-600">
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-1" />
                        <span>{client?.name}</span>
                      </div>
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        <span>{report.generatedAt?.toLocaleDateString()}</span>
                      </div>
                      <div>
                        <span className="font-medium">{t('reports.samples')}:</span> {report.sampleIds.length}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-6">
                    <button className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                      <Download className="h-4 w-4 mr-1" />
                      {t('reports.download')}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Report Templates */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('reports.templates')}</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 cursor-pointer transition-colors">
            <h4 className="font-medium text-gray-900 mb-2">{t('reports.standardTemplate')}</h4>
            <p className="text-sm text-gray-600">{t('reports.standardDescription')}</p>
          </div>
          
          <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 cursor-pointer transition-colors">
            <h4 className="font-medium text-gray-900 mb-2">{t('reports.regulatoryTemplate')}</h4>
            <p className="text-sm text-gray-600">{t('reports.regulatoryDescription')}</p>
          </div>
          
          <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 cursor-pointer transition-colors">
            <h4 className="font-medium text-gray-900 mb-2">{t('reports.clientSummary')}</h4>
            <p className="text-sm text-gray-600">{t('reports.clientDescription')}</p>
          </div>
        </div>
      </div>

      {/* Report Preview Modal */}
      {showPreview && (
        <ReportPreview
          samples={selectedSampleData}
          clients={clients}
          projects={[]}
          testResults={testResults}
          reportType={previewType}
          onClose={() => setShowPreview(false)}
          onGenerate={() => generateReport(previewType)}
        />
      )}
    </div>
  );
};