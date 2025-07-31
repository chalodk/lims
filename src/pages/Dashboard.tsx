import React from 'react';
import { useTranslation } from 'react-i18next';
import { StatsCard } from '../components/Dashboard/StatsCard';
import { RecentActivity } from '../components/Dashboard/RecentActivity';
import { Microscope, Users, FileText, TrendingUp, Clock, AlertTriangle, Leaf, Bug } from 'lucide-react';
import { useData } from '../hooks/useData';

export const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const { samples, clients, reports, activities, testResults } = useData();

  const stats = {
    totalSamples: samples.length,
    activeSamples: samples.filter(s => !['completed'].includes(s.status)).length,
    pendingValidation: samples.filter(s => s.status === 'validation').length,
    completedToday: samples.filter(s => 
      s.status === 'completed' && 
      s.receivedAt.toDateString() === new Date().toDateString()
    ).length,
    totalClients: clients.length,
    reportsGenerated: reports.length,
    pathogensIdentified: testResults.filter(r => r.pathogenIdentified).length,
    urgentSamples: samples.filter(s => s.priority === 'urgent' && s.status !== 'completed').length
  };

  const pathogenTypes = testResults
    .filter(r => r.pathogenIdentified && r.pathogenType)
    .reduce((acc, result) => {
      acc[result.pathogenType!] = (acc[result.pathogenType!] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('dashboard.title')}</h1>
        <p className="text-gray-600 mt-1">{t('dashboard.subtitle')}</p>
      </div>

      {/* Primary Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title={t('dashboard.stats.totalSamples')}
          value={stats.totalSamples}
          icon={Leaf}
          color="green"
          change={{ value: "+3 this week", trend: "up" }}
        />
        <StatsCard
          title={t('dashboard.stats.activeSamples')}
          value={stats.activeSamples}
          icon={Clock}
          color="yellow"
        />
        <StatsCard
          title={t('dashboard.stats.pendingValidation')}
          value={stats.pendingValidation}
          icon={AlertTriangle}
          color="red"
        />
        <StatsCard
          title={t('dashboard.stats.pathogensIdentified')}
          value={stats.pathogensIdentified}
          icon={Bug}
          color="purple"
          change={{ value: "+2 today", trend: "up" }}
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatsCard
          title={t('dashboard.stats.activeClients')}
          value={stats.totalClients}
          icon={Users}
          color="blue"
        />
        <StatsCard
          title={t('dashboard.stats.reportsGenerated')}
          value={stats.reportsGenerated}
          icon={FileText}
          color="green"
        />
        <StatsCard
          title={t('dashboard.stats.urgentSamples')}
          value={stats.urgentSamples}
          icon={AlertTriangle}
          color="red"
        />
      </div>

      {/* Recent Activity & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentActivity activities={activities} />
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('dashboard.quickActions')}</h3>
          <div className="space-y-3">
            <button className="w-full flex items-center px-4 py-3 text-left text-sm font-medium text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <Leaf className="h-5 w-5 mr-3 text-green-600" />
              {t('dashboard.actions.registerSample')}
            </button>
            <button className="w-full flex items-center px-4 py-3 text-left text-sm font-medium text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <Microscope className="h-5 w-5 mr-3 text-purple-600" />
              {t('dashboard.actions.startMicroscopy')}
            </button>
            <button className="w-full flex items-center px-4 py-3 text-left text-sm font-medium text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <FileText className="h-5 w-5 mr-3 text-blue-600" />
              {t('dashboard.actions.generateReport')}
            </button>
            <button className="w-full flex items-center px-4 py-3 text-left text-sm font-medium text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <Users className="h-5 w-5 mr-3 text-indigo-600" />
              {t('dashboard.actions.addClient')}
            </button>
          </div>
        </div>
      </div>

      {/* Sample Status Overview */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('dashboard.samplePipeline')}</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          {['received', 'processing', 'microscopy', 'isolation', 'identification', 'molecular_analysis', 'validation', 'completed'].map(status => {
            const count = samples.filter(s => s.status === status).length;
            return (
              <div key={status} className="text-center">
                <div className="text-2xl font-bold text-gray-900">{count}</div>
                <div className="text-xs text-gray-600 capitalize">{t(`samples.status.${status}`)}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pathogen Distribution */}
      {Object.keys(pathogenTypes).length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('dashboard.pathogenTypes')}</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Object.entries(pathogenTypes).map(([type, count]) => (
              <div key={type} className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">{count}</div>
                <div className="text-sm text-gray-600 capitalize">{t(`results.pathogenTypes.${type}`)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Pathogen Identifications */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('dashboard.recentIdentifications')}</h3>
        <div className="space-y-3">
          {testResults
            .filter(r => r.pathogenIdentified)
            .slice(0, 5)
            .map(result => {
              const sample = samples.find(s => s.id === result.sampleId);
              return (
                <div key={result.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{result.pathogenIdentified}</p>
                    <p className="text-sm text-gray-600">
                      {sample?.code} • {sample?.plantSpecies} • {t(`results.confidenceLevels.${result.confidence}`)} {t('results.confidence').toLowerCase()}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    result.pathogenType === 'fungus' ? 'bg-green-100 text-green-700' :
                    result.pathogenType === 'bacteria' ? 'bg-blue-100 text-blue-700' :
                    result.pathogenType === 'virus' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {t(`results.pathogenTypes.${result.pathogenType}`)}
                  </span>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
};