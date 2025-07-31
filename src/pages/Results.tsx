import React, { useState, useEffect } from 'react';
import { CheckCircle, Clock, AlertCircle, Plus, Microscope, Bug, Camera, XCircle, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useData } from '../hooks/useData';
import { TestResult } from '../types';

export const Results: React.FC = () => {
  const { t } = useTranslation();
  const { samples, testResults, addTestResult, validateTestResult, getLatestSample, clearLatestSample } = useData();
  const [selectedSample, setSelectedSample] = useState<string>('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newResult, setNewResult] = useState({
    sampleId: '',
    analysisType: '',
    pathogenIdentified: '',
    pathogenType: 'unknown' as TestResult['pathogenType'],
    severity: 'low' as TestResult['severity'],
    methodology: '',
    result: '',
    confidence: 'medium' as TestResult['confidence'],
    microscopicObservations: '',
    recommendations: '',
    resultType: 'negative' as 'positive' | 'negative',
    isPathogenPresent: false
  });

  // Check for latest sample when component mounts or when showing the form
  useEffect(() => {
    if (showAddForm) {
      const latestSample = getLatestSample();
      if (latestSample && !newResult.sampleId) {
        setNewResult(prev => ({ ...prev, sampleId: latestSample.id }));
      }
    }
  }, [showAddForm, getLatestSample, newResult.sampleId]);

  const getSample = (sampleId: string) => samples.find(s => s.id === sampleId);

  const handleValidateResult = (resultId: string) => {
    validateTestResult(resultId);
  };

  const handleRejectResult = (resultId: string) => {
    // In a real app, this would update the result status to rejected
    console.log('Rejecting result:', resultId);
  };

  const handleAddResult = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newResult.sampleId || !newResult.analysisType || !newResult.methodology || !newResult.result) {
      alert('Please fill in all required fields');
      return;
    }

    addTestResult({
      ...newResult,
      status: 'completed',
      performedBy: '2',
      performedAt: new Date()
    });

    // Reset form
    setNewResult({
      sampleId: '',
      analysisType: '',
      pathogenIdentified: '',
      pathogenType: 'unknown',
      severity: 'low',
      methodology: '',
      result: '',
      confidence: 'medium',
      microscopicObservations: '',
      recommendations: '',
      resultType: 'negative',
      isPathogenPresent: false
    });
    setShowAddForm(false);
  };

  const handleCloseForm = () => {
    setShowAddForm(false);
    // Clear latest sample tracking when user closes form without adding result
    clearLatestSample();
  };

  const getPathogenTypeColor = (type?: string) => {
    switch (type) {
      case 'fungus': return 'bg-green-100 text-green-700';
      case 'bacteria': return 'bg-blue-100 text-blue-700';
      case 'virus': return 'bg-red-100 text-red-700';
      case 'nematode': return 'bg-yellow-100 text-yellow-700';
      case 'insect': return 'bg-purple-100 text-purple-700';
      case 'abiotic': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'low': return 'bg-green-100 text-green-700';
      case 'moderate': return 'bg-yellow-100 text-yellow-700';
      case 'high': return 'bg-orange-100 text-orange-700';
      case 'severe': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getResultTypeColor = (resultType: 'positive' | 'negative') => {
    return resultType === 'positive' 
      ? 'bg-red-100 text-red-700 border-red-200' 
      : 'bg-green-100 text-green-700 border-green-200';
  };

  // Filter samples that can have results added - include all samples that are not completed
  // This includes newly created samples and samples in any stage of analysis
  const availableSamples = samples.filter(s => s.status !== 'completed');

  // Check if there's a latest sample for highlighting
  const latestSample = getLatestSample();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('results.title')}</h1>
          <p className="text-gray-600 mt-1">{t('results.subtitle')}</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          {t('results.addResult')}
        </button>
      </div>

      {/* Latest Sample Quick Access */}
      {latestSample && (
        <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Star className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Muestra Recién Registrada</h3>
                <p className="text-sm text-gray-600">
                  {latestSample.code} - {latestSample.plantSpecies} está lista para análisis
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setNewResult(prev => ({ ...prev, sampleId: latestSample.id }));
                setShowAddForm(true);
              }}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Agregar Resultado
            </button>
          </div>
        </div>
      )}

      {/* Pending Results */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">{t('results.pendingValidation')}</h2>
        </div>
        
        <div className="divide-y divide-gray-200">
          {testResults.filter(r => r.status === 'completed').map(result => {
            const sample = getSample(result.sampleId);
            return (
              <div key={result.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <h3 className="text-lg font-medium text-gray-900">
                        {sample?.code} - {result.analysisType}
                      </h3>
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                        {t('results.pendingValidation')}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border-2 ${getResultTypeColor(result.resultType)}`}>
                        {result.resultType === 'positive' ? 'POSITIVE' : 'NEGATIVE'}
                      </span>
                      {result.pathogenType && (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPathogenTypeColor(result.pathogenType)}`}>
                          {t(`results.pathogenTypes.${result.pathogenType}`)}
                        </span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="space-y-2">
                        <div className="text-sm">
                          <span className="font-medium text-gray-700">{t('samples.form.plantSpecies')}:</span>
                          <span className="ml-2 italic">{sample?.plantSpecies}</span>
                        </div>
                        <div className="text-sm">
                          <span className="font-medium text-gray-700">{t('samples.form.tissueType')}:</span>
                          <span className="ml-2">{sample?.tissueType.replace('_', ' ')}</span>
                        </div>
                        <div className="text-sm">
                          <span className="font-medium text-gray-700">{t('results.pathogen')} {t('common.status')}:</span>
                          <span className="ml-2">
                            {result.isPathogenPresent ? (
                              <span className="text-red-600 font-medium">Present</span>
                            ) : (
                              <span className="text-green-600 font-medium">Not Detected</span>
                            )}
                          </span>
                        </div>
                        {result.pathogenIdentified && (
                          <div className="text-sm">
                            <span className="font-medium text-gray-700">{t('results.pathogen')} {t('common.identified')}:</span>
                            <span className="ml-2 italic font-medium">{result.pathogenIdentified}</span>
                          </div>
                        )}
                        {result.severity && result.isPathogenPresent && (
                          <div className="text-sm">
                            <span className="font-medium text-gray-700">{t('results.severity')}:</span>
                            <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${getSeverityColor(result.severity)}`}>
                              {t(`results.severityLevels.${result.severity}`)}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <div className="text-sm">
                          <span className="font-medium text-gray-700">{t('results.methodology')}:</span>
                          <span className="ml-2">{result.methodology}</span>
                        </div>
                        <div className="text-sm">
                          <span className="font-medium text-gray-700">{t('results.confidence')}:</span>
                          <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                            result.confidence === 'high' ? 'bg-green-100 text-green-700' :
                            result.confidence === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {t(`results.confidenceLevels.${result.confidence}`)}
                          </span>
                        </div>
                        <div className="text-sm">
                          <span className="font-medium text-gray-700">{t('results.performed')} {t('common.by')}:</span>
                          <span className="ml-2">Lab Technician</span>
                        </div>
                        <div className="text-sm">
                          <span className="font-medium text-gray-700">{t('common.date')}:</span>
                          <span className="ml-2">{result.performedAt.toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg mb-4">
                      <h4 className="font-medium text-gray-900 mb-2">{t('results.diagnosticResults')}</h4>
                      <p className="text-sm text-gray-700 mb-3">{result.result}</p>
                      
                      {result.microscopicObservations && (
                        <div className="mb-3">
                          <h5 className="font-medium text-gray-800 text-sm mb-1">{t('results.microscopicObservations')}</h5>
                          <p className="text-sm text-gray-600">{result.microscopicObservations}</p>
                        </div>
                      )}
                      
                      {result.culturalCharacteristics && (
                        <div className="mb-3">
                          <h5 className="font-medium text-gray-800 text-sm mb-1">{t('results.culturalCharacteristics')}</h5>
                          <p className="text-sm text-gray-600">{result.culturalCharacteristics}</p>
                        </div>
                      )}
                      
                      {result.molecularResults && (
                        <div className="mb-3">
                          <h5 className="font-medium text-gray-800 text-sm mb-1">{t('results.molecularResults')}</h5>
                          <p className="text-sm text-gray-600">{result.molecularResults}</p>
                        </div>
                      )}
                    </div>

                    {result.recommendations && (
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <h4 className="font-medium text-blue-900 mb-2">{t('results.managementRecommendations')}</h4>
                        <p className="text-sm text-blue-800">{result.recommendations}</p>
                      </div>
                    )}

                    {result.comments && (
                      <div className="mt-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                        <p className="text-sm text-yellow-800">
                          <span className="font-medium">{t('results.additionalComments')}:</span> {result.comments}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-center space-y-2 ml-6">
                    <button
                      onClick={() => handleValidateResult(result.id)}
                      className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      {t('results.validate')}
                    </button>
                    <button 
                      onClick={() => handleRejectResult(result.id)}
                      className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      {t('results.reject')}
                    </button>
                    {result.images && result.images.length > 0 && (
                      <button className="flex items-center px-3 py-1 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200 transition-colors">
                        <Camera className="h-3 w-3 mr-1" />
                        {t('results.viewImages')} ({result.images.length})
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Validated Results */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">{t('results.recentlyValidated')}</h2>
        </div>
        
        <div className="divide-y divide-gray-200">
          {testResults.filter(r => r.status === 'validated').map(result => {
            const sample = getSample(result.sampleId);
            return (
              <div key={result.id} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-medium text-gray-900">
                        {sample?.code} - {result.analysisType}
                      </h3>
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                        {t('results.validated')}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border-2 ${getResultTypeColor(result.resultType)}`}>
                        {result.resultType === 'positive' ? 'POSITIVE' : 'NEGATIVE'}
                      </span>
                      {result.pathogenType && (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPathogenTypeColor(result.pathogenType)}`}>
                          {t(`results.pathogenTypes.${result.pathogenType}`)}
                        </span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">{t('results.pathogen')}:</span>
                        <p className="italic">{result.pathogenIdentified || 'Not identified'}</p>
                      </div>
                      <div>
                        <span className="font-medium">{t('results.methodology')}:</span>
                        <p>{result.methodology}</p>
                      </div>
                      <div>
                        <span className="font-medium">{t('results.performed')}:</span>
                        <p>{result.performedAt.toLocaleDateString()}</p>
                      </div>
                      <div>
                        <span className="font-medium">{t('results.validatedBy')}:</span>
                        <p>Supervisor</p>
                      </div>
                      <div>
                        <span className="font-medium">{t('results.validated')}:</span>
                        <p>{result.validatedAt?.toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>

                  <div className="ml-6">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Test Result Form */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">{t('results.addResult')}</h2>
              <button onClick={handleCloseForm} className="text-gray-400 hover:text-gray-600">
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleAddResult} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('samples.form.sampleCode')} *
                  </label>
                  <select
                    required
                    value={newResult.sampleId}
                    onChange={(e) => setNewResult(prev => ({ ...prev, sampleId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">Select Sample</option>
                    {availableSamples
                      .sort((a, b) => b.receivedAt.getTime() - a.receivedAt.getTime()) // Sort by newest first
                      .map(sample => (
                        <option key={sample.id} value={sample.id}>
                          {sample.code} - {sample.plantSpecies} ({t(`samples.status.${sample.status}`)})
                          {latestSample && latestSample.id === sample.id && ' ⭐ Recién registrada'}
                        </option>
                      ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('results.analysisType')} *
                  </label>
                  <select
                    required
                    value={newResult.analysisType}
                    onChange={(e) => setNewResult(prev => ({ ...prev, analysisType: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">Select Analysis Type</option>
                    <option value="Microscopy">Microscopy</option>
                    <option value="Cultural Isolation">Cultural Isolation</option>
                    <option value="Molecular PCR">Molecular PCR</option>
                    <option value="Serology">Serology</option>
                    <option value="ELISA">ELISA</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Result Type *
                  </label>
                  <select
                    required
                    value={newResult.resultType}
                    onChange={(e) => {
                      const resultType = e.target.value as 'positive' | 'negative';
                      setNewResult(prev => ({ 
                        ...prev, 
                        resultType,
                        isPathogenPresent: resultType === 'positive',
                        pathogenIdentified: resultType === 'negative' ? '' : prev.pathogenIdentified
                      }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="negative">Negative (No pathogen detected)</option>
                    <option value="positive">Positive (Pathogen detected)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('results.confidence')} *
                  </label>
                  <select
                    required
                    value={newResult.confidence}
                    onChange={(e) => setNewResult(prev => ({ ...prev, confidence: e.target.value as TestResult['confidence'] }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              {newResult.resultType === 'positive' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Pathogen Identified
                    </label>
                    <input
                      type="text"
                      value={newResult.pathogenIdentified}
                      onChange={(e) => setNewResult(prev => ({ ...prev, pathogenIdentified: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="e.g., Phytophthora infestans"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('results.pathogenType')}
                    </label>
                    <select
                      value={newResult.pathogenType}
                      onChange={(e) => setNewResult(prev => ({ ...prev, pathogenType: e.target.value as TestResult['pathogenType'] }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="unknown">Unknown</option>
                      <option value="fungus">Fungus</option>
                      <option value="bacteria">Bacteria</option>
                      <option value="virus">Virus</option>
                      <option value="nematode">Nematode</option>
                      <option value="insect">Insect</option>
                      <option value="abiotic">Abiotic</option>
                    </select>
                  </div>
                </div>
              )}

              {newResult.resultType === 'positive' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('results.severity')}
                  </label>
                  <select
                    value={newResult.severity}
                    onChange={(e) => setNewResult(prev => ({ ...prev, severity: e.target.value as TestResult['severity'] }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="low">Low</option>
                    <option value="moderate">Moderate</option>
                    <option value="high">High</option>
                    <option value="severe">Severe</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('results.methodology')} *
                </label>
                <input
                  type="text"
                  required
                  value={newResult.methodology}
                  onChange={(e) => setNewResult(prev => ({ ...prev, methodology: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="e.g., Light microscopy, DNA extraction and PCR"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('results.diagnosticResults')} *
                </label>
                <textarea
                  required
                  value={newResult.result}
                  onChange={(e) => setNewResult(prev => ({ ...prev, result: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Detailed description of findings..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('results.microscopicObservations')}
                </label>
                <textarea
                  value={newResult.microscopicObservations}
                  onChange={(e) => setNewResult(prev => ({ ...prev, microscopicObservations: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Microscopic observations and measurements..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('results.managementRecommendations')}
                </label>
                <textarea
                  value={newResult.recommendations}
                  onChange={(e) => setNewResult(prev => ({ ...prev, recommendations: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Treatment and management recommendations..."
                />
              </div>

              <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-lg hover:bg-green-700 transition-colors"
                >
                  {t('results.addResult')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};