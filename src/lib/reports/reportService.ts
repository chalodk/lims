import { getSupabaseClient } from '@/lib/supabase/singleton'
import type { 
  ReportTemplateRow, 
  Report, 
  SampleFull,
  Database 
} from '@/types/database'

export class ReportService {
  private supabase = getSupabaseClient()

  async getTemplates(active: boolean = true): Promise<ReportTemplateRow[]> {
    const { data, error } = await this.supabase
      .from('report_templates')
      .select('*')
      .eq('active', active)
      .order('name')

    if (error) throw error
    return data || []
  }

  async getTemplate(code: string, version?: number): Promise<ReportTemplateRow | null> {
    let query = this.supabase
      .from('report_templates')
      .select('*')
      .eq('code', code)
      .eq('active', true)

    if (version) {
      query = query.eq('version', version)
    } else {
      query = query.order('version', { ascending: false }).limit(1)
    }

    const { data, error } = await query.single()
    if (error) return null
    return data
  }

  async createTemplate(template: Omit<Database['public']['Tables']['report_templates']['Insert'], 'id'>): Promise<ReportTemplateRow> {
    // Check if template with same code exists to increment version
    const existing = await this.getTemplate(template.code)
    const version = existing ? existing.version + 1 : 1

    const { data, error } = await this.supabase
      .from('report_templates')
      .insert({
        ...template,
        version
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  async getSampleData(sampleId: string): Promise<SampleFull | null> {
    const { data, error } = await this.supabase
      .from('samples')
      .select(`
        *,
        clients (*),
        projects (*),
        sample_tests (
          *,
          test_catalog (*),
          methods (*)
        ),
        sample_units (
          *,
          unit_results (
            *,
            test_catalog (*),
            methods (*)
          )
        ),
        applied_interpretations (
          *,
          interpretation_rules (*)
        ),
        reports (*)
      `)
      .eq('id', sampleId)
      .single()

    if (error) return null
    return data as SampleFull
  }

  async renderReport(
    sampleId: string, 
    templateCode: string, 
    version?: number,
    userId?: string
  ): Promise<Report> {
    const template = await this.getTemplate(templateCode, version)
    if (!template) {
      throw new Error(`Template ${templateCode} not found`)
    }

    const sampleData = await this.getSampleData(sampleId)
    if (!sampleData) {
      throw new Error(`Sample ${sampleId} not found`)
    }

    // Generate HTML content from template
    const htmlContent = await this.generateHTML(template, sampleData)
    
    // Convert to PDF (stub for now - integrate with your existing PDF renderer)
    const pdfUrl = await this.generatePDF(htmlContent, `report-${sampleId}-${Date.now()}.pdf`)

    // Create report record
    const { data: report, error } = await this.supabase
      .from('reports')
      .insert({
        sample_id: sampleId,
        client_id: sampleData.client_id,
        company_id: sampleData.company_id,
        template_id: template.id,
        version: template.version,
        rendered_pdf_url: pdfUrl,
        generated_by: userId,
        status: 'generated',
        visibility: 'client'
      })
      .select()
      .single()

    if (error) throw error
    
    // Trigger PDF creation in PDFMonkey
    try {
      await fetch('/api/reports/pdfmonkey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report_id: report.id })
      })
    } catch (e) {
      console.error('Failed to request PDF creation (service):', e)
    }

    return report
  }

  private async generateHTML(template: ReportTemplateRow, sampleData: SampleFull): Promise<string> {
    // Basic template engine - you can enhance this with a more sophisticated templating system
    let html = template.file_url ? await this.fetchTemplateContent(template.file_url) : this.getDefaultTemplate()
    
    // Replace template variables
    const variables = {
      'SAMPLE_CODE': sampleData.code,
      'CLIENT_NAME': sampleData.clients?.name || '',
      'SPECIES': sampleData.species,
      'VARIETY': sampleData.variety || '',
      'RECEIVED_DATE': new Date(sampleData.received_date).toLocaleDateString('es-CL'),
      'REGION': sampleData.region || '',
      'LOCALITY': sampleData.locality || '',
      'PROJECT_NAME': sampleData.projects?.name || '',
      'SLA_TYPE': sampleData.sla_type === 'express' ? 'Express' : 'Normal',
      'TESTS_TABLE': this.generateTestsTable(sampleData),
      'RESULTS_TABLE': this.generateResultsTable(sampleData),
      'INTERPRETATIONS': this.generateInterpretations(sampleData),
      'GENERATED_DATE': new Date().toLocaleDateString('es-CL')
    }

    // Replace all variables in template
    for (const [key, value] of Object.entries(variables)) {
      html = html.replace(new RegExp(`{{${key}}}`, 'g'), value)
    }

    return html
  }

  private async fetchTemplateContent(url: string): Promise<string> {
    try {
      const response = await fetch(url)
      return await response.text()
    } catch (error) {
      console.error('Error fetching template:', error)
      return this.getDefaultTemplate()
    }
  }

  private getDefaultTemplate(): string {
    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reporte de Análisis - {{SAMPLE_CODE}}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .section { margin: 20px 0; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .info-item { display: flex; }
        .label { font-weight: bold; margin-right: 10px; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .interpretations { background-color: #f9f9f9; padding: 15px; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Reporte de Análisis Fitopatológico</h1>
        <h2>Código de Muestra: {{SAMPLE_CODE}}</h2>
    </div>

    <div class="section">
        <h3>Información de la Muestra</h3>
        <div class="info-grid">
            <div class="info-item"><span class="label">Cliente:</span>{{CLIENT_NAME}}</div>
            <div class="info-item"><span class="label">Especie:</span>{{SPECIES}}</div>
            <div class="info-item"><span class="label">Variedad:</span>{{VARIETY}}</div>
            <div class="info-item"><span class="label">Fecha Recepción:</span>{{RECEIVED_DATE}}</div>
            <div class="info-item"><span class="label">Región:</span>{{REGION}}</div>
            <div class="info-item"><span class="label">Localidad:</span>{{LOCALITY}}</div>
            <div class="info-item"><span class="label">Proyecto:</span>{{PROJECT_NAME}}</div>
            <div class="info-item"><span class="label">Tipo SLA:</span>{{SLA_TYPE}}</div>
        </div>
    </div>

    <div class="section">
        <h3>Tests Solicitados</h3>
        {{TESTS_TABLE}}
    </div>

    <div class="section">
        <h3>Resultados</h3>
        {{RESULTS_TABLE}}
    </div>

    <div class="section">
        <h3>Interpretaciones</h3>
        <div class="interpretations">
            {{INTERPRETATIONS}}
        </div>
    </div>

    <div class="section">
        <p><em>Reporte generado el {{GENERATED_DATE}}</em></p>
    </div>
</body>
</html>`
  }

  private generateTestsTable(sampleData: SampleFull): string {
    if (!sampleData.sample_tests || sampleData.sample_tests.length === 0) {
      return '<p>No hay tests solicitados.</p>'
    }

    let table = '<table><thead><tr><th>Test</th><th>Método</th><th>Área</th></tr></thead><tbody>'
    
    for (const sampleTest of sampleData.sample_tests) {
      table += `
        <tr>
          <td>${sampleTest.test_catalog?.name || 'N/A'}</td>
          <td>${sampleTest.methods?.name || 'N/A'}</td>
          <td>${sampleTest.test_catalog?.area || 'N/A'}</td>
        </tr>`
    }
    
    table += '</tbody></table>'
    return table
  }

  private generateResultsTable(sampleData: SampleFull): string {
    if (!sampleData.sample_units || sampleData.sample_units.length === 0) {
      return '<p>No hay resultados disponibles.</p>'
    }

    let table = '<table><thead><tr><th>Unidad</th><th>Test</th><th>Analito</th><th>Resultado</th><th>Flag</th><th>Notas</th></tr></thead><tbody>'
    
    for (const unit of sampleData.sample_units) {
      if (unit.unit_results) {
        for (const result of unit.unit_results) {
          table += `
            <tr>
              <td>${unit.label || unit.code || 'N/A'}</td>
              <td>${result.test_catalog?.name || 'N/A'}</td>
              <td>${result.analyte || 'N/A'}</td>
              <td>${result.result_value || 'N/A'}</td>
              <td>${result.result_flag || 'N/A'}</td>
              <td>${result.notes || ''}</td>
            </tr>`
        }
      }
    }
    
    table += '</tbody></table>'
    return table
  }

  private generateInterpretations(sampleData: SampleFull): string {
    if (!sampleData.applied_interpretations || sampleData.applied_interpretations.length === 0) {
      return '<p>No hay interpretaciones aplicadas.</p>'
    }

    let interpretations = ''
    for (const interp of sampleData.applied_interpretations) {
      const severityClass = interp.severity === 'high' ? 'color: red;' : 
                          interp.severity === 'moderate' ? 'color: orange;' : 'color: green;'
      
      interpretations += `
        <div style="margin: 10px 0; padding: 10px; border-left: 4px solid #ddd;">
          <strong style="${severityClass}">Severidad: ${interp.severity.toUpperCase()}</strong><br>
          <p>${interp.message}</p>
        </div>`
    }
    
    return interpretations
  }

  private async generatePDF(htmlContent: string, filename: string): Promise<string> {
    // Stub implementation - integrate with your existing PDF generation service
    // This could use libraries like puppeteer, jsPDF, or call an external service
    
    // For now, return a placeholder URL
    const pdfUrl = `/api/reports/pdf/${filename}`
    
    // TODO: Implement actual PDF generation
    // Example with puppeteer:
    // const browser = await puppeteer.launch()
    // const page = await browser.newPage()
    // await page.setContent(htmlContent)
    // const pdf = await page.pdf({ format: 'A4' })
    // await browser.close()
    // 
    // Upload PDF to storage and return URL
    
    return pdfUrl
  }

  async getReportsForSample(sampleId: string): Promise<Report[]> {
    const { data, error } = await this.supabase
      .from('reports')
      .select('*')
      .eq('sample_id', sampleId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  async getReportsForClient(clientId: string): Promise<Report[]> {
    const { data, error } = await this.supabase
      .from('reports')
      .select(`
        *,
        samples (code, species, received_date)
      `)
      .eq('client_id', clientId)
      .eq('visibility', 'client')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }
}