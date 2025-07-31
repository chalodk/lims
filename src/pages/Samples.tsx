import React, { useState } from 'react';
import { Plus, Filter, Search, Clock, Calendar, User, ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SampleCard } from '../components/Samples/SampleCard';
import { SampleForm } from '../components/Samples/SampleForm';
import { useData } from '../hooks/useData';

export const Samples: React.FC = () => {
  const { t } = useTranslation();
  const { samples, clients, projects, addSample, updateSampleStatus } = useData();
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isRecentSamplesExpanded, setIsRecentSamplesExpanded] = useState(true);

  const filteredSamples = samples.filter(sample => {
    const matchesSearch = sample.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sample.plantSpecies.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || sample.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Get newest samples (last 5 registered)
  const newestSamples = [...samples]
    .sort((a, b) => b.receivedAt.getTime() - a.receivedAt.getTime())
    .slice(0, 5);

  const getClient = (clientId: string) => clients.find(c => c.id === clientId)!;
  const getProject = (projectId: string) => projects.find(p => p.id === projectId)!;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('samples.title')}</h1>
          <p className="text-gray-600 mt-1">{t('samples.subtitle')}</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          {t('samples.register')}
        </button>
      </div>

      {/* Collapsible Newest Registered Samples Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div 
          className="px-6 py-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => setIsRecentSamplesExpanded(!isRecentSamplesExpanded)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-green-600" />
              <h2 className="text-lg font-semibold text-gray-900">Muestras Registradas Recientemente</h2>
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                {newestSamples.length}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">
                {isRecentSamplesExpanded ? 'Contraer' : 'Expandir'}
              </span>
              {isRecentSamplesExpanded ? (
                <ChevronUp className="h-5 w-5 text-gray-400" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-400" />
              )}
            </div>
          </div>
          <p className="text-sm text-gray-600 mt-1">Últimas 5 muestras registradas en el laboratorio</p>
        </div>
        
        {/* Collapsible Content */}
        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isRecentSamplesExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        }`}>
          <div className="p-6">
            {newestSamples.length > 0 ? (
              <div className="space-y-4">
                {newestSamples.map(sample => {
                  const client = getClient(sample.clientId);
                  const project = getProject(sample.projectId);
                  return (
                    <div key={sample.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="font-semibold text-gray-900">{sample.code}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            sample.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                            sample.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                            sample.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {t(`samples.priority.${sample.priority}`)}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                            sample.status === 'received' ? 'bg-gray-50 text-gray-700 border-gray-200' :
                            sample.status === 'processing' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            sample.status === 'completed' ? 'bg-green-50 text-green-700 border-green-200' :
                            'bg-yellow-50 text-yellow-700 border-yellow-200'
                          }`}>
                            {t(`samples.status.${sample.status}`)}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                          <div className="flex items-center">
                            <User className="h-4 w-4 mr-2 text-gray-400" />
                            <span>{client.name}</span>
                          </div>
                          <div>
                            <span className="font-medium">Especie:</span>
                            <span className="ml-1 italic">{sample.plantSpecies}</span>
                          </div>
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                            <span>Registrada: {sample.receivedAt.toLocaleDateString()}</span>
                          </div>
                        </div>
                        
                        {sample.symptoms && (
                          <div className="mt-2">
                            <span className="text-xs font-medium text-gray-500 uppercase">Síntomas:</span>
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{sample.symptoms}</p>
                          </div>
                        )}
                        
                        <div className="mt-2">
                          <span className="text-xs font-medium text-gray-500 uppercase">Análisis solicitados:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {sample.analysisTypes.slice(0, 3).map((type) => (
                              <span key={type} className="px-2 py-1 bg-green-100 text-xs text-green-700 rounded">
                                {type}
                              </span>
                            ))}
                            {sample.analysisTypes.length > 3 && (
                              <span className="px-2 py-1 bg-gray-100 text-xs text-gray-600 rounded">
                                +{sample.analysisTypes.length - 3} más
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="ml-6">
                        <button className="text-sm text-green-600 hover:text-green-700 font-medium">
                          Ver Detalles →
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No hay muestras registradas</h3>
                <p className="text-gray-600">Comienza registrando tu primera muestra</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder={t('samples.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="all">Todos los Estados</option>
                <option value="received">{t('samples.status.received')}</option>
                <option value="processing">{t('samples.status.processing')}</option>
                <option value="microscopy">{t('samples.status.microscopy')}</option>
                <option value="isolation">{t('samples.status.isolation')}</option>
                <option value="identification">{t('samples.status.identification')}</option>
                <option value="molecular_analysis">{t('samples.status.molecular_analysis')}</option>
                <option value="validation">{t('samples.status.validation')}</option>
                <option value="completed">{t('samples.status.completed')}</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Sample Cards */}
      {filteredSamples.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSamples.map(sample => (
            <SampleCard
              key={sample.id}
              sample={sample}
              client={getClient(sample.clientId)}
              project={getProject(sample.projectId)}
              onStatusChange={updateSampleStatus}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="text-gray-400 mb-4">
            <Search className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">{t('samples.noSamples')}</h3>
          <p className="text-gray-600">
            {searchTerm || statusFilter !== 'all' 
              ? t('samples.adjustFilters')
              : t('samples.getStarted')}
          </p>
        </div>
      )}

      {/* Sample Form Modal */}
      {showForm && (
        <SampleForm
          clients={clients}
          projects={projects}
          onSubmit={addSample}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
};