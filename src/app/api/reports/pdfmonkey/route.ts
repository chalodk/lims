import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

    const payload = {
      document: {
        document_template_id: 'E7E87A76-10F7-4F3C-B45F-24BB7D06ED63',
        status: 'pending',
        payload: {
          reportNumber: 'LAB-2025-001',
          issueDate: '2025-09-08',
          clientName: 'Viña San Pedro',
          clientAddress: 'Camino Viejo s/n, San Fernando',
          clientContact: 'Juan Pérez',
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
          report_id
        }
      }
    }

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
      return NextResponse.json({ error: 'PDFMonkey error', details: data }, { status: 502 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error creating PDFMonkey document:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


