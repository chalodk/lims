import { createClient } from '@/lib/supabase/client'
import type { SLAType, SLAStatus } from '@/types/database'

export class SLAService {
  private supabase = createClient()

  /**
   * Calculate due date based on received date and SLA type
   * Excludes weekends from business days calculation
   */
  computeDueDate(receivedAt: Date, slaType: SLAType): Date {
    const dueDate = new Date(receivedAt)
    const businessDaysToAdd = slaType === 'express' ? 4 : 9
    
    let addedDays = 0
    while (addedDays < businessDaysToAdd) {
      dueDate.setDate(dueDate.getDate() + 1)
      // Skip weekends (0 = Sunday, 6 = Saturday)
      if (dueDate.getDay() !== 0 && dueDate.getDay() !== 6) {
        addedDays++
      }
    }
    
    return dueDate
  }

  /**
   * Calculate SLA status based on due date and current status
   */
  calculateSLAStatus(dueDate: Date, currentStatus: string): SLAStatus {
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Reset time for accurate date comparison
    
    const dueDateOnly = new Date(dueDate)
    dueDateOnly.setHours(0, 0, 0, 0)
    
    const diffTime = dueDateOnly.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    // If sample is completed, it's always on time
    if (currentStatus === 'completed') {
      return 'on_time'
    }
    
    // Already past due date
    if (diffDays < 0) {
      return 'breached'
    }
    
    // Due today or tomorrow - at risk
    if (diffDays <= 1) {
      return 'at_risk'
    }
    
    // Still have time
    return 'on_time'
  }

  /**
   * Update SLA status for all active samples
   * Should be run daily as a cron job
   */
  async updateAllSLAStatuses(): Promise<{ updated: number; errors: number }> {
    try {
      // Get all active samples (not completed)
      const { data: samples, error } = await this.supabase
        .from('samples')
        .select('id, due_date, status, sla_status')
        .neq('status', 'completed')

      if (error) {
        console.error('Error fetching samples for SLA update:', error)
        return { updated: 0, errors: 1 }
      }

      if (!samples || samples.length === 0) {
        return { updated: 0, errors: 0 }
      }

      let updated = 0
      let errors = 0

      for (const sample of samples) {
        if (!sample.due_date) continue

        const newStatus = this.calculateSLAStatus(
          new Date(sample.due_date),
          sample.status
        )

        // Only update if status has changed
        if (newStatus !== sample.sla_status) {
          const { error: updateError } = await this.supabase
            .from('samples')
            .update({ sla_status: newStatus })
            .eq('id', sample.id)

          if (updateError) {
            console.error(`Error updating SLA status for sample ${sample.id}:`, updateError)
            errors++
          } else {
            updated++
          }
        }
      }

      return { updated, errors }
    } catch (error) {
      console.error('Error in updateAllSLAStatuses:', error)
      return { updated: 0, errors: 1 }
    }
  }

  /**
   * Update SLA status for a specific sample
   */
  async updateSampleSLAStatus(sampleId: string): Promise<boolean> {
    try {
      const { data: sample, error } = await this.supabase
        .from('samples')
        .select('due_date, status, sla_status')
        .eq('id', sampleId)
        .single()

      if (error || !sample || !sample.due_date) {
        return false
      }

      const newStatus = this.calculateSLAStatus(
        new Date(sample.due_date),
        sample.status
      )

      if (newStatus !== sample.sla_status) {
        const { error: updateError } = await this.supabase
          .from('samples')
          .update({ sla_status: newStatus })
          .eq('id', sampleId)

        return !updateError
      }

      return true
    } catch (error) {
      console.error(`Error updating SLA status for sample ${sampleId}:`, error)
      return false
    }
  }

  /**
   * Get SLA statistics for dashboard
   */
  async getSLAStats(): Promise<{
    total: number
    on_time: number
    at_risk: number
    breached: number
    express: number
  }> {
    try {
      const { data, error } = await this.supabase
        .from('samples')
        .select('sla_status, sla_type')
        .neq('status', 'completed')

      if (error || !data) {
        return { total: 0, on_time: 0, at_risk: 0, breached: 0, express: 0 }
      }

      const stats = {
        total: data.length,
        on_time: 0,
        at_risk: 0,
        breached: 0,
        express: 0
      }

      data.forEach(sample => {
        if (sample.sla_type === 'express') {
          stats.express++
        }
        
        switch (sample.sla_status) {
          case 'on_time':
            stats.on_time++
            break
          case 'at_risk':
            stats.at_risk++
            break
          case 'breached':
            stats.breached++
            break
        }
      })

      return stats
    } catch (error) {
      console.error('Error getting SLA stats:', error)
      return { total: 0, on_time: 0, at_risk: 0, breached: 0, express: 0 }
    }
  }

  /**
   * Get samples that need attention based on SLA status
   */
  async getSamplesNeedingAttention(): Promise<{
    at_risk: Array<{ id: string; code: string; client_id: string; due_date: string; status: string; clients?: { name: string } }>
    breached: Array<{ id: string; code: string; client_id: string; due_date: string; status: string; clients?: { name: string } }>
    express_due_soon: Array<{ id: string; code: string; client_id: string; due_date: string; status: string; clients?: { name: string } }>
  }> {
    try {
      const [atRiskResult, breachedResult, expressResult] = await Promise.all([
        // At-risk samples
        this.supabase
          .from('samples')
          .select(`
            id, code, client_id, due_date, status,
            clients (name)
          `)
          .eq('sla_status', 'at_risk')
          .neq('status', 'completed'),

        // Breached samples
        this.supabase
          .from('samples')
          .select(`
            id, code, client_id, due_date, status,
            clients (name)
          `)
          .eq('sla_status', 'breached')
          .neq('status', 'completed'),

        // Express samples due within 2 days
        this.supabase
          .from('samples')
          .select(`
            id, code, client_id, due_date, status,
            clients (name)
          `)
          .eq('sla_type', 'express')
          .neq('status', 'completed')
          .lte('due_date', new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      ])

      return {
        at_risk: atRiskResult.data || [],
        breached: breachedResult.data || [],
        express_due_soon: expressResult.data || []
      }
    } catch (error) {
      console.error('Error getting samples needing attention:', error)
      return {
        at_risk: [],
        breached: [],
        express_due_soon: []
      }
    }
  }
}