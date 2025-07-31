import React, { useState, useRef, useEffect } from 'react';
import { Bell, Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useData } from '../../hooks/useData';
import { LanguageSelector } from './LanguageSelector';

export const Header: React.FC = () => {
  const { t } = useTranslation();
  const { samples, clients, projects } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Quick search functionality
  const quickSearchResults = React.useMemo(() => {
    if (searchTerm.length < 2) return [];

    const searchLower = searchTerm.toLowerCase();
    let results: any[] = [];

    // Search samples
    const sampleResults = samples
      .filter(sample => 
        sample.code.toLowerCase().includes(searchLower) ||
        sample.plantSpecies.toLowerCase().includes(searchLower)
      )
      .slice(0, 3)
      .map(s => ({ ...s, type: 'sample' }));

    // Search clients
    const clientResults = clients
      .filter(client => 
        client.name.toLowerCase().includes(searchLower) ||
        client.email.toLowerCase().includes(searchLower)
      )
      .slice(0, 2)
      .map(c => ({ ...c, type: 'client' }));

    // Search projects
    const projectResults = projects
      .filter(project => 
        project.name.toLowerCase().includes(searchLower)
      )
      .slice(0, 2)
      .map(p => ({ ...p, type: 'project' }));

    results = [...sampleResults, ...clientResults, ...projectResults];
    return results.slice(0, 5); // Limit to 5 total results
  }, [searchTerm, samples, clients, projects]);

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getClient = (clientId: string) => clients.find(c => c.id === clientId);

  const clearSearch = () => {
    setSearchTerm('');
    setShowResults(false);
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex-1 max-w-lg relative" ref={searchRef}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder={t('search.placeholder')}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setShowResults(e.target.value.length >= 2);
              }}
              onFocus={() => searchTerm.length >= 2 && setShowResults(true)}
              className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            {searchTerm && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Quick Search Results Dropdown */}
          {showResults && quickSearchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
              <div className="p-2">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide px-3 py-2">
                  Resultados Rápidos
                </div>
                {quickSearchResults.map((result, index) => (
                  <button
                    key={`${result.type}-${result.id}-${index}`}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded-lg transition-colors"
                    onClick={() => {
                      // Navigate to appropriate page based on type
                      console.log('Navigate to:', result.type, result.id);
                      setShowResults(false);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            result.type === 'sample' ? 'bg-green-100 text-green-700' :
                            result.type === 'client' ? 'bg-blue-100 text-blue-700' :
                            'bg-purple-100 text-purple-700'
                          }`}>
                            {result.type === 'sample' ? 'Muestra' :
                             result.type === 'client' ? 'Cliente' : 'Proyecto'}
                          </span>
                          <span className="font-medium text-gray-900 truncate">
                            {result.type === 'sample' ? result.code :
                             result.type === 'client' ? result.name :
                             result.name}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 truncate mt-1">
                          {result.type === 'sample' ? (
                            <>
                              {result.plantSpecies} • {getClient(result.clientId)?.name}
                            </>
                          ) : result.type === 'client' ? (
                            result.email
                          ) : (
                            getClient(result.clientId)?.name
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
                
                {/* View All Results Link */}
                <div className="border-t border-gray-200 mt-2 pt-2">
                  <button
                    onClick={() => {
                      // Navigate to search page with current term
                      console.log('Navigate to search page with term:', searchTerm);
                      setShowResults(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-green-600 hover:text-green-700 font-medium"
                  >
                    Ver todos los resultados para "{searchTerm}" →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* No Results Message */}
          {showResults && searchTerm.length >= 2 && quickSearchResults.length === 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
              <div className="p-4 text-center">
                <div className="text-gray-400 mb-2">
                  <Search className="h-8 w-8 mx-auto" />
                </div>
                <p className="text-sm text-gray-600">
                  No se encontraron resultados para "{searchTerm}"
                </p>
                <button
                  onClick={() => {
                    console.log('Navigate to advanced search');
                    setShowResults(false);
                  }}
                  className="text-sm text-green-600 hover:text-green-700 font-medium mt-2"
                >
                  Probar búsqueda avanzada →
                </button>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          <LanguageSelector />
          
          <button className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
          </button>
          
          <div className="text-right">
            <p className="text-sm text-gray-600">
              {new Date().toLocaleDateString('es-ES', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
};