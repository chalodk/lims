import React, { useState, useMemo } from 'react';
import { Search as SearchIcon, Filter, Calendar, User, Microscope, FileText, Clock, MapPin, Bug, Leaf } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useData } from '../hooks/useData';

export const Search: React.FC = () => {
  const { t } = useTranslation();
  const { samples, clients, projects, testResults, wikiDocs } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  // Comprehensive search function
  const searchResults = useMemo(() => {
    if (searchTerm.length < 2 && searchType === 'all' && !dateRange.start && !dateRange.end) {
      return [];
    }

    let results: any[] = [];
    const searchLower = searchTerm.toLowerCase();

    // Search samples
    if (searchType === 'all' || searchType === 'samples') {
      const sampleResults = samples.filter(sample => {
        const matchesText = searchTerm.length < 2 || (
          sample.code.toLowerCase().includes(searchLower) ||
          sample.plantSpecies.toLowerCase().includes(searchLower) ||
          sample.plantVariety?.toLowerCase().includes(searchLower) ||
          sample.description?.toLowerCase().includes(searchLower) ||
          sample.symptoms?.toLowerCase().includes(searchLower) ||
          sample.collectionLocation?.toLowerCase().includes(searchLower) ||
          sample.suspectedPathogen?.toLowerCase().includes(searchLower) ||
          sample.analysisTypes.some(type => type.toLowerCase().includes(searchLower))
        );

        const matchesStatus = statusFilter === 'all' || sample.status === statusFilter;
        const matchesPriority = priorityFilter === 'all' || sample.priority === priorityFilter;
        
        const matchesDate = !dateRange.start || !dateRange.end || (
          sample.receivedAt >= new Date(dateRange.start) &&
          sample.receivedAt <= new Date(dateRange.end + 'T23:59:59')
        );

        return matchesText && matchesStatus && matchesPriority && matchesDate;
      });

      results = [...results, ...sampleResults.map(s => ({ ...s, type: 'sample' }))];
    }

    // Search clients
    if (searchType === 'all' || searchType === 'clients') {
      const clientResults = clients.filter(client => {
        const matchesText = searchTerm.length < 2 || (
          client.name.toLowerCase().includes(searchLower) ||
          client.email.toLowerCase().includes(searchLower) ||
          client.phone?.toLowerCase().includes(searchLower) ||
          client.region?.toLowerCase().includes(searchLower) ||
          client.cropTypes?.some(crop => crop.toLowerCase().includes(searchLower))
        );

        const matchesDate = !dateRange.start || !dateRange.end || (
          client.createdAt >= new Date(dateRange.start) &&
          client.createdAt <= new Date(dateRange.end + 'T23:59:59')
        );

        return matchesText && matchesDate;
      });

      results = [...results, ...clientResults.map(c => ({ ...c, type: 'client' }))];
    }

    // Search projects
    if (searchType === 'all' || searchType === 'projects') {
      const projectResults = projects.filter(project => {
        const matchesText = searchTerm.length < 2 || (
          project.name.toLowerCase().includes(searchLower) ||
          project.description?.toLowerCase().includes(searchLower) ||
          project.cropType?.toLowerCase().includes(searchLower) ||
          project.location?.toLowerCase().includes(searchLower) ||
          project.season?.toLowerCase().includes(searchLower)
        );

        const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
        
        const matchesDate = !dateRange.start || !dateRange.end || (
          project.createdAt >= new Date(dateRange.start) &&
          project.createdAt <= new Date(dateRange.end + 'T23:59:59')
        );

        return matchesText && matchesStatus && matchesDate;
      });

      results = [...results, ...projectResults.map(p => ({ ...p, type: 'project' }))];
    }

    // Search test results
    if (searchType === 'all' || searchType === 'results') {
      const resultResults = testResults.filter(result => {
        const matchesText = searchTerm.length < 2 || (
          result.analysisType.toLowerCase().includes(searchLower) ||
          result.pathogenIdentified?.toLowerCase().includes(searchLower) ||
          result.methodology.toLowerCase().includes(searchLower) ||
          result.result.toLowerCase().includes(searchLower) ||
          result.microscopicObservations?.toLowerCase().includes(searchLower) ||
          result.recommendations?.toLowerCase().includes(searchLower)
        );

        const matchesStatus = statusFilter === 'all' || result.status === statusFilter;
        
        const matchesDate = !dateRange.start || !dateRange.end || (
          result.performedAt >= new Date(dateRange.start) &&
          result.performedAt <= new Date(dateRange.end + 'T23:59:59')
        );

        return matchesText && matchesStatus && matchesDate;
      });

      results = [...results, ...resultResults.map(r => ({ ...r, type: 'result' }))];
    }

    // Search wiki documents
    if (searchType === 'all' || searchType === 'wiki') {
      const wikiResults = wikiDocs.filter(doc => {
        const matchesText = searchTerm.length < 2 || (
          doc.title.toLowerCase().includes(searchLower) ||
          doc.content.toLowerCase().includes(searchLower) ||
          doc.tags.some(tag => tag.toLowerCase().includes(searchLower)) ||
          doc.hostPlants?.some(plant => plant.toLowerCase().includes(searchLower))
        );

        const matchesDate = !dateRange.start || !dateRange.end || (
          doc.uploadedAt >= new Date(dateRange.start) &&
          doc.uploadedAt <= new Date(dateRange.end + 'T23:59:59')
        );

        return matchesText && matchesDate;
      });

      results = [...results, ...wikiResults.map(w => ({ ...w, type: 'wiki' }))];
    }

    // Sort results by relevance and date
    return results.sort((a, b) => {
      // Prioritize exact matches in codes/names
      const aExact = a.code?.toLowerCase() === searchLower || a.name?.toLowerCase() === searchLower;
      const bExact = b.code?.toLowerCase() === searchLower || b.name?.toLowerCase() === searchLower;
      
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      
      // Then sort by date (newest first)
      const aDate = a.receivedAt || a.createdAt || a.performedAt || a.uploadedAt || new Date(0);
      const bDate = b.receivedAt || b.createdAt || b.performedAt || b.uploadedAt || new Date(0);
      
      return bDate.getTime() - aDate.getTime();
    });
  }, [searchTerm, searchType, dateRange, statusFilter, priorityFilter, samples, clients, projects, testResults, wikiDocs]);

  const getClient = (clientId: string) => clients.find(c => c.id === clientId);
  const getProject = (projectId: string) => projects.find(p => p.id === projectId);
  const getSample = (sampleId: string) => samples.find(s => s.id === sampleId);

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'sample': return Leaf;
      case 'client': return User;
      case 'project': return FileText;
      case 'result': return Microscope;
      case 'wiki': return FileText;
      default: return FileText;
    }
  };

  const getResultColor = (type: string) => {
    switch (type) {
      case 'sample': return 'bg-green-100 text-green-700';
      case 'client': return 'bg-blue-100 text-blue-700';
      case 'project': return 'bg-purple-100 text-purple-700';
      case 'result': return 'bg-orange-100 text-orange-700';
      case 'wiki': return 'bg-indigo-100 text-indigo-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  // Quick search suggestions
  const quickSearches = [
    {
      title: t('search.recentSamples'),
      description: t('search.recentSamplesDesc'),
      action: () => {
        setSearchType('samples');
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        setDateRange({ start: weekAgo.toISOString().split('T')[0], end: new Date().toISOString().split('T')[0] });
      }
    },
    {
      title: t('search.pendingValidation'),
      description: t('search.pendingValidationDesc'),
      action: () => {
        setSearchType('samples');
        setStatusFilter('validation');
      }
    },
    {
      title: t('search.activeProjects'),
      description: t('search.activeProjectsDesc'),
      action: () => {
        setSearchType('projects');
        setStatusFilter('active');
      }
    },
    {
      title: 'Patógenos Identificados',
      description: 'Ver resultados con patógenos confirmados',
      action: () => {
        setSearchType('results');
        setSearchTerm('pathogen');
      }
    },
    {
      title: 'Muestras Urgentes',
      description: 'Encontrar muestras de alta prioridad',
      action: () => {
        setSearchType('samples');
        setPriorityFilter('urgent');
      }
    },
    {
      title: 'Análisis Moleculares',
      description: 'Buscar análisis PCR y moleculares',
      action: () => {
        setSearchType('results');
        setSearchTerm('molecular');
      }
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('search.title')}</h1>
        <p className="text-gray-600 mt-1">{t('search.subtitle')}</p>
      </div>

      {/* Advanced Search Interface */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder={t('search.placeholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg"
              />
            </div>
            
            <select
              value={searchType}
              onChange={(e) => setSearchType(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="all">{t('search.allTypes')}</option>
              <option value="samples">{t('search.samples')}</option>
              <option value="clients">{t('search.clients')}</option>
              <option value="projects">{t('search.projects')}</option>
              <option value="results">Resultados</option>
              <option value="wiki">Wiki</option>
            </select>
          </div>

          {/* Advanced Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                placeholder="Desde"
              />
              <span className="text-gray-500 text-sm">a</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                placeholder="Hasta"
              />
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
            >
              <option value="all">Todos los Estados</option>
              <option value="received">Recibida</option>
              <option value="processing">Procesando</option>
              <option value="completed">Completada</option>
              <option value="active">Activo</option>
              <option value="validation">Validación</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
            >
              <option value="all">Todas las Prioridades</option>
              <option value="urgent">Urgente</option>
              <option value="high">Alta</option>
              <option value="medium">Media</option>
              <option value="low">Baja</option>
            </select>
            
            <button 
              onClick={() => {
                setSearchTerm('');
                setSearchType('all');
                setDateRange({ start: '', end: '' });
                setStatusFilter('all');
                setPriorityFilter('all');
              }}
              className="flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
            >
              <Filter className="h-4 w-4 mr-2" />
              Limpiar Filtros
            </button>
          </div>
        </div>
      </div>

      {/* Search Results */}
      {(searchTerm.length >= 2 || searchType !== 'all' || dateRange.start || statusFilter !== 'all' || priorityFilter !== 'all') && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              {t('search.results')} ({searchResults.length})
            </h2>
            {searchTerm && (
              <p className="text-sm text-gray-600 mt-1">
                Resultados para: "<span className="font-medium">{searchTerm}</span>"
              </p>
            )}
          </div>
          
          <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
            {searchResults.length > 0 ? (
              searchResults.map((result, index) => {
                const Icon = getResultIcon(result.type);
                return (
                  <div key={`${result.type}-${result.id}-${index}`} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <div className={`p-2 rounded-lg ${getResultColor(result.type)}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-3 mb-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getResultColor(result.type)}`}>
                              {result.type === 'sample' ? 'Muestra' :
                               result.type === 'client' ? 'Cliente' :
                               result.type === 'project' ? 'Proyecto' :
                               result.type === 'result' ? 'Resultado' :
                               'Wiki'}
                            </span>
                            <h3 className="text-lg font-medium text-gray-900 truncate">
                              {result.type === 'sample' ? result.code :
                               result.type === 'client' ? result.name :
                               result.type === 'project' ? result.name :
                               result.type === 'result' ? `${getSample(result.sampleId)?.code} - ${result.analysisType}` :
                               result.title}
                            </h3>
                          </div>
                          
                          {/* Sample Details */}
                          {result.type === 'sample' && (
                            <div className="space-y-2">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                                <div>
                                  <span className="font-medium">Cliente:</span>
                                  <p className="truncate">{getClient(result.clientId)?.name}</p>
                                </div>
                                <div>
                                  <span className="font-medium">Especie:</span>
                                  <p className="italic truncate">{result.plantSpecies}</p>
                                </div>
                                <div>
                                  <span className="font-medium">Estado:</span>
                                  <span className={`ml-1 px-2 py-1 rounded-full text-xs ${
                                    result.status === 'completed' ? 'bg-green-100 text-green-700' :
                                    result.status === 'validation' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-blue-100 text-blue-700'
                                  }`}>
                                    {t(`samples.status.${result.status}`)}
                                  </span>
                                </div>
                              </div>
                              {result.symptoms && (
                                <div>
                                  <span className="font-medium text-gray-700 text-sm">Síntomas:</span>
                                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">{result.symptoms}</p>
                                </div>
                              )}
                              {result.collectionLocation && (
                                <div className="flex items-center text-sm text-gray-600">
                                  <MapPin className="h-4 w-4 mr-1" />
                                  <span>{result.collectionLocation}</span>
                                </div>
                              )}
                            </div>
                          )}
                          
                          {/* Client Details */}
                          {result.type === 'client' && (
                            <div className="space-y-2">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                                <div>
                                  <span className="font-medium">Email:</span>
                                  <p className="truncate">{result.email}</p>
                                </div>
                                <div>
                                  <span className="font-medium">Tipo:</span>
                                  <p>{t(`clients.${result.clientType}`)}</p>
                                </div>
                              </div>
                              {result.region && (
                                <div className="text-sm text-gray-600">
                                  <span className="font-medium">Región:</span>
                                  <span className="ml-1">{result.region}</span>
                                </div>
                              )}
                            </div>
                          )}
                          
                          {/* Project Details */}
                          {result.type === 'project' && (
                            <div className="space-y-2">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                                <div>
                                  <span className="font-medium">Cliente:</span>
                                  <p className="truncate">{getClient(result.clientId)?.name}</p>
                                </div>
                                <div>
                                  <span className="font-medium">Tipo:</span>
                                  <p>{t(`projects.${result.projectType}`)}</p>
                                </div>
                                <div>
                                  <span className="font-medium">Estado:</span>
                                  <span className={`ml-1 px-2 py-1 rounded-full text-xs ${
                                    result.status === 'active' ? 'bg-green-100 text-green-700' :
                                    result.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                                    'bg-gray-100 text-gray-700'
                                  }`}>
                                    {result.status}
                                  </span>
                                </div>
                              </div>
                              {result.description && (
                                <div>
                                  <span className="font-medium text-gray-700 text-sm">Descripción:</span>
                                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">{result.description}</p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Test Result Details */}
                          {result.type === 'result' && (
                            <div className="space-y-2">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                                <div>
                                  <span className="font-medium">Metodología:</span>
                                  <p className="truncate">{result.methodology}</p>
                                </div>
                                <div>
                                  <span className="font-medium">Confianza:</span>
                                  <span className={`ml-1 px-2 py-1 rounded-full text-xs ${
                                    result.confidence === 'high' ? 'bg-green-100 text-green-700' :
                                    result.confidence === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-red-100 text-red-700'
                                  }`}>
                                    {t(`results.confidenceLevels.${result.confidence}`)}
                                  </span>
                                </div>
                                <div>
                                  <span className="font-medium">Estado:</span>
                                  <span className={`ml-1 px-2 py-1 rounded-full text-xs ${
                                    result.status === 'validated' ? 'bg-green-100 text-green-700' :
                                    'bg-yellow-100 text-yellow-700'
                                  }`}>
                                    {result.status === 'validated' ? 'Validado' : 'Pendiente'}
                                  </span>
                                </div>
                              </div>
                              {result.pathogenIdentified && (
                                <div>
                                  <span className="font-medium text-gray-700 text-sm">Patógeno:</span>
                                  <p className="text-sm text-gray-600 mt-1 italic font-medium">{result.pathogenIdentified}</p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Wiki Details */}
                          {result.type === 'wiki' && (
                            <div className="space-y-2">
                              <div className="text-sm text-gray-600">
                                <span className="font-medium">Categoría:</span>
                                <span className="ml-1">{result.category.replace('_', ' ')}</span>
                              </div>
                              <p className="text-sm text-gray-600 line-clamp-2">{result.content.substring(0, 150)}...</p>
                              {result.tags && result.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {result.tags.slice(0, 3).map(tag => (
                                    <span key={tag} className="px-2 py-1 bg-gray-100 text-xs text-gray-600 rounded">
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Date information */}
                          <div className="flex items-center text-xs text-gray-500 mt-2">
                            <Clock className="h-3 w-3 mr-1" />
                            <span>
                              {result.type === 'sample' ? `Recibida: ${result.receivedAt.toLocaleDateString()}` :
                               result.type === 'client' ? `Creado: ${result.createdAt.toLocaleDateString()}` :
                               result.type === 'project' ? `Creado: ${result.createdAt.toLocaleDateString()}` :
                               result.type === 'result' ? `Realizado: ${result.performedAt.toLocaleDateString()}` :
                               `Subido: ${result.uploadedAt.toLocaleDateString()}`}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <button className="text-sm text-green-600 hover:text-green-700 font-medium ml-4 whitespace-nowrap">
                        Ver Detalles →
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-12 text-center">
                <SearchIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">{t('search.noResults')}</h3>
                <p className="text-gray-600">{t('search.adjustSearch')}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Search Suggestions */}
      {searchTerm.length < 2 && searchType === 'all' && !dateRange.start && statusFilter === 'all' && priorityFilter === 'all' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('search.quickSuggestions')}</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quickSearches.map((suggestion, index) => (
              <button
                key={index}
                onClick={suggestion.action}
                className="text-left p-4 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors"
              >
                <h4 className="font-medium text-gray-900 mb-1">{suggestion.title}</h4>
                <p className="text-sm text-gray-600">{suggestion.description}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};