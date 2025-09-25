import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  // Lightweight health check to confirm the route is mounted
  return NextResponse.json({ ok: true, route: 'pdfmonkey' })
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { report_id } = body || {}

    if (!report_id) {
      return NextResponse.json({ error: 'report_id is required' }, { status: 400 })
    }

    // Fetch report first (avoid inner joins that can be filtered by RLS)
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .select('id, created_at, client_id, test_areas')
      .eq('id', report_id)
      .single()

    if (reportError || !report) {
      console.warn('PDFMonkey: report not found or inaccessible', { report_id, reportError })
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    // Fetch client separately to avoid inner-join filtering
    let client: { id: string; name?: string | null; address?: string | null; contact_email?: string | null; phone?: string | null } | null = null
    if (report.client_id) {
      const { data: clientData } = await supabase
        .from('clients')
        .select('id, name, address, contact_email, phone')
        .eq('id', report.client_id)
        .single()
      client = clientData
    }

    // Generate filename: client_name + test_areas
    const clientName = client?.name ? client.name.replace(/[^a-zA-Z0-9]/g, '_') : 'Cliente'
    const testAreas = Array.isArray(report.test_areas) && report.test_areas.length > 0 
      ? report.test_areas.join('_').replace(/[^a-zA-Z0-9]/g, '_')
      : 'Analisis'
    const filename = `${clientName}_${testAreas}.pdf`

    const payload = {
      document: {
        document_template_id: 'E7E87A76-10F7-4F3C-B45F-24BB7D06ED63',
        status: 'pending',
        payload: {
          reportNumber: 'LAB-2025-001',
          issueDate: '2025-09-08',
          clientName: client?.name || 'Cliente no especificado',
          clientAddress: client?.address || 'Dirección no especificada',
          clientContact: client?.contact_email || client?.phone || 'Contacto no especificado',
          sampleId: 'M-12345',
          sampleReceptionDate: '2025-09-05',
          sampleType: 'Suelo agrícola',
          results: [
            { name: 'pH', method: 'Potenciómetro', value: '6.2', unit: '-', reference: '5.5 - 7.0' },
            { name: 'Materia orgánica', method: 'Combustión', value: '2.8', unit: '%', reference: '> 3.0' }
          ],
          observations: 'La muestra presenta un nivel ligeramente bajo de materia orgánica.',
          analystName: 'Dra. María González',
          analystTitle: 'Químico responsable'
        },
        meta: {
          report_id,
          _filename: filename
        }
      }
    }

    console.log('Creating PDFMonkey document for report:', report_id)
    console.log('PDFMonkey payload:', JSON.stringify(payload, null, 2))

    const response = await fetch('https://api.pdfmonkey.io/api/v1/documents', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Token provisto por el usuario (temporalmente hardcoded para pruebas)
        Authorization: 'Bearer 7mCRJHas8oqUQxsQX-in'
      },
      body: JSON.stringify(payload)
    })

    const data = await response.json()
    
    if (!response.ok) {
      console.error('PDFMonkey API error:', {
        status: response.status,
        statusText: response.statusText,
        data
      })
      return NextResponse.json({ error: 'PDFMonkey error', details: data }, { status: 502 })
    }

    console.log('PDFMonkey document created successfully:', {
      documentId: data.id,
      status: data.status,
      reportId: report_id
    })

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error creating PDFMonkey document:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


