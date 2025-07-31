import { useState, useEffect } from 'react';
import { Sample, Client, Project, TestResult, Report, Activity, WikiDocument } from '../types';

// Local storage keys
const STORAGE_KEYS = {
  SAMPLES: 'phytolims_samples',
  TEST_RESULTS: 'phytolims_test_results',
  ACTIVITIES: 'phytolims_activities',
  REPORTS: 'phytolims_reports'
};

// Helper functions for local storage
const loadFromStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Convert date strings back to Date objects for samples
      if (key === STORAGE_KEYS.SAMPLES) {
        return parsed.map((sample: any) => ({
          ...sample,
          collectionDate: new Date(sample.collectionDate),
          receivedAt: new Date(sample.receivedAt)
        }));
      }
      // Convert date strings back to Date objects for test results
      if (key === STORAGE_KEYS.TEST_RESULTS) {
        return parsed.map((result: any) => ({
          ...result,
          performedAt: new Date(result.performedAt),
          validatedAt: result.validatedAt ? new Date(result.validatedAt) : undefined
        }));
      }
      // Convert date strings back to Date objects for activities
      if (key === STORAGE_KEYS.ACTIVITIES) {
        return parsed.map((activity: any) => ({
          ...activity,
          timestamp: new Date(activity.timestamp)
        }));
      }
      // Convert date strings back to Date objects for reports
      if (key === STORAGE_KEYS.REPORTS) {
        return parsed.map((report: any) => ({
          ...report,
          generatedAt: report.generatedAt ? new Date(report.generatedAt) : undefined
        }));
      }
      return parsed;
    }
  } catch (error) {
    console.error(`Error loading ${key} from localStorage:`, error);
  }
  return defaultValue;
};

