import jsPDF from 'jspdf';
import { Sample, Client, Project, TestResult } from '../types';

export interface ReportData {
  samples: Sample[];
  clients: Client[];
  projects: Project[];
  testResults: TestResult[];
  reportType: 'single' | 'batch';
}

export const generatePDFReport = (data: ReportData): void => {
  const { samples, clients, projects, testResults, reportType } = data;
  
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  let yPosition = 20;

  // Helper function to add text with word wrapping
  const addText = (text: string, x: number, y: number, maxWidth?: number, fontSize = 10) => {
    pdf.setFontSize(fontSize);
    if (maxWidth) {
      const lines = pdf.splitTextToSize(text, maxWidth);
      pdf.text(lines, x, y);
      return y + (lines.length * fontSize * 0.4);
    } else {
      pdf.text(text, x, y);
      return y + (fontSize * 0.4);
    }
  };

  // Helper function to check if we need a new page
  const checkNewPage = (requiredSpace = 30) => {
    if (yPosition > pageHeight - requiredSpace) {
      pdf.addPage();
      yPosition = 20;
      return true;
    }
    return false;
  };

  // Helper function to get client and project data
  const getClient = (clientId: string) => clients.find(c => c.id === clientId);
  const getProject = (projectId: string) => projects.find(p => p.id === projectId);
  const getSampleResults = (sampleId: string) => testResults.filter(r => r.sampleId === sampleId);

  // Header
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text('PhytoLIMS', 20, yPosition);
  
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  yPosition += 8;
  pdf.text('Phytopathology Laboratory Information Management System', 20, yPosition);
  
  // Report info
  yPosition += 15;
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  const reportTitle = reportType === 'single' ? 'Phytopathology Diagnostic Report' : 'Batch Phytopathology Diagnostic Report';
  yPosition = addText(reportTitle, 20, yPosition, pageWidth - 40, 16);
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  yPosition += 5;
  const reportNumber = `RPT-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
  pdf.text(`Report Number: ${reportNumber}`, 20, yPosition);
  pdf.text(`Date: ${new Date().toLocaleDateString()}`, pageWidth - 60, yPosition);
  yPosition += 8;
  yPosition = addText('Comprehensive analysis and identification of plant pathogens', 20, yPosition, pageWidth - 40, 10);

  // Client Information
  if (samples.length > 0) {
    const client = getClient(samples[0].clientId);
    const project = getProject(samples[0].projectId);
    
    yPosition += 15;
    checkNewPage(40);
    
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Client Information', 20, yPosition);
    
    yPosition += 10;
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    
    if (client) {
      pdf.text(`Client Name: ${client.name}`, 20, yPosition);
      yPosition += 6;
      if (project) {
        pdf.text(`Project Name: ${project.name}`, 20, yPosition);
        yPosition += 6;
      }
      pdf.text(`Contact Email: ${client.email}`, 20, yPosition);
      yPosition += 6;
      if (client.phone) {
        pdf.text(`Phone: ${client.phone}`, 20, yPosition);
        yPosition += 6;
      }
    }
    
    pdf.text(`Samples Analyzed: ${samples.length}`, 20, yPosition);
    yPosition += 15;
  }

  // Sample Results
  samples.forEach((sample, index) => {
    checkNewPage(60);

    const sampleResults = getSampleResults(sample.id);
    
    // Sample header
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`Sample ${index + 1}: ${sample.code}`, 20, yPosition);
    
    yPosition += 12;
    
    // Sample Information section
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Sample Information', 20, yPosition);
    yPosition += 8;
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    
    // Sample details in a structured format
    pdf.text(`Plant Species: ${sample.plantSpecies}`, 25, yPosition);
    yPosition += 6;
    
    if (sample.plantVariety) {
      pdf.text(`Plant Variety: ${sample.plantVariety}`, 25, yPosition);
      yPosition += 6;
    }
    
    pdf.text(`Tissue Type: ${sample.tissueType.replace('_', ' ')}`, 25, yPosition);
    yPosition += 6;
    
    pdf.text(`Collection Date: ${sample.collectionDate.toLocaleDateString()}`, 25, yPosition);
    yPosition += 6;
    
    if (sample.collectionLocation) {
      yPosition = addText(`Collection Location: ${sample.collectionLocation}`, 25, yPosition, pageWidth - 50);
      yPosition += 2;
    }
    
    if (sample.symptoms) {
      yPosition = addText(`Symptoms Observed: ${sample.symptoms}`, 25, yPosition, pageWidth - 50);
      yPosition += 2;
    }

    if (sample.environmentalConditions) {
      yPosition = addText(`Environmental Conditions: ${sample.environmentalConditions}`, 25, yPosition, pageWidth - 50);
      yPosition += 2;
    }

    yPosition += 8;

    // Analysis results
    if (sampleResults.length > 0) {
      checkNewPage(40);
      
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Analysis Results', 20, yPosition);
      yPosition += 8;
      
      sampleResults.forEach((result, resultIndex) => {
        checkNewPage(35);
        
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`Analysis ${resultIndex + 1}: ${result.analysisType}`, 25, yPosition);
        yPosition += 6;
        
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Methodology: ${result.methodology}`, 30, yPosition);
        yPosition += 6;
        
        if (result.pathogenIdentified) {
          pdf.setFont('helvetica', 'bold');
          pdf.text(`Pathogen Identified: ${result.pathogenIdentified}`, 30, yPosition);
          yPosition += 6;
          
          pdf.setFont('helvetica', 'normal');
          if (result.pathogenType) {
            pdf.text(`Pathogen Type: ${result.pathogenType}`, 30, yPosition);
            yPosition += 6;
          }
          if (result.severity) {
            pdf.text(`Severity Level: ${result.severity}`, 30, yPosition);
            yPosition += 6;
          }
          pdf.text(`Confidence Level: ${result.confidence}`, 30, yPosition);
          yPosition += 6;
        }
        
        yPosition = addText(`Diagnostic Results: ${result.result}`, 30, yPosition, pageWidth - 60);
        yPosition += 4;
        
        if (result.microscopicObservations) {
          yPosition = addText(`Microscopic Observations: ${result.microscopicObservations}`, 30, yPosition, pageWidth - 60);
          yPosition += 4;
        }
        
        if (result.culturalCharacteristics) {
          yPosition = addText(`Cultural Characteristics: ${result.culturalCharacteristics}`, 30, yPosition, pageWidth - 60);
          yPosition += 4;
        }
        
        if (result.molecularResults) {
          yPosition = addText(`Molecular Results: ${result.molecularResults}`, 30, yPosition, pageWidth - 60);
          yPosition += 4;
        }
        
        if (result.recommendations) {
          pdf.setFont('helvetica', 'bold');
          yPosition = addText(`Management Recommendations: ${result.recommendations}`, 30, yPosition, pageWidth - 60);
          pdf.setFont('helvetica', 'normal');
          yPosition += 4;
        }
        
        if (result.comments) {
          yPosition = addText(`Additional Comments: ${result.comments}`, 30, yPosition, pageWidth - 60);
          yPosition += 4;
        }
        
        yPosition += 6;
      });
    } else {
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'italic');
      pdf.text('No analysis results available for this sample', 25, yPosition);
      yPosition += 10;
    }
    
    yPosition += 10;
  });

  // Laboratory Information and Validation
  checkNewPage(50);
  
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Laboratory Information', 20, yPosition);
  yPosition += 8;
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text('PhytoLIMS Laboratory', 20, yPosition);
  yPosition += 6;
  pdf.text('Phytopathology Laboratory Information Management System', 20, yPosition);
  yPosition += 6;
  pdf.text('Email: lab@phytolims.com', 20, yPosition);
  yPosition += 12;
  
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Report Validation', 20, yPosition);
  yPosition += 8;
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Analyzed by: Dr. Sarah Johnson (Plant Pathologist)', 20, yPosition);
  yPosition += 6;
  pdf.text('Validated by: Laboratory Supervisor', 20, yPosition);
  yPosition += 6;
  pdf.text(`Report Date: ${new Date().toLocaleDateString()}`, 20, yPosition);
  yPosition += 6;
  pdf.text(`Report Generated: ${new Date().toLocaleString()}`, 20, yPosition);

  // Footer disclaimer
  yPosition = pageHeight - 20;
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'italic');
  yPosition = addText('This report is confidential and intended solely for the use of the client. Results are based on the samples provided and analysis methods specified. For questions regarding this report, please contact the laboratory.', 20, yPosition, pageWidth - 40, 8);

  // Save the PDF
  const fileName = `PhytoLIMS_${reportType === 'single' ? 'Single' : 'Batch'}_Report_${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(fileName);
};