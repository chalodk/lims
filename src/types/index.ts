export interface User {
  id: string;
  name: string;
  email: string;
  role: 'technician' | 'supervisor' | 'client' | 'pathologist';
  avatar?: string;
  specialization?: string;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  clientType: 'farmer' | 'agricultural_company' | 'research_institution' | 'government_agency' | 'consultant';
  cropTypes?: string[];
  region?: string;
  createdAt: Date;
}

export interface Project {
  id: string;
  name: string;
  clientId: string;
  description?: string;
  status: 'active' | 'completed' | 'cancelled';
  projectType: 'disease_diagnosis' | 'pathogen_identification' | 'resistance_testing' | 'surveillance' | 'research';
  cropType?: string;
  season?: string;
  location?: string;
  createdAt: Date;
}

export interface Sample {
  id: string;
  code: string;
  projectId: string;
  clientId: string;
  plantSpecies: string;
  plantVariety?: string;
  tissueType: 'leaf' | 'stem' | 'root' | 'fruit' | 'seed' | 'soil' | 'whole_plant' | 'other';
  symptoms?: string;
  collectionDate: Date;
  collectionLocation?: string;
  environmentalConditions?: string;
  description?: string;
  status: 'received' | 'processing' | 'microscopy' | 'isolation' | 'identification' | 'molecular_analysis' | 'validation' | 'completed';
  receivedAt: Date;
  assignedTo?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  analysisTypes: string[];
  suspectedPathogen?: string;
  images?: string[];
  finalResult?: 'positive' | 'negative';
  canComplete?: boolean;
}

export interface TestResult {
  id: string;
  sampleId: string;
  analysisType: string;
  pathogenIdentified?: string;
  pathogenType?: 'fungus' | 'bacteria' | 'virus' | 'nematode' | 'insect' | 'abiotic' | 'unknown';
  severity?: 'low' | 'moderate' | 'high' | 'severe';
  methodology: string;
  result: string;
  confidence: 'low' | 'medium' | 'high';
  status: 'pending' | 'completed' | 'validated';
  performedBy: string;
  performedAt: Date;
  validatedBy?: string;
  validatedAt?: Date;
  microscopicObservations?: string;
  culturalCharacteristics?: string;
  molecularResults?: string;
  recommendations?: string;
  images?: string[];
  comments?: string;
  resultType: 'positive' | 'negative';
  isPathogenPresent: boolean;
}

export interface Report {
  id: string;
  sampleIds: string[];
  type: 'diagnostic' | 'surveillance' | 'research' | 'batch';
  status: 'draft' | 'generated' | 'sent';
  generatedAt?: Date;
  generatedBy: string;
  clientId: string;
  downloadUrl?: string;
  includeRecommendations: boolean;
  includeImages: boolean;
  reportTemplate: 'standard' | 'detailed' | 'summary' | 'regulatory';
}

export interface Activity {
  id: string;
  type: 'sample_received' | 'analysis_started' | 'pathogen_identified' | 'status_changed' | 'result_validated' | 'report_generated';
  entityId: string;
  userId: string;
  description: string;
  timestamp: Date;
}

export interface WikiDocument {
  id: string;
  title: string;
  content: string;
  category: 'pathogen_guide' | 'methodology' | 'identification_key' | 'disease_management' | 'administrative';
  pathogenType?: 'fungus' | 'bacteria' | 'virus' | 'nematode';
  hostPlants?: string[];
  uploadedBy: string;
  uploadedAt: Date;
  tags: string[];
  images?: string[];
}