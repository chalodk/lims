import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

export const LanguageSelector: React.FC = () => {
  const { i18n } = useTranslation();

  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Español', flag: '🇪🇸' }
  ];

  const changeLanguage = (languageCode: string) => {
    i18n.changeLanguage(languageCode);
  };

  return (
    <div className="relative group">
      <button className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors">
        <Globe className="h-4 w-4" />
        <span className="hidden md:inline">
          {languages.find(lang => lang.code === i18n.language)?.flag || '🌐'}
        </span>
      </button>
      
      <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
        {languages.map((language) => (
          <button
            key={language.code}
            onClick={() => changeLanguage(language.code)}
            className={`w-full flex items-center space-x-3 px-4 py-2 text-sm text-left hover:bg-gray-50 transition-colors first:rounded-t-lg last:rounded-b-lg ${
              i18n.language === language.code ? 'bg-green-50 text-green-700' : 'text-gray-700'
            }`}
          >
            <span className="text-lg">{language.flag}</span>
            <span>{language.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};