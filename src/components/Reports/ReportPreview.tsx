import React from 'react';
import { X, Download, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Sample, Client, Project, TestResult } from '../../types';
import { generatePDFReport } from '../../utils/pdfGenerator';

interface ReportPreviewProps {
  samples: Sample[];
  clients: Client[];
  projects: Project[];
  testResults: TestResult[];
  reportType: 'single' | 'batch';
  onClose: () => void;
  onGenerate: () => void;
}

export const ReportPreview: React.FC<ReportPreviewProps> = ({
  samples,
  clients,
  projects,
  testResults,
  reportType,
  onClose,
  onGenerate
}) => {
  const { t } = useTranslation();

  const getClient = (clientId: string) => clients.find(c => c.id === clientId);
  const getProject = (projectId: string) => projects.find(p => p.id === projectId);
  const getSampleResults = (sampleId: string) => testResults.filter(r => r.sampleId === sampleId);

  const generatePDF = () => {
    try {
      // Generate the PDF using the utility function
      generatePDFReport({
        samples,
        clients,
        projects,
        testResults,
        reportType
      });
      
      // Call the onGenerate callback to handle any additional logic
      onGenerate();
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {t('reports.previewTitle')} - {reportType === 'single' ? t('reports.singleReport') : t('reports.batchReport')}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* PDF Preview Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="bg-white border border-gray-300 shadow-lg max-w-3xl mx-auto" style={{ aspectRatio: '8.5/11' }}>
            {/* Report Header */}
            <div className="p-8 border-b border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">PhytoLIMS</h1>
                  <p className="text-sm text-gray-600">{t('auth.subtitle')}</p>
                </div>
                <div className="text-right text-sm text-gray-600">
                  <p>{t('reports.reportNumber')}: RPT-{new Date().getFullYear()}-{String(Math.floor(Math.random() * 1000)).padStart(3, '0')}</p>
                  <p>{t('common.date')}: {new Date().toLocaleDateString()}</p>
                </div>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <h2 className="text-lg font-semibold text-green-800 mb-2">
                  {reportType === 'single' ? t('reports.diagnosticReport') : t('reports.batchDiagnosticReport')}
                </h2>
                <p className="text-sm text-green-700">
                  {t('reports.reportDescription')}
                </p>
              </div>
            </div>

            {/* Client Information */}
            {samples.length > 0 && (
              <div className="p-8 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('reports.clientInformation')}</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">{t('reports.clientName')}:</span>
                    <p className="text-gray-900">{getClient(samples[0].clientId)?.name}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">{t('reports.projectName')}:</span>
                    <p className="text-gray-900">{getProject(samples[0].projectId)?.name}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">{t('reports.contactEmail')}:</span>
                    <p className="text-gray-900">{getClient(samples[0].clientId)?.email}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">{t('reports.samplesAnalyzed')}:</span>
                    <p className="text-gray-900">{samples.length}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Sample Results */}
            <div className="p-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">{t('reports.analysisResults')}</h3>
              
              {samples.map((sample, index) => {
                const sampleResults = getSampleResults(sample.id);
                const client = getClient(sample.clientId);
                const project = getProject(sample.projectId);
                
                return (
                  <div key={sample.id} className={`mb-8 ${index > 0 ? 'border-t border-gray-200 pt-8' : ''}`}>
                    {/* Sample Information */}
                    <div className="bg-gray-50 p-4 rounded-lg mb-4">
                      <h4 className="font-semibold text-gray-900 mb-3">{t('reports.sampleInformation')}</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-gray-700">{t('samples.form.sampleCode')}:</span>
                          <p className="text-gray-900">{sample.code}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">{t('samples.form.plantSpecies')}:</span>
                          <p className="text-gray-900 italic">{sample.plantSpecies}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">{t('samples.form.tissueType')}:</span>
                          <p className="text-gray-900">{t(`samples.tissueTypes.${sample.tissueType}`)}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">{t('samples.form.collectionDate')}:</span>
                          <p className="text-gray-900">{sample.collectionDate.toLocaleDateString()}</p>
                        </div>
                        {sample.collectionLocation && (
                          <div className="col-span-2">
                            <span className="font-medium text-gray-700">{t('samples.form.collectionLocation')}:</span>
                            <p className="text-gray-900">{sample.collectionLocation}</p>
                          </div>
                        )}
                        {sample.symptoms && (
                          <div className="col-span-2">
                            <span className="font-medium text-gray-700">{t('samples.form.symptomsObserved')}:</span>
                            <p className="text-gray-900">{sample.symptoms}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Analysis Results */}
                    {sampleResults.length > 0 ? (
                      <div className="space-y-4">
                        <h5 className="font-semibold text-gray-900">{t('reports.analysisResults')}</h5>
                        {sampleResults.map(result => (
                          <div key={result.id} className="border border-gray-200 rounded-lg p-4">
                            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                              <div>
                                <span className="font-medium text-gray-700">{t('results.analysisType')}:</span>
                                <p className="text-gray-900">{result.analysisType}</p>
                              </div>
                              <div>
                                <span className="font-medium text-gray-700">{t('results.methodology')}:</span>
                                <p className="text-gray-900">{result.methodology}</p>
                              </div>
                              {result.pathogenIdentified && (
                                <>
                                  <div>
                                    <span className="font-medium text-gray-700">{t('results.pathogen')}:</span>
                                    <p className="text-gray-900 italic font-medium">{result.pathogenIdentified}</p>
                                  </div>
                                  <div>
                                    <span className="font-medium text-gray-700">{t('results.pathogenType')}:</span>
                                    <p className="text-gray-900">{result.pathogenType ? t(`results.pathogenTypes.${result.pathogenType}`) : 'N/A'}</p>
                                  </div>
                                  {result.severity && (
                                    <div>
                                      <span className="font-medium text-gray-700">{t('results.severity')}:</span>
                                      <p className="text-gray-900">{t(`results.severityLevels.${result.severity}`)}</p>
                                    </div>
                                  )}
                                  <div>
                                    <span className="font-medium text-gray-700">{t('results.confidence')}:</span>
                                    <p className="text-gray-900">{t(`results.confidenceLevels.${result.confidence}`)}</p>
                                  </div>
                                </>
                              )}
                            </div>
                            
                            <div className="mb-4">
                              <span className="font-medium text-gray-700">{t('results.diagnosticResults')}:</span>
                              <p className="text-gray-900 mt-1">{result.result}</p>
                            </div>

                            {result.microscopicObservations && (
                              <div className="mb-4">
                                <span className="font-medium text-gray-700">{t('results.microscopicObservations')}:</span>
                                <p className="text-gray-900 mt-1">{result.microscopicObservations}</p>
                              </div>
                            )}

                            {result.molecularResults && (
                              <div className="mb-4">
                                <span className="font-medium text-gray-700">{t('results.molecularResults')}:</span>
                                <p className="text-gray-900 mt-1">{result.molecularResults}</p>
                              </div>
                            )}

                            {result.recommendations && (
                              <div className="bg-blue-50 p-3 rounded border border-blue-200">
                                <span className="font-medium text-blue-800">{t('results.managementRecommendations')}:</span>
                                <p className="text-blue-700 mt-1">{result.recommendations}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <p>{t('reports.noResultsAvailable')}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Report Footer */}
            <div className="p-8 border-t border-gray-200 bg-gray-50">
              <div className="grid grid-cols-2 gap-8 text-sm">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">{t('reports.laboratoryInformation')}</h4>
                  <p className="text-gray-700">PhytoLIMS Laboratory</p>
                  <p className="text-gray-700">{t('auth.subtitle')}</p>
                  <p className="text-gray-700">lab@phytolims.com</p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">{t('reports.reportValidation')}</h4>
                  <p className="text-gray-700">{t('reports.analyzedBy')}: Dr. Sarah Johnson</p>
                  <p className="text-gray-700">{t('reports.validatedBy')}: Lab Supervisor</p>
                  <p className="text-gray-700">{t('reports.reportDate')}: {new Date().toLocaleDateString()}</p>
                </div>
              </div>
              
              <div className="mt-6 pt-4 border-t border-gray-300">
                <p className="text-xs text-gray-600 text-center">
                  {t('reports.disclaimer')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-4 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {t('common.close')}
          </button>
          <button
            onClick={generatePDF}
            className="flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="h-4 w-4 mr-2" />
            {t('reports.generatePDF')}
          </button>
        </div>
      </div>
    </div>
  );
};