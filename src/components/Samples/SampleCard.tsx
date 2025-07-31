import React from 'react';
import { Sample, Client, Project } from '../../types';
import { Calendar, User, AlertCircle, CheckCircle, Microscope, Leaf, MapPin, Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface SampleCardProps {
  sample: Sample;
  client: Client;
  project: Project;
  onStatusChange: (sampleId: string, status: Sample['status']) => void;
}

const statusStyles = {
  'received': 'bg-gray-50 text-gray-700 border-gray-200',
  'processing': 'bg-blue-50 text-blue-700 border-blue-200',
  'microscopy': 'bg-purple-50 text-purple-700 border-purple-200',
  'isolation': 'bg-yellow-50 text-yellow-700 border-yellow-200',
  'identification': 'bg-orange-50 text-orange-700 border-orange-200',
  'molecular_analysis': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  'validation': 'bg-red-50 text-red-700 border-red-200',
  'completed': 'bg-green-50 text-green-700 border-green-200'
};

const priorityStyles = {
  'low': 'bg-gray-100 text-gray-600',
  'medium': 'bg-yellow-100 text-yellow-700',
  'high': 'bg-red-100 text-red-700',
  'urgent': 'bg-red-200 text-red-800 font-semibold'
};

const tissueTypeIcons = {
  'leaf': Leaf,
  'stem': Leaf,
  'root': Leaf,
  'fruit': Leaf,
  'seed': Leaf,
  'soil': Leaf,
  'whole_plant': Leaf,
  'other': Leaf
};

export const SampleCard: React.FC<SampleCardProps> = ({ sample, client, project, onStatusChange }) => {
  const { t } = useTranslation();
  
  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onStatusChange(sample.id, e.target.value as Sample['status']);
  };

  const TissueIcon = tissueTypeIcons[sample.tissueType] || Leaf;

  const getFinalResultColor = (result?: 'positive' | 'negative') => {
    if (!result) return '';
    return result === 'positive' 
      ? 'bg-red-100 text-red-700 border-red-200' 
      : 'bg-green-100 text-green-700 border-green-200';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{sample.code}</h3>
          <p className="text-sm text-gray-600 italic">{sample.plantSpecies}</p>
          {sample.plantVariety && (
            <p className="text-xs text-gray-500">var. {sample.plantVariety}</p>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityStyles[sample.priority]}`}>
            {t(`samples.priority.${sample.priority}`)}
          </span>
          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusStyles[sample.status]}`}>
            {t(`samples.status.${sample.status}`)}
          </span>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center text-sm text-gray-600">
          <User className="h-4 w-4 mr-2" />
          <span>{client.name} • {project.name}</span>
        </div>
        <div className="flex items-center text-sm text-gray-600">
          <TissueIcon className="h-4 w-4 mr-2" />
          <span>{t(`samples.tissueTypes.${sample.tissueType}`)} tissue</span>
        </div>
        <div className="flex items-center text-sm text-gray-600">
          <Calendar className="h-4 w-4 mr-2" />
          <span>Collected {sample.collectionDate.toLocaleDateString()}</span>
        </div>
        {sample.collectionLocation && (
          <div className="flex items-center text-sm text-gray-600">
            <MapPin className="h-4 w-4 mr-2" />
            <span>{sample.collectionLocation}</span>
          </div>
        )}
      </div>

      {sample.symptoms && (
        <div className="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
          <p className="text-xs font-medium text-yellow-800 mb-1">SYMPTOMS</p>
          <p className="text-sm text-yellow-700">{sample.symptoms}</p>
        </div>
      )}

      {sample.suspectedPathogen && (
        <div className="mb-4 p-3 bg-red-50 rounded-lg border border-red-200">
          <p className="text-xs font-medium text-red-800 mb-1">SUSPECTED PATHOGEN</p>
          <p className="text-sm text-red-700 italic">{sample.suspectedPathogen}</p>
        </div>
      )}

      {/* Final Result Display */}
      {sample.finalResult && (
        <div className={`mb-4 p-3 rounded-lg border-2 ${getFinalResultColor(sample.finalResult)}`}>
          <p className="text-xs font-medium mb-1">FINAL RESULT</p>
          <p className="text-sm font-bold uppercase">
            {sample.finalResult === 'positive' ? 'POSITIVE' : 'NEGATIVE'}
          </p>
          <p className="text-xs mt-1">
            {sample.finalResult === 'positive' 
              ? 'Pathogen detected in sample' 
              : 'No pathogen detected'}
          </p>
        </div>
      )}

      <div className="mb-4">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Analysis Types</p>
        <div className="flex flex-wrap gap-1">
          {sample.analysisTypes.map((type) => (
            <span key={type} className="px-2 py-1 bg-green-100 text-xs text-green-700 rounded">
              {type}
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <div className="flex items-center space-x-2">
          <select
            value={sample.status}
            onChange={handleStatusChange}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1 focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="received">{t('samples.status.received')}</option>
            <option value="processing">{t('samples.status.processing')}</option>
            <option value="microscopy">{t('samples.status.microscopy')}</option>
            <option value="isolation">{t('samples.status.isolation')}</option>
            <option value="identification">{t('samples.status.identification')}</option>
            <option value="molecular_analysis">{t('samples.status.molecular_analysis')}</option>
            <option value="validation">{t('samples.status.validation')}</option>
            <option 
              value="completed" 
              disabled={!sample.canComplete}
            >
              {t('samples.status.completed')}
            </option>
          </select>
          
          {!sample.canComplete && sample.status !== 'completed' && (
            <div className="flex items-center text-xs text-amber-600" title="Results must be validated as positive or negative before completion">
              <Lock className="h-3 w-3 mr-1" />
              <span>Pending Results</span>
            </div>
          )}
        </div>
        
        <button className="text-sm text-green-600 hover:text-green-700 font-medium">
          View Details →
        </button>
      </div>

      {/* Completion Status Info */}
      {sample.status === 'validation' && !sample.canComplete && (
        <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
          <p className="text-xs text-amber-800">
            <AlertCircle className="h-3 w-3 inline mr-1" />
            All analysis results must be validated and marked as positive or negative before this sample can be completed.
          </p>
        </div>
      )}

      {sample.canComplete && sample.status !== 'completed' && (
        <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
          <p className="text-xs text-green-800">
            <CheckCircle className="h-3 w-3 inline mr-1" />
            Sample ready for completion. All results have been validated.
          </p>
        </div>
      )}
    </div>
  );
};