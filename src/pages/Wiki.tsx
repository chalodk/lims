import React, { useState, useMemo } from 'react';
import { BookOpen, Plus, Search, Tag, Calendar, User, Bug, Leaf, Microscope, Filter, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useData } from '../hooks/useData';

export const Wiki: React.FC = () => {
  const { t } = useTranslation();
  const { wikiDocs } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedPathogenType, setSelectedPathogenType] = useState('all');
  const [selectedHostPlant, setSelectedHostPlant] = useState('all');

  // Get all unique host plants for filter
  const allHostPlants = useMemo(() => {
    const plants = new Set<string>();
    wikiDocs.forEach(doc => {
      doc.hostPlants?.forEach(plant => plants.add(plant));
    });
    return Array.from(plants).sort();
  }, [wikiDocs]);

  // Advanced filtering
  const filteredDocs = useMemo(() => {
    return wikiDocs.filter(doc => {
      const matchesSearch = searchTerm.length < 2 || (
        doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (doc.hostPlants && doc.hostPlants.some(plant => plant.toLowerCase().includes(searchTerm.toLowerCase())))
      );

      const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;
      const matchesPathogenType = selectedPathogenType === 'all' || doc.pathogenType === selectedPathogenType;
      const matchesHostPlant = selectedHostPlant === 'all' || (doc.hostPlants && doc.hostPlants.includes(selectedHostPlant));

      return matchesSearch && matchesCategory && matchesPathogenType && matchesHostPlant;
    });
  }, [wikiDocs, searchTerm, selectedCategory, selectedPathogenType, selectedHostPlant]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'pathogen_guide': return Bug;
      case 'methodology': return Microscope;
      case 'identification_key': return BookOpen;
      case 'disease_management': return Leaf;
      default: return BookOpen;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'pathogen_guide': return 'bg-red-100 text-red-700';
      case 'methodology': return 'bg-purple-100 text-purple-700';
      case 'identification_key': return 'bg-blue-100 text-blue-700';
      case 'disease_management': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getPathogenTypeColor = (type?: string) => {
    switch (type) {
      case 'fungus': return 'bg-green-100 text-green-700';
      case 'bacteria': return 'bg-blue-100 text-blue-700';
      case 'virus': return 'bg-red-100 text-red-700';
      case 'nematode': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setSelectedCategory('all');
    setSelectedPathogenType('all');
    setSelectedHostPlant('all');
  };

  const hasActiveFilters = searchTerm || selectedCategory !== 'all' || selectedPathogenType !== 'all' || selectedHostPlant !== 'all';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('wiki.title')}</h1>
          <p className="text-gray-600 mt-1">{t('wiki.subtitle')}</p>
        </div>
        <button className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
          <Plus className="h-4 w-4 mr-2" />
          {t('wiki.addDocument')}
        </button>
      </div>

      {/* Advanced Search and Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder={t('wiki.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          
          {/* Filter Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="all">{t('wiki.allCategories')}</option>
              <option value="pathogen_guide">Guías de Patógenos</option>
              <option value="methodology">Metodologías</option>
              <option value="identification_key">Claves de Identificación</option>
              <option value="disease_management">Manejo de Enfermedades</option>
              <option value="administrative">Administrativo</option>
            </select>
            
            <select
              value={selectedPathogenType}
              onChange={(e) => setSelectedPathogenType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="all">{t('wiki.allPathogenTypes')}</option>
              <option value="fungus">Hongos</option>
              <option value="bacteria">Bacterias</option>
              <option value="virus">Virus</option>
              <option value="nematode">Nematodos</option>
            </select>

            <select
              value={selectedHostPlant}
              onChange={(e) => setSelectedHostPlant(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="all">Todas las Plantas Hospederas</option>
              {allHostPlants.map(plant => (
                <option key={plant} value={plant}>{plant}</option>
              ))}
            </select>

            <button
              onClick={clearAllFilters}
              disabled={!hasActiveFilters}
              className="flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Filter className="h-4 w-4 mr-2" />
              Limpiar Filtros
            </button>
          </div>

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200">
              <span className="text-sm text-gray-600">Filtros activos:</span>
              {searchTerm && (
                <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                  Búsqueda: "{searchTerm}"
                  <button onClick={() => setSearchTerm('')} className="ml-1 hover:text-green-900">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {selectedCategory !== 'all' && (
                <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                  Categoría: {selectedCategory.replace('_', ' ')}
                  <button onClick={() => setSelectedCategory('all')} className="ml-1 hover:text-blue-900">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {selectedPathogenType !== 'all' && (
                <span className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">
                  Tipo: {selectedPathogenType}
                  <button onClick={() => setSelectedPathogenType('all')} className="ml-1 hover:text-purple-900">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {selectedHostPlant !== 'all' && (
                <span className="inline-flex items-center px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs">
                  Planta: {selectedHostPlant}
                  <button onClick={() => setSelectedHostPlant('all')} className="ml-1 hover:text-yellow-900">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Category Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">{t('wiki.pathogenGuides')}</h3>
            <div className="p-2 bg-red-50 rounded-lg">
              <Bug className="h-5 w-5 text-red-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{wikiDocs.filter(d => d.category === 'pathogen_guide').length}</p>
          <p className="text-sm text-gray-600 mt-1">{t('wiki.fungalDescription')}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">{t('wiki.methodologies')}</h3>
            <div className="p-2 bg-purple-50 rounded-lg">
              <Microscope className="h-5 w-5 text-purple-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{wikiDocs.filter(d => d.category === 'methodology').length}</p>
          <p className="text-sm text-gray-600 mt-1">{t('wiki.microscopyDescription')}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">{t('wiki.idKeys')}</h3>
            <div className="p-2 bg-blue-50 rounded-lg">
              <BookOpen className="h-5 w-5 text-blue-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{wikiDocs.filter(d => d.category === 'identification_key').length}</p>
          <p className="text-sm text-gray-600 mt-1">{t('wiki.diagnosticDescription')}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">{t('wiki.management')}</h3>
            <div className="p-2 bg-green-50 rounded-lg">
              <Leaf className="h-5 w-5 text-green-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{wikiDocs.filter(d => d.category === 'disease_management').length}</p>
          <p className="text-sm text-gray-600 mt-1">{t('wiki.diseaseDescription')}</p>
        </div>
      </div>

      {/* Documents */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {t('wiki.documents')} ({filteredDocs.length})
          </h2>
          {hasActiveFilters && (
            <p className="text-sm text-gray-600 mt-1">
              Mostrando {filteredDocs.length} de {wikiDocs.length} documentos
            </p>
          )}
        </div>
        
        <div className="divide-y divide-gray-200">
          {filteredDocs.length > 0 ? (
            filteredDocs.map(doc => {
              const CategoryIcon = getCategoryIcon(doc.category);
              return (
                <div key={doc.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <CategoryIcon className="h-5 w-5 text-gray-400" />
                        <h3 className="text-lg font-medium text-gray-900">{doc.title}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(doc.category)}`}>
                          {t(`wiki.categories.${doc.category}`)}
                        </span>
                        {doc.pathogenType && (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPathogenTypeColor(doc.pathogenType)}`}>
                            {t(`results.pathogenTypes.${doc.pathogenType}`)}
                          </span>
                        )}
                      </div>
                      
                      <p className="text-gray-600 mb-3 line-clamp-2">
                        {doc.content.substring(0, 200)}...
                      </p>
                      
                      {doc.hostPlants && doc.hostPlants.length > 0 && (
                        <div className="mb-3">
                          <span className="text-sm font-medium text-gray-700">{t('wiki.hostPlants')}: </span>
                          <div className="inline-flex flex-wrap gap-1 mt-1">
                            {doc.hostPlants.slice(0, 5).map(plant => (
                              <span key={plant} className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                                {plant}
                              </span>
                            ))}
                            {doc.hostPlants.length > 5 && (
                              <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                                +{doc.hostPlants.length - 5} más
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
                        <div className="flex items-center">
                          <User className="h-4 w-4 mr-1" />
                          <span>Dr. Sarah Johnson</span>
                        </div>
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          <span>{doc.uploadedAt.toLocaleDateString('es-ES')}</span>
                        </div>
                      </div>
                      
                      {doc.tags.length > 0 && (
                        <div className="flex items-center">
                          <Tag className="h-4 w-4 text-gray-400 mr-2" />
                          <div className="flex flex-wrap gap-1">
                            {doc.tags.map(tag => (
                              <button
                                key={tag}
                                onClick={() => setSearchTerm(tag)}
                                className="px-2 py-1 bg-gray-100 text-xs text-gray-600 rounded hover:bg-gray-200 transition-colors"
                              >
                                {tag}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <button className="text-sm text-green-600 hover:text-green-700 font-medium ml-6">
                      {t('wiki.viewDocument')} →
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-12 text-center">
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron documentos</h3>
              <p className="text-gray-600">
                {hasActiveFilters
                  ? "Intenta ajustar tus filtros de búsqueda"
                  : "Comienza construyendo tu base de conocimiento agregando tu primer documento"}
              </p>
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="mt-4 text-sm text-green-600 hover:text-green-700 font-medium"
                >
                  Limpiar todos los filtros
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Quick Access Resources */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('wiki.quickAccess')}</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button 
            onClick={() => {
              setSelectedCategory('pathogen_guide');
              setSelectedPathogenType('fungus');
            }}
            className="text-left p-4 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors"
          >
            <Bug className="h-6 w-6 text-red-600 mb-2" />
            <h4 className="font-medium text-gray-900 mb-1">{t('wiki.fungalPathogens')}</h4>
            <p className="text-sm text-gray-600">{t('wiki.fungalDescription')}</p>
          </button>
          
          <button 
            onClick={() => setSelectedCategory('methodology')}
            className="text-left p-4 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors"
          >
            <Microscope className="h-6 w-6 text-purple-600 mb-2" />
            <h4 className="font-medium text-gray-900 mb-1">{t('wiki.microscopyProtocols')}</h4>
            <p className="text-sm text-gray-600">{t('wiki.microscopyDescription')}</p>
          </button>
          
          <button 
            onClick={() => setSelectedCategory('disease_management')}
            className="text-left p-4 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors"
          >
            <Leaf className="h-6 w-6 text-green-600 mb-2" />
            <h4 className="font-medium text-gray-900 mb-1">{t('wiki.diseaseManagement')}</h4>
            <p className="text-sm text-gray-600">{t('wiki.diseaseDescription')}</p>
          </button>
          
          <button 
            onClick={() => setSelectedCategory('identification_key')}
            className="text-left p-4 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors"
          >
            <BookOpen className="h-6 w-6 text-blue-600 mb-2" />
            <h4 className="font-medium text-gray-900 mb-1">{t('wiki.diagnosticKeys')}</h4>
            <p className="text-sm text-gray-600">{t('wiki.diagnosticDescription')}</p>
          </button>
        </div>
      </div>
    </div>
  );
};