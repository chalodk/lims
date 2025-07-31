import React, { useState } from 'react';
import { X, Upload, Calendar } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Sample, Client, Project } from '../../types';

interface SampleFormProps {
  clients: Client[];
  projects: Project[];
  onSubmit: (sample: Omit<Sample, 'id'>) => void;
  onClose: () => void;
}

export const SampleForm: React.FC<SampleFormProps> = ({ clients, projects, onSubmit, onClose }) => {
  const { t } = useTranslation();
  
  const [formData, setFormData] = useState({
    code: '',
    clientId: '',
    projectId: '',
    plantSpecies: '',
    plantVariety: '',
    tissueType: 'leaf' as Sample['tissueType'],
    symptoms: '',
    collectionDate: new Date().toISOString().split('T')[0],
    collectionLocation: '',
    environmentalConditions: '',
    description: '',
    priority: 'medium' as Sample['priority'],
    analysisTypes: [] as string[],
    suspectedPathogen: ''
  });

  const availableAnalysisTypes = [
    'Visual Inspection',
    'Microscopy',
    'Cultural Isolation',
    'Biochemical Tests',
    'Molecular PCR',
    'Sequencing',
    'Pathogenicity Test',
    'Serology',
    'ELISA',
    'Immunofluorescence'
  ];

  const commonPlantSpecies = [
    'Solanum lycopersicum (Tomato)',
    'Solanum tuberosum (Potato)',
    'Zea mays (Corn)',
    'Triticum aestivum (Wheat)',
    'Glycine max (Soybean)',
    'Oryza sativa (Rice)',
    'Capsicum annuum (Pepper)',
    'Cucumis sativus (Cucumber)',
    'Phaseolus vulgaris (Bean)',
    'Brassica oleracea (Cabbage)',
    'Other'
  ];

  const commonPathogens = [
    // Fungi
    'Phytophthora infestans',
    'Fusarium oxysporum',
    'Botrytis cinerea',
    'Alternaria solani',
    'Cercospora zeae-maydis',
    'Puccinia triticina',
    'Rhizoctonia solani',
    'Sclerotinia sclerotiorum',
    'Verticillium dahliae',
    'Pythium ultimum',
    
    // Bacteria
    'Xanthomonas campestris',
    'Pseudomonas syringae',
    'Erwinia carotovora',
    'Ralstonia solanacearum',
    'Agrobacterium tumefaciens',
    
    // Viruses
    'Tobacco Mosaic Virus',
    'Cucumber Mosaic Virus',
    'Tomato Yellow Leaf Curl Virus',
    'Potato Virus Y',
    'Bean Common Mosaic Virus',
    
    // Nematodes
    'Meloidogyne incognita (Root-knot nematode)',
    'Meloidogyne javanica (Root-knot nematode)',
    'Meloidogyne arenaria (Root-knot nematode)',
    'Heterodera glycines (Soybean cyst nematode)',
    'Globodera pallida (Potato cyst nematode)',
    'Globodera rostochiensis (Golden potato cyst nematode)',
    'Pratylenchus penetrans (Root lesion nematode)',
    'Pratylenchus vulnus (Root lesion nematode)',
    'Radopholus similis (Burrowing nematode)',
    'Rotylenchulus reniformis (Reniform nematode)',
    'Tylenchulus semipenetrans (Citrus nematode)',
    'Ditylenchus dipsaci (Stem and bulb nematode)',
    'Aphelenchoides besseyi (Rice white tip nematode)',
    'Nacobbus aberrans (False root-knot nematode)',
    'Paratrichodorus minor (Stubby root nematode)',
    
    'Unknown'
  ];

  const filteredProjects = projects.filter(p => p.clientId === formData.clientId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      collectionDate: new Date(formData.collectionDate),
      status: 'received',
      receivedAt: new Date(),
      assignedTo: '2', // Default pathologist
      images: []
    });
    onClose();
  };

  const handleAnalysisTypeChange = (analysisType: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      analysisTypes: checked 
        ? [...prev.analysisTypes, analysisType]
        : prev.analysisTypes.filter(t => t !== analysisType)
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">{t('samples.form.title')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-medium text-gray-900 mb-4">{t('samples.form.basicInfo')}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('samples.form.sampleCode')} *
                </label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder={t('samples.form.placeholders.sampleCode')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('common.priority')}
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as Sample['priority'] }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="low">{t('samples.priority.low')}</option>
                  <option value="medium">{t('samples.priority.medium')}</option>
                  <option value="high">{t('samples.priority.high')}</option>
                  <option value="urgent">{t('samples.priority.urgent')}</option>
                </select>
              </div>
            </div>
          </div>

          {/* Client and Project */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-medium text-gray-900 mb-4">{t('samples.form.clientProject')}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('samples.form.client')} *
                </label>
                <select
                  required
                  value={formData.clientId}
                  onChange={(e) => setFormData(prev => ({ ...prev, clientId: e.target.value, projectId: '' }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="">{t('common.select')} {t('samples.form.client').toLowerCase()}</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>
                      {client.name} ({t(`clients.${client.clientType}`)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('samples.form.project')} *
                </label>
                <select
                  required
                  value={formData.projectId}
                  onChange={(e) => setFormData(prev => ({ ...prev, projectId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  disabled={!formData.clientId}
                >
                  <option value="">{t('common.select')} {t('samples.form.project').toLowerCase()}</option>
                  {filteredProjects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.name} ({t(`projects.${project.projectType}`)})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Plant Information */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-medium text-gray-900 mb-4">{t('samples.form.plantInfo')}</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('samples.form.plantSpecies')} *
                </label>
                <select
                  required
                  value={formData.plantSpecies}
                  onChange={(e) => setFormData(prev => ({ ...prev, plantSpecies: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="">{t('common.select')} {t('samples.form.plantSpecies').toLowerCase()}</option>
                  {commonPlantSpecies.map(species => (
                    <option key={species} value={species}>{species}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('samples.form.plantVariety')}
                </label>
                <input
                  type="text"
                  value={formData.plantVariety}
                  onChange={(e) => setFormData(prev => ({ ...prev, plantVariety: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder={t('samples.form.placeholders.plantVariety')}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('samples.form.tissueType')} *
              </label>
              <select
                required
                value={formData.tissueType}
                onChange={(e) => setFormData(prev => ({ ...prev, tissueType: e.target.value as Sample['tissueType'] }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="leaf">{t('samples.tissueTypes.leaf')}</option>
                <option value="stem">{t('samples.tissueTypes.stem')}</option>
                <option value="root">{t('samples.tissueTypes.root')}</option>
                <option value="fruit">{t('samples.tissueTypes.fruit')}</option>
                <option value="seed">{t('samples.tissueTypes.seed')}</option>
                <option value="soil">{t('samples.tissueTypes.soil')}</option>
                <option value="whole_plant">{t('samples.tissueTypes.whole_plant')}</option>
                <option value="other">{t('samples.tissueTypes.other')}</option>
              </select>
            </div>
          </div>

          {/* Collection Information */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-medium text-gray-900 mb-4">{t('samples.form.collectionInfo')}</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('samples.form.collectionDate')} *
                </label>
                <input
                  type="date"
                  required
                  value={formData.collectionDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, collectionDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('samples.form.collectionLocation')}
                </label>
                <input
                  type="text"
                  value={formData.collectionLocation}
                  onChange={(e) => setFormData(prev => ({ ...prev, collectionLocation: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder={t('samples.form.placeholders.collectionLocation')}
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('samples.form.environmentalConditions')}
              </label>
              <input
                type="text"
                value={formData.environmentalConditions}
                onChange={(e) => setFormData(prev => ({ ...prev, environmentalConditions: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder={t('samples.form.placeholders.environmentalConditions')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('samples.form.symptomsObserved')}
              </label>
              <textarea
                value={formData.symptoms}
                onChange={(e) => setFormData(prev => ({ ...prev, symptoms: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder={t('samples.form.placeholders.symptoms')}
              />
            </div>
          </div>

          {/* Analysis Information */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-medium text-gray-900 mb-4">{t('samples.form.analysisRequirements')}</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('samples.form.suspectedPathogen')}
              </label>
              <select
                value={formData.suspectedPathogen}
                onChange={(e) => setFormData(prev => ({ ...prev, suspectedPathogen: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">{t('common.select')} {t('samples.form.suspectedPathogen').toLowerCase()} ({t('common.optional').toLowerCase()})</option>
                
                {/* Fungi */}
                <optgroup label="Fungi">
                  <option value="Phytophthora infestans">Phytophthora infestans</option>
                  <option value="Fusarium oxysporum">Fusarium oxysporum</option>
                  <option value="Botrytis cinerea">Botrytis cinerea</option>
                  <option value="Alternaria solani">Alternaria solani</option>
                  <option value="Cercospora zeae-maydis">Cercospora zeae-maydis</option>
                  <option value="Puccinia triticina">Puccinia triticina</option>
                  <option value="Rhizoctonia solani">Rhizoctonia solani</option>
                  <option value="Sclerotinia sclerotiorum">Sclerotinia sclerotiorum</option>
                  <option value="Verticillium dahliae">Verticillium dahliae</option>
                  <option value="Pythium ultimum">Pythium ultimum</option>
                </optgroup>
                
                {/* Bacteria */}
                <optgroup label="Bacteria">
                  <option value="Xanthomonas campestris">Xanthomonas campestris</option>
                  <option value="Pseudomonas syringae">Pseudomonas syringae</option>
                  <option value="Erwinia carotovora">Erwinia carotovora</option>
                  <option value="Ralstonia solanacearum">Ralstonia solanacearum</option>
                  <option value="Agrobacterium tumefaciens">Agrobacterium tumefaciens</option>
                </optgroup>
                
                {/* Viruses */}
                <optgroup label="Viruses">
                  <option value="Tobacco Mosaic Virus">Tobacco Mosaic Virus</option>
                  <option value="Cucumber Mosaic Virus">Cucumber Mosaic Virus</option>
                  <option value="Tomato Yellow Leaf Curl Virus">Tomato Yellow Leaf Curl Virus</option>
                  <option value="Potato Virus Y">Potato Virus Y</option>
                  <option value="Bean Common Mosaic Virus">Bean Common Mosaic Virus</option>
                </optgroup>
                
                {/* Nematodes */}
                <optgroup label="Nematodes">
                  <option value="Meloidogyne incognita">Meloidogyne incognita (Root-knot nematode)</option>
                  <option value="Meloidogyne javanica">Meloidogyne javanica (Root-knot nematode)</option>
                  <option value="Meloidogyne arenaria">Meloidogyne arenaria (Root-knot nematode)</option>
                  <option value="Heterodera glycines">Heterodera glycines (Soybean cyst nematode)</option>
                  <option value="Globodera pallida">Globodera pallida (Potato cyst nematode)</option>
                  <option value="Globodera rostochiensis">Globodera rostochiensis (Golden potato cyst nematode)</option>
                  <option value="Pratylenchus penetrans">Pratylenchus penetrans (Root lesion nematode)</option>
                  <option value="Pratylenchus vulnus">Pratylenchus vulnus (Root lesion nematode)</option>
                  <option value="Radopholus similis">Radopholus similis (Burrowing nematode)</option>
                  <option value="Rotylenchulus reniformis">Rotylenchulus reniformis (Reniform nematode)</option>
                  <option value="Tylenchulus semipenetrans">Tylenchulus semipenetrans (Citrus nematode)</option>
                  <option value="Ditylenchus dipsaci">Ditylenchus dipsaci (Stem and bulb nematode)</option>
                  <option value="Aphelenchoides besseyi">Aphelenchoides besseyi (Rice white tip nematode)</option>
                  <option value="Nacobbus aberrans">Nacobbus aberrans (False root-knot nematode)</option>
                  <option value="Paratrichodorus minor">Paratrichodorus minor (Stubby root nematode)</option>
                </optgroup>
                
                <option value="Unknown">Unknown</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                {t('samples.form.analysisTypes')} *
              </label>
              <div className="grid grid-cols-2 gap-2">
                {availableAnalysisTypes.map(analysisType => (
                  <label key={analysisType} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.analysisTypes.includes(analysisType)}
                      onChange={(e) => handleAnalysisTypeChange(analysisType, e.target.checked)}
                      className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-700">{analysisType}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('samples.form.additionalNotes')}
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder={t('samples.form.placeholders.additionalNotes')}
            />
          </div>

          <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-lg hover:bg-green-700 transition-colors"
            >
              {t('samples.register')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};