const saveToStorage = <T>(key: string, data: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Error saving ${key} to localStorage:`, error);
  }
};

// Mock data for phytopathology laboratory
const mockClients: Client[] = [
  { 
    id: '1', 
    name: 'Green Valley Farms', 
    email: 'contact@greenvalley.com', 
    phone: '+1-555-0123', 
    clientType: 'farmer',
    cropTypes: ['tomato', 'pepper', 'cucumber'],
    region: 'Central Valley',
    createdAt: new Date('2024-01-15') 
  },
  { 
    id: '2', 
    name: 'AgriTech Solutions', 
    email: 'lab@agritech.com', 
    phone: '+1-555-0456', 
    clientType: 'agricultural_company',
    cropTypes: ['corn', 'soybean', 'wheat'],
    region: 'Midwest',
    createdAt: new Date('2024-02-01') 
  },
  { 
    id: '3', 
    name: 'State Agricultural Extension', 
    email: 'extension@state.gov', 
    phone: '+1-555-0789', 
    clientType: 'government_agency',
    cropTypes: ['various'],
    region: 'Statewide',
    createdAt: new Date('2024-02-15') 
  }
];

const mockProjects: Project[] = [
  { 
    id: '1', 
    name: 'Tomato Late Blight Surveillance', 
    clientId: '1', 
    description: 'Monitoring for Phytophthora infestans in greenhouse tomatoes', 
    status: 'active',
    projectType: 'surveillance',
    cropType: 'tomato',
    season: 'Spring 2024',
    location: 'Greenhouse Complex A',
    createdAt: new Date('2024-01-20') 
  },
  { 
    id: '2', 
    name: 'Corn Disease Diagnosis', 
    clientId: '2', 
    description: 'Field corn showing leaf spot symptoms', 
    status: 'active',
    projectType: 'disease_diagnosis',
    cropType: 'corn',
    season: 'Summer 2024',
    location: 'Field 12B',
    createdAt: new Date('2024-02-05') 
  },
  { 
    id: '3', 
    name: 'Wheat Rust Resistance Testing', 
    clientId: '3', 
    description: 'Evaluating new wheat varieties for rust resistance', 
    status: 'completed',
    projectType: 'resistance_testing',
    cropType: 'wheat',
    season: 'Fall 2023',
    location: 'Research Plots',
    createdAt: new Date('2024-01-10') 
  }
];

const defaultSamples: Sample[] = [
  { 
    id: '1', 
    code: 'PH-2024-001', 
    projectId: '1', 
    clientId: '1', 
    plantSpecies: 'Solanum lycopersicum',
    plantVariety: 'Cherokee Purple',
    tissueType: 'leaf',
    symptoms: 'Dark brown lesions with yellow halos, water-soaked appearance',
    collectionDate: new Date('2024-01-24'),
    collectionLocation: 'Greenhouse A, Section 3',
    environmentalConditions: 'High humidity (85%), Temperature 22-25°C',
    description: 'Symptomatic tomato leaves showing suspected late blight', 
    status: 'completed', 
    receivedAt: new Date('2024-01-25'), 
    assignedTo: '2', 
    priority: 'high', 
    analysisTypes: ['Microscopy', 'Isolation', 'Molecular PCR'],
    suspectedPathogen: 'Phytophthora infestans',
    images: ['sample1_1.jpg', 'sample1_2.jpg'],
    finalResult: 'positive',
    canComplete: true
  },
  { 
    id: '2', 
    code: 'PH-2024-002', 
    projectId: '2', 
    clientId: '2', 
    plantSpecies: 'Zea mays',
    plantVariety: 'Pioneer 1234',
    tissueType: 'leaf',
    symptoms: 'Circular to oval tan lesions with dark borders',
    collectionDate: new Date('2024-02-09'),
    collectionLocation: 'Field 12B, GPS: 40.7128, -74.0060',
    environmentalConditions: 'Recent rainfall, moderate temperatures',
    description: 'Corn leaves with leaf spot symptoms', 
    status: 'validation', 
    receivedAt: new Date('2024-02-10'), 
    assignedTo: '2', 
    priority: 'medium', 
    analysisTypes: ['Microscopy', 'Cultural Isolation'],
    suspectedPathogen: 'Cercospora zeae-maydis',
    canComplete: false
  },
  { 
    id: '3', 
    code: 'PH-2024-003', 
    projectId: '3', 
    clientId: '3', 
    plantSpecies: 'Triticum aestivum',
    plantVariety: 'Hard Red Winter',
    tissueType: 'leaf',
    symptoms: 'Orange pustules on leaf surface, yellowing',
    collectionDate: new Date('2024-01-14'),
    collectionLocation: 'Research Plot 7',
    description: 'Wheat leaves showing rust symptoms', 
    status: 'completed', 
    receivedAt: new Date('2024-01-15'), 
    assignedTo: '2', 
    priority: 'low', 
    analysisTypes: ['Microscopy', 'Spore Identification'],
    suspectedPathogen: 'Puccinia triticina',
    finalResult: 'negative',
    canComplete: true
  }
];

const defaultTestResults: TestResult[] = [
  { 
    id: '1', 
    sampleId: '1', 
    analysisType: 'Microscopy', 
    pathogenIdentified: 'Phytophthora infestans',
    pathogenType: 'fungus',
    severity: 'high',
    methodology: 'Light microscopy, sporangia examination',
    result: 'Sporangia observed: lemon-shaped, 25-35 μm, papillate. Zoospores released in water.',
    confidence: 'high',
    status: 'validated', 
    performedBy: '2', 
    performedAt: new Date('2024-01-26'),
    validatedBy: '1', 
    validatedAt: new Date('2024-01-27'),
    microscopicObservations: 'Abundant sporangia on leaf surface, characteristic lemon shape with prominent papilla. Sporangiophores branched.',
    recommendations: 'Immediate fungicide application recommended. Remove affected plants. Improve ventilation.',
    images: ['microscopy1_1.jpg', 'microscopy1_2.jpg'],
    resultType: 'positive',
    isPathogenPresent: true
  },
  { 
    id: '2', 
    sampleId: '1', 
    analysisType: 'Molecular PCR', 
    pathogenIdentified: 'Phytophthora infestans',
    pathogenType: 'fungus',
    severity: 'high',
    methodology: 'DNA extraction, ITS region amplification, sequencing',
    result: '99% identity match with P. infestans reference sequence (GenBank: AB000000)',
    confidence: 'high',
    status: 'validated', 
    performedBy: '2', 
    performedAt: new Date('2024-01-27'),
    molecularResults: 'ITS sequence analysis confirms P. infestans. Mating type A1 detected.',
    recommendations: 'Confirmed late blight pathogen. Implement integrated disease management strategy.',
    resultType: 'positive',
    isPathogenPresent: true
  },
  { 
    id: '3', 
    sampleId: '3', 
    analysisType: 'Microscopy', 
    pathogenIdentified: '',
    pathogenType: 'unknown',
    methodology: 'Light microscopy, spore examination',
    result: 'No fungal structures observed. No bacterial streaming. No viral inclusion bodies detected.',
    confidence: 'high',
    status: 'validated', 
    performedBy: '2', 
    performedAt: new Date('2024-01-16'),
    validatedBy: '1', 
    validatedAt: new Date('2024-01-17'),
    microscopicObservations: 'Tissue appears healthy with normal cellular structure. No pathogen signs visible.',
    recommendations: 'No pathogenic organisms detected. Symptoms may be due to abiotic factors such as nutrient deficiency or environmental stress.',
    resultType: 'negative',
    isPathogenPresent: false
  },
  { 
    id: '4', 
    sampleId: '2', 
    analysisType: 'Microscopy', 
    pathogenIdentified: 'Cercospora zeae-maydis',
    pathogenType: 'fungus',
    severity: 'moderate',
    methodology: 'Light microscopy, conidiophore and conidia examination',
    result: 'Conidiophores observed: dark, septate, emerging from stomata. Conidia pale brown, multi-septate.',
    confidence: 'high',
    status: 'completed', 
    performedBy: '2', 
    performedAt: new Date('2024-02-11'),
    microscopicObservations: 'Typical Cercospora conidiophores and conidia present. Lesions show characteristic gray leaf spot symptoms.',
    recommendations: 'Apply fungicide treatment. Consider resistant varieties for future plantings.',
    resultType: 'positive',
    isPathogenPresent: true
  }
];

const defaultReports: Report[] = [
  { 
    id: '1', 
    sampleIds: ['3'], 
    type: 'diagnostic', 
    status: 'generated', 
    generatedAt: new Date('2024-01-20'), 
    generatedBy: '1', 
    clientId: '3', 
    downloadUrl: '#',
    includeRecommendations: true,
    includeImages: true,
    reportTemplate: 'standard'
  }
];

const defaultActivities: Activity[] = [
  { 
    id: '1', 
    type: 'sample_received', 
    entityId: '1', 
    userId: '2', 
    description: 'Tomato sample PH-2024-001 received with suspected late blight symptoms', 
    timestamp: new Date('2024-01-25T09:30:00') 
  },
  { 
    id: '2', 
    type: 'pathogen_identified', 
    entityId: '1', 
    userId: '2', 
    description: 'Phytophthora infestans confirmed in sample PH-2024-001 via microscopy', 
    timestamp: new Date('2024-01-26T14:20:00') 
  },
  { 
    id: '3', 
    type: 'result_validated', 
    entityId: '1', 
    userId: '1', 
    description: 'Late blight diagnosis validated for PH-2024-001, high severity confirmed', 
    timestamp: new Date('2024-01-27T16:45:00') 
  }
];

const mockWikiDocs: WikiDocument[] = [
  { 
    id: '1', 
    title: 'Phytophthora infestans Identification Guide', 
    content: 'Comprehensive guide for identifying late blight pathogen in solanaceous crops. Includes morphological characteristics, molecular markers, and diagnostic protocols...', 
    category: 'pathogen_guide',
    pathogenType: 'fungus',
    hostPlants: ['tomato', 'potato', 'pepper'],
    uploadedBy: '1', 
    uploadedAt: new Date('2024-01-10'), 
    tags: ['late_blight', 'phytophthora', 'solanaceae', 'diagnosis'],
    images: ['phytophthora_guide1.jpg', 'phytophthora_guide2.jpg']
  },
  { 
    id: '2', 
    title: 'Microscopy Protocols for Fungal Pathogens', 
    content: 'Standard operating procedures for microscopic examination of plant pathogenic fungi. Includes sample preparation, staining techniques, and measurement protocols...', 
    category: 'methodology',
    uploadedBy: '1', 
    uploadedAt: new Date('2024-01-12'), 
    tags: ['microscopy', 'fungi', 'protocols', 'diagnosis']
  },
  {
    id: '3',
    title: 'Corn Leaf Spot Disease Key',
    content: 'Identification key for common leaf spot diseases of corn including Cercospora, Helminthosporium, and Colletotrichum species...',
    category: 'identification_key',
    pathogenType: 'fungus',
    hostPlants: ['corn'],
    uploadedBy: '1',
    uploadedAt: new Date('2024-01-15'),
    tags: ['corn', 'leaf_spot', 'identification', 'key']
  }
];

export const useData = () => {
  const [clients] = useState<Client[]>(mockClients);
  const [projects] = useState<Project[]>(mockProjects);
  
  // Load data from localStorage or use defaults
  const [samples, setSamples] = useState<Sample[]>(() => 
    loadFromStorage(STORAGE_KEYS.SAMPLES, defaultSamples)
  );
  const [testResults, setTestResults] = useState<TestResult[]>(() => 
    loadFromStorage(STORAGE_KEYS.TEST_RESULTS, defaultTestResults)
  );
  const [reports, setReports] = useState<Report[]>(() => 
    loadFromStorage(STORAGE_KEYS.REPORTS, defaultReports)
  );
  const [activities, setActivities] = useState<Activity[]>(() => 
    loadFromStorage(STORAGE_KEYS.ACTIVITIES, defaultActivities)
  );
  
  const [wikiDocs] = useState<WikiDocument[]>(mockWikiDocs);

  // Save to localStorage whenever data changes
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.SAMPLES, samples);
  }, [samples]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.TEST_RESULTS, testResults);
  }, [testResults]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.REPORTS, reports);
  }, [reports]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.ACTIVITIES, activities);
  }, [activities]);

  // Function to check if a sample can be completed
  const checkSampleCompletion = (sampleId: string) => {
    const sampleResults = testResults.filter(r => r.sampleId === sampleId && r.status === 'validated');
    const hasValidatedResults = sampleResults.length > 0;
    const allResultsHaveType = sampleResults.every(r => r.resultType === 'positive' || r.resultType === 'negative');
    
    return hasValidatedResults && allResultsHaveType;
  };

  // Function to determine final sample result
  const determineFinalResult = (sampleId: string): 'positive' | 'negative' | undefined => {
    const sampleResults = testResults.filter(r => r.sampleId === sampleId && r.status === 'validated');
    const hasPositiveResult = sampleResults.some(r => r.resultType === 'positive' && r.isPathogenPresent);
    
    if (sampleResults.length === 0) return undefined;
    return hasPositiveResult ? 'positive' : 'negative';
  };

  // Update sample completion status when test results change
  useEffect(() => {
    setSamples(prevSamples => 
      prevSamples.map(sample => {
        const canComplete = checkSampleCompletion(sample.id);
        const finalResult = determineFinalResult(sample.id);
        
        return {
          ...sample,
          canComplete,
          finalResult: finalResult || sample.finalResult
        };
      })
    );
  }, [testResults]);

  const addSample = (sample: Omit<Sample, 'id'>) => {
    const newSample = { 
      ...sample, 
      id: Date.now().toString(),
      canComplete: false
    };
    setSamples(prev => [...prev, newSample]);
    
    // Add activity
    const activity: Activity = {
      id: Date.now().toString(),
      type: 'sample_received',
      entityId: newSample.id,
      userId: '2', // Current user
      description: `${newSample.plantSpecies} sample ${newSample.code} received for ${newSample.analysisTypes.join(', ')} analysis`,
      timestamp: new Date()
    };
    setActivities(prev => [activity, ...prev]);

    // Store the newly created sample ID in localStorage for quick access
    localStorage.setItem('phytolims_latest_sample_id', newSample.id);
    localStorage.setItem('phytolims_latest_sample_code', newSample.code);
  };

  const updateSampleStatus = (sampleId: string, status: Sample['status']) => {
    setSamples(prev => prev.map(s => {
      if (s.id === sampleId) {
        // Prevent completion if sample doesn't have validated positive/negative results
        if (status === 'completed' && !s.canComplete) {
          alert('Cannot complete sample: All analysis results must be validated and marked as positive or negative.');
          return s;
        }
        return { ...s, status };
      }
      return s;
    }));
    
    // Add activity
    const sample = samples.find(s => s.id === sampleId);
    if (sample) {
      const activity: Activity = {
        id: Date.now().toString(),
        type: 'status_changed',
        entityId: sampleId,
        userId: '2',
        description: `Sample ${sample.code} status changed to ${status.replace('_', ' ')}`,
        timestamp: new Date()
      };
      setActivities(prev => [activity, ...prev]);
    }
  };

  const addTestResult = (result: Omit<TestResult, 'id'>) => {
    const newResult = { ...result, id: Date.now().toString() };
    setTestResults(prev => [...prev, newResult]);
    
    // Add activity
    const sample = samples.find(s => s.id === result.sampleId);
    if (sample) {
      const activity: Activity = {
        id: Date.now().toString(),
        type: result.pathogenIdentified ? 'pathogen_identified' : 'analysis_started',
        entityId: result.sampleId,
        userId: result.performedBy,
        description: result.pathogenIdentified 
          ? `${result.pathogenIdentified} identified in sample ${sample.code} (${result.resultType})`
          : `${result.analysisType} analysis completed for ${sample.code} (${result.resultType})`,
        timestamp: new Date()
      };
      setActivities(prev => [activity, ...prev]);
    }

    // Clear the latest sample tracking since user has moved to next step
    localStorage.removeItem('phytolims_latest_sample_id');
    localStorage.removeItem('phytolims_latest_sample_code');
  };

  const validateTestResult = (resultId: string) => {
    setTestResults(prev => prev.map(r => 
      r.id === resultId 
        ? { ...r, status: 'validated', validatedBy: '1', validatedAt: new Date() }
        : r
    ));

    // Add activity
    const result = testResults.find(r => r.id === resultId);
    const sample = samples.find(s => s.id === result?.sampleId);
    if (result && sample) {
      const activity: Activity = {
        id: Date.now().toString(),
        type: 'result_validated',
        entityId: result.sampleId,
        userId: '1',
        description: `${result.analysisType} result validated for sample ${sample.code} (${result.resultType})`,
        timestamp: new Date()
      };
      setActivities(prev => [activity, ...prev]);
    }
  };

  // Function to get the latest created sample for quick access
  const getLatestSample = () => {
    const latestSampleId = localStorage.getItem('phytolims_latest_sample_id');
    if (latestSampleId) {
      return samples.find(s => s.id === latestSampleId);
    }
    return null;
  };

  // Function to clear latest sample tracking
  const clearLatestSample = () => {
    localStorage.removeItem('phytolims_latest_sample_id');
    localStorage.removeItem('phytolims_latest_sample_code');
  };

  return {
    clients,
    projects,
    samples,
    testResults,
    reports,
    activities,
    wikiDocs,
    addSample,
    updateSampleStatus,
    addTestResult,
    validateTestResult,
    getLatestSample,
    clearLatestSample
  };
};