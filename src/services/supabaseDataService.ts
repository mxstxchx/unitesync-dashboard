/**
 * Supabase Data Service
 * Handles fetching attribution data from Supabase database
 * Used as an alternative to file-based storage for team collaboration
 */

import { supabase } from '../lib/supabase';

export interface AttributionReportRecord {
  id: string;
  processing_date: string;
  total_clients: number;
  attributed_clients: number;
  attribution_rate: number;
  attribution_breakdown: any;
  revenue_breakdown: any;
  additional_data: any;
}

export interface ClientAttributionRecord {
  id: string;
  report_id: string;
  client_email: string;
  status: string;
  revenue: string;
  attribution_source: string;
  attribution_method: string;
  attribution_confidence: string;
  attribution_details: any;
  client_signup_date: string; // Original client signup date in DD/MM/YYYY format
  created_at: string;
}

export interface DataSourceSummaryRecord {
  id: string;
  report_id: string;
  source_name: string;
  total_count: number;
  attributed_count: number;
  attribution_rate: number;
}

class SupabaseDataService {
  /**
   * Get the latest attribution report from Supabase
   */
  async getLatestReport(): Promise<any | null> {
    try {
      console.log('📡 Fetching latest attribution report from Supabase...');
      
      const { data: reportRecord, error } = await supabase
        .from('attribution_reports')
        .select('*')
        .order('processing_date', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No reports found
          console.log('ℹ️ No attribution reports found in Supabase');
          return null;
        }
        throw new Error(`Failed to fetch latest report: ${error.message}`);
      }

      console.log('✅ Latest report fetched from Supabase:', {
        id: reportRecord.id,
        processing_date: reportRecord.processing_date,
        total_clients: reportRecord.total_clients
      });

      // Fetch the detailed client attribution data
      console.log('📡 Fetching client attributions for report:', reportRecord.id);
      const clientAttributions = await this.getClientAttributions(reportRecord.id);
      
      // Transform client attributions back to the expected format (must match AttributedClient interface)
      const attributed_clients_data = clientAttributions.map(client => {
        // Use the proper client_signup_date column (original DD/MM/YYYY date from worker)
        // Fall back to attribution_details for backward compatibility with old records
        const actualSignupDate = client.client_signup_date ||
                                client.attribution_details?.client_signup_date ||
                                client.attribution_details?.contacted_date || 
                                client.attribution_details?.match_data?.stat?.Contacted_date ||
                                client.attribution_details?.match_data?.stat?.Replied_date ||
                                client.created_at; // Final fallback to database created_at

        return {
          email: client.client_email,
          status: client.status,
          revenue: client.revenue || '0', // Keep as string (dashboard expects string)
          created_at: actualSignupDate, // Use actual historical date for time series
          attribution_source: client.attribution_source || null,
          attribution_method: client.attribution_method || null,
          attribution_confidence: parseFloat(client.attribution_confidence || '0'), // Dashboard expects this exact field name
          attribution_details: client.attribution_details || {},
          // Legacy field mappings for backward compatibility
          pipeline: client.attribution_source || null,
          confidence_score: parseFloat(client.attribution_confidence || '0'),
          revenue_amount: parseFloat(client.revenue || '0'),
          signup_date: actualSignupDate
        };
      });

      console.log('✅ Fetched', attributed_clients_data.length, 'client attributions from Supabase');
      
      // Debug: Check first few transformed records
      console.log('🔍 Sample transformed client data:', attributed_clients_data.slice(0, 3));
      
      // Debug: Count attributed vs unattributed after transformation
      const transformedAttributed = attributed_clients_data.filter(c => c.attribution_source).length;
      const transformedUnattributed = attributed_clients_data.filter(c => !c.attribution_source).length;
      console.log(`🔍 After transformation: ${transformedAttributed} attributed, ${transformedUnattributed} unattributed`);

      // Debug: Check date extraction
      const sampleDates = attributed_clients_data.slice(0, 5).map(c => ({
        email: c.email,
        created_at: c.created_at,
        revenue: c.revenue
      }));
      console.log('🔍 Sample dates and revenue after transformation:', sampleDates);

      // Transform the database record back to the expected AttributionReport format
      const attributionReport = {
        processing_date: reportRecord.processing_date,
        total_clients: reportRecord.total_clients,
        attributed_clients: reportRecord.attributed_clients,
        attribution_rate: (reportRecord.attribution_rate * 100).toFixed(1) + '%',
        attribution_breakdown: reportRecord.attribution_breakdown || {},
        revenue_breakdown: reportRecord.revenue_breakdown || {},
        methodology: reportRecord.additional_data?.methodology || [],
        sequence_variants_summary: reportRecord.additional_data?.sequence_variants_summary,
        conversion_timing_analysis: reportRecord.additional_data?.conversion_timing_analysis,
        data_sources_summary: reportRecord.additional_data?.data_sources_summary,
        additional_data: reportRecord.additional_data || {}, // Include full additional_data for manual_emails and other analytics
        attributed_clients_data: attributed_clients_data
      };

      return attributionReport;
    } catch (error) {
      console.error('❌ Error fetching latest report from Supabase:', error);
      throw error;
    }
  }

  /**
   * Get all attribution reports (metadata only)
   */
  async getAllReports(): Promise<AttributionReportRecord[]> {
    try {
      console.log('📡 Fetching all attribution reports from Supabase...');
      
      const { data, error } = await supabase
        .from('attribution_reports')
        .select('id, processing_date, total_clients, attributed_clients, attribution_rate')
        .order('processing_date', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch reports: ${error.message}`);
      }

      console.log('✅ Fetched', data.length, 'reports from Supabase');
      return data || [];
    } catch (error) {
      console.error('❌ Error fetching reports from Supabase:', error);
      throw error;
    }
  }

  /**
   * Get a specific attribution report by ID
   */
  async getReportById(reportId: string): Promise<any | null> {
    try {
      console.log('📡 Fetching report by ID from Supabase:', reportId);
      
      const { data, error } = await supabase
        .from('attribution_reports')
        .select('*')
        .eq('id', reportId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('ℹ️ Report not found:', reportId);
          return null;
        }
        throw new Error(`Failed to fetch report: ${error.message}`);
      }

      console.log('✅ Report fetched from Supabase:', reportId);
      return data.report_data;
    } catch (error) {
      console.error('❌ Error fetching report from Supabase:', error);
      throw error;
    }
  }

  /**
   * Get client attributions for a specific report
   */
  async getClientAttributions(reportId: string): Promise<ClientAttributionRecord[]> {
    try {
      console.log('📡 Fetching client attributions from Supabase for report:', reportId);
      
      const { data, error } = await supabase
        .from('client_attributions')
        .select('*')
        .eq('report_id', reportId)
        .order('attribution_confidence', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch client attributions: ${error.message}`);
      }

      console.log('✅ Fetched', data?.length || 0, 'client attributions from Supabase');
      return data || [];
    } catch (error) {
      console.error('❌ Error fetching client attributions from Supabase:', error);
      throw error;
    }
  }

  /**
   * Get data source summaries for a specific report
   */
  async getDataSourceSummaries(reportId: string): Promise<DataSourceSummaryRecord[]> {
    try {
      console.log('📡 Fetching data source summaries from Supabase for report:', reportId);
      
      const { data, error } = await supabase
        .from('data_source_summaries')
        .select('*')
        .eq('report_id', reportId)
        .order('attributed_count', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch data source summaries: ${error.message}`);
      }

      console.log('✅ Fetched', data?.length || 0, 'data source summaries from Supabase');
      return data || [];
    } catch (error) {
      console.error('❌ Error fetching data source summaries from Supabase:', error);
      throw error;
    }
  }

  /**
   * Check if Supabase connection is working
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log('🔍 Testing Supabase connection...');
      
      const { data, error } = await supabase
        .from('attribution_reports')
        .select('count', { count: 'exact', head: true });

      if (error) {
        console.error('❌ Supabase connection test failed:', error.message);
        return false;
      }

      console.log('✅ Supabase connection successful');
      return true;
    } catch (error) {
      console.error('❌ Supabase connection test error:', error);
      return false;
    }
  }

  /**
   * Delete a specific report and all related data
   */
  async deleteReport(reportId: string): Promise<void> {
    try {
      console.log('🗑️ Deleting report from Supabase:', reportId);
      
      // Delete in reverse dependency order
      // 1. Delete client attributions
      const { error: clientsError } = await supabase
        .from('client_attributions')
        .delete()
        .eq('report_id', reportId);

      if (clientsError) {
        throw new Error(`Failed to delete client attributions: ${clientsError.message}`);
      }

      // 2. Delete data source summaries
      const { error: sourcesError } = await supabase
        .from('data_source_summaries')
        .delete()
        .eq('report_id', reportId);

      if (sourcesError) {
        throw new Error(`Failed to delete data source summaries: ${sourcesError.message}`);
      }

      // 3. Delete main report
      const { error: reportError } = await supabase
        .from('attribution_reports')
        .delete()
        .eq('id', reportId);

      if (reportError) {
        throw new Error(`Failed to delete report: ${reportError.message}`);
      }

      console.log('✅ Report deleted from Supabase:', reportId);
    } catch (error) {
      console.error('❌ Error deleting report from Supabase:', error);
      throw error;
    }
  }
}

export const supabaseDataService = new SupabaseDataService();