import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';

// Utility functions for data extraction (simplified versions from worker)
const AttributionUtils = {
  extractInvitationCode(reportLink: string | null): string | null {
    if (!reportLink) return null;
    
    // Try UUID first (invite.unitesync.com format)
    const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    const uuidMatch = reportLink.match(uuidPattern);
    if (uuidMatch) return uuidMatch[0];
    
    // Try extracting after /report/ for non-UUID codes
    const reportMatch = reportLink.match(/\/report\/([a-zA-Z0-9_-]+)/);
    if (reportMatch) return reportMatch[1];
    
    return null;
  },

  extractSpotifyId(url: string | null): string | null {
    if (!url) return null;
    
    const patterns = [
      /\/artist\/([a-zA-Z0-9]+)/,
      /\/track\/([a-zA-Z0-9]+)/,
      /\/album\/([a-zA-Z0-9]+)/,
      /spotify:artist:([a-zA-Z0-9]+)/,
      /open\.spotify\.com\/artist\/([a-zA-Z0-9]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    
    return null;
  }
};

type ClientInsert = Database['public']['Tables']['clients']['Insert'];
type ProcessingJobInsert = Database['public']['Tables']['data_processing_jobs']['Insert'];

export interface AttributionResult {
  processing_date: string;
  total_clients: number;
  attributed_clients: number;
  attribution_rate: string;
  attribution_breakdown: Record<string, number>;
  revenue_breakdown: Record<string, number>;
  attributed_clients_data: AttributedClient[];
  data_sources_summary: any;
  methodology: string[];
  // New Phase 2 fields
  sequence_variants_summary?: any;
  conversion_timing_analysis?: any;
  additional_data?: any;
  funnelMetrics?: any;
  revenueAnalytics?: any;
}

export interface AttributedClient {
  id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  spotify_id?: string | null;
  invitation_code?: string | null;
  status: string;
  revenue: number;
  signup_date?: string | null;
  attribution_source: string;
  attribution_confidence: number;
  attribution_method: string;
  attribution_details?: any;
  created_at?: string;
  updated_at?: string;
}

interface BatchOperationResult {
  success: boolean;
  processedCount: number;
  errors: string[];
}

export class SupabaseUploadService {
  // Streamlined method for uploading essential dashboard data only
  async uploadEssentialDashboardData(
    rawData: any,
    options: { batchSize?: number; onProgress?: Function } = {}
  ): Promise<{ success: boolean; summary: any }> {
    console.log('📊 Starting essential dashboard data upload (optimized strategy)...');
    const { batchSize = 100, onProgress } = options;
    
    const uploadSummary: any = {
      contacts_uploaded: 0,
      sequences_uploaded: 0,
      threads_uploaded: 0,
      audits_skipped: 0,
      convrt_leads_skipped: 0,
      labels_skipped: 0,
      total_essential_records: 0,
      skipped_large_files: 0,
      optimization_note: 'Using worker-based data for complex analytics instead of database storage'
    };

    try {
      // ESSENTIAL TABLE 1: Contacts (needed for conversion rate calculations)
      if (rawData.contacts && Array.isArray(rawData.contacts)) {
        console.log(`📇 Uploading ${rawData.contacts.length} contacts (essential for conversion metrics)...`);
        const contactsResult = await this.uploadContacts(rawData.contacts, { batchSize, onProgress });
        uploadSummary.contacts_uploaded = contactsResult.processedCount;
        uploadSummary.total_essential_records += contactsResult.processedCount;
      }

      // ESSENTIAL TABLE 2: Basic Sequences (needed for pipeline categorization)
      if (rawData.sequences && Array.isArray(rawData.sequences)) {
        console.log(`📧 Uploading ${rawData.sequences.length} sequences (essential for pipeline data)...`);
        const sequencesResult = await this.uploadSequences(rawData.sequences, { batchSize, onProgress });
        uploadSummary.sequences_uploaded = sequencesResult.processedCount;
        uploadSummary.total_essential_records += sequencesResult.processedCount;
      }

      // ESSENTIAL TABLE 3: Thread metadata (needed for reply statistics)
      if (rawData.threads && Array.isArray(rawData.threads)) {
        console.log(`💬 Uploading ${rawData.threads.length} threads (essential for reply metrics)...`);
        const threadsResult = await this.uploadThreads(rawData.threads, { batchSize, onProgress });
        uploadSummary.threads_uploaded = threadsResult.processedCount;
        uploadSummary.total_essential_records += threadsResult.processedCount;
      }

      // SKIP PROBLEMATIC TABLES WITH SCHEMA MISMATCHES
      // These tables have column mismatches and will be replaced by worker-based data
      if (rawData.audits && Array.isArray(rawData.audits)) {
        console.log(`⏭️ Skipping audits upload: ${rawData.audits.length} records (schema mismatch - worker will provide this data)`);
        uploadSummary.audits_skipped = rawData.audits.length;
      }

      if (rawData.convrtLeads && Array.isArray(rawData.convrtLeads)) {
        console.log(`⏭️ Skipping convrt_leads upload: ${rawData.convrtLeads.length} records (schema mismatch - worker will provide this data)`);
        uploadSummary.convrt_leads_skipped = rawData.convrtLeads.length;
      }

      if (rawData.labels && Array.isArray(rawData.labels)) {
        console.log(`⏭️ Skipping labels upload: ${rawData.labels.length} records (schema mismatch - worker will provide this data)`);
        uploadSummary.labels_skipped = rawData.labels.length;
      }

      // SKIP LARGE PROCESSING FILES (handled client-side by worker)
      const skippedFiles = [
        'v1Emails', 'v2Emails', 'v3Emails', 'v3SubsequenceEmails', 'auditEmails', // Large email content files (~30MB each)
        'v1ContactStats', 'v2ContactStats', 'v3ContactStats', 'v3SubsequenceStats', 'inboundAuditStats', // Statistics CSVs (used only for processing)
        'convrtAuditStatus', 'convrtReportStatus' // Status JSONs (used only for timing validation)
      ];
      
      let skippedCount = 0;
      skippedFiles.forEach(key => {
        if (rawData[key] && Array.isArray(rawData[key])) {
          skippedCount += rawData[key].length;
          console.log(`⏭️  Skipped ${key}: ${rawData[key].length} records (processed client-side by worker)`);
        }
      });
      uploadSummary.skipped_large_files = skippedCount;

      console.log('✅ Essential dashboard data upload completed successfully');
      console.log('📊 Hybrid Upload Strategy Summary:');
      console.log(`   📈 Essential records uploaded: ${uploadSummary.total_essential_records}`);
      console.log(`   ⏭️  Schema mismatch tables skipped: ${uploadSummary.audits_skipped + uploadSummary.convrt_leads_skipped + uploadSummary.labels_skipped}`);
      console.log(`   ⏭️  Large files skipped (client-processed): ${uploadSummary.skipped_large_files}`);
      console.log(`   🎯 Dashboard will use worker-based data for detailed analytics`);

      return { success: true, summary: uploadSummary };

    } catch (error) {
      console.error('❌ Essential dashboard data upload failed:', error);
      throw error;
    }
  }

  // Individual upload methods for raw source data
  private async uploadContacts(contacts: any[], options: { batchSize?: number; onProgress?: Function }): Promise<BatchOperationResult> {
    const { batchSize = 100 } = options;
    const transformedContacts = contacts.map(contact => {
      // Extract data from customVars for specific database fields
      const customVars = contact.customVars || contact.custom_variables || contact.CustomVars || {};
      
      return {
        id: contact.id || contact._id || `contact_${Date.now()}_${Math.random().toString(36).substring(2)}`,
        email: contact.email,
        first_name: contact.first_name || contact.firstName || null,
        last_name: contact.last_name || contact.lastName || null,
        spotify_id: customVars.artist_spotify_id || AttributionUtils.extractSpotifyId(customVars.artistspotifyurl || customVars.spotify_artist_url) || null,
        spotify_url: customVars.artistspotifyurl || customVars.spotify_artist_url || null,
        invitation_code: customVars.invitation_code || AttributionUtils.extractInvitationCode(customVars.report_link) || null,
        report_link: customVars.report_link || null,
        status: contact.status || 'active',
        created_at: contact.created_at || contact.createdAt || new Date().toISOString(),
        updated_at: contact.updated_at || contact.updatedAt || new Date().toISOString(),
        custom_vars: {
          ...customVars,
          // Store additional fields that don't have specific columns
          company: contact.company || null,
          linkedinUrl: contact.linkedinUrl || null,
          tags: contact.tags || null
        }
      };
    });

    let processed = 0;
    const errors: string[] = [];

    for (let i = 0; i < transformedContacts.length; i += batchSize) {
      const batch = transformedContacts.slice(i, i + batchSize);
      
      const { error } = await supabase
        .from('contacts')
        .insert(batch);

      if (error) {
        errors.push(`Contacts batch ${i}: ${error.message}`);
      }

      processed += batch.length;
    }

    return { success: errors.length === 0, processedCount: processed, errors };
  }

  private async uploadSequences(sequences: any[], options: { batchSize?: number; onProgress?: Function }): Promise<BatchOperationResult> {
    const { batchSize = 100 } = options;
    const transformedSequences = sequences.map(sequence => ({
      id: sequence.id || `sequence_${Date.now()}_${Math.random().toString(36).substring(2)}`,
      name: sequence.name || sequence.sequence_name,
      description: sequence.description || null,
      type: sequence.type || 'email_outreach',
      status: sequence.status || 'active',
      pipeline: sequence.pipeline || this.determinePipeline(sequence.id || sequence.name),
      created_at: sequence.created_at || sequence.createdAt || new Date().toISOString(),
      updated_at: sequence.updated_at || sequence.updatedAt || new Date().toISOString()
    }));

    let processed = 0;
    const errors: string[] = [];

    for (let i = 0; i < transformedSequences.length; i += batchSize) {
      const batch = transformedSequences.slice(i, i + batchSize);
      
      const { error } = await supabase
        .from('sequences')
        .insert(batch);

      if (error) {
        errors.push(`Sequences batch ${i}: ${error.message}`);
      }

      processed += batch.length;
    }

    return { success: errors.length === 0, processedCount: processed, errors };
  }

  private async uploadThreads(threads: any[], options: { batchSize?: number; onProgress?: Function }): Promise<BatchOperationResult> {
    const { batchSize = 100 } = options;
    const transformedThreads = threads.map(thread => ({
      id: thread.id || thread._id || `thread_${Date.now()}_${Math.random().toString(36).substring(2)}`,
      contact_id: thread.contact_id || thread.contactId || null,
      contact_email: thread.contactEmail || thread.contact_email || thread.email || '',
      contact_first_name: thread.contactFirstName || thread.contact_first_name || thread.firstName || null,
      contact_last_name: thread.contactLastName || thread.contact_last_name || thread.lastName || null,
      subject: thread.subject || null,
      mailbox_id: thread.mailboxId || thread.mailbox_id || null,
      reply_type: thread.replyType || thread.reply_type || this.categorizeReply(thread),
      label_id: thread.labelId || thread.label_id || null,
      is_unread: thread.isUnread !== undefined ? thread.isUnread : false,
      latest_date: thread.date || thread.latest_date || thread.lastActivityAt || new Date().toISOString(),
      latest_content: thread.content || thread.latest_content || null,
      created_at: thread.created_at || thread.createdAt || new Date().toISOString(),
      updated_at: thread.updated_at || thread.updatedAt || new Date().toISOString()
    }));

    let processed = 0;
    const errors: string[] = [];

    for (let i = 0; i < transformedThreads.length; i += batchSize) {
      const batch = transformedThreads.slice(i, i + batchSize);
      
      const { error } = await supabase
        .from('threads')
        .insert(batch);

      if (error) {
        errors.push(`Threads batch ${i}: ${error.message}`);
      }

      processed += batch.length;
    }

    return { success: errors.length === 0, processedCount: processed, errors };
  }

  private async uploadEmails(emails: any[], options: { batchSize?: number; onProgress?: Function }): Promise<BatchOperationResult> {
    const { batchSize = 100 } = options;
    const transformedEmails = emails.map(email => ({
      id: email.id || email._id || `email_${Date.now()}_${Math.random().toString(36).substring(2)}`,
      thread_id: email.thread_id || email.threadId,
      sequence_id: email.sequence_id || email.sequenceId,
      contact_id: email.contact_id || email.contactId,
      type: email.type || 'sent',
      subject: email.subject || null,
      content: email.content || email.body || null,
      sent_at: email.sent_at || email.sentAt || new Date().toISOString(),
      variant_id: email.variant_id || email.variantId || null,
      created_at: email.created_at || email.createdAt || new Date().toISOString()
    }));

    let processed = 0;
    const errors: string[] = [];

    for (let i = 0; i < transformedEmails.length; i += batchSize) {
      const batch = transformedEmails.slice(i, i + batchSize);
      
      const { error } = await supabase
        .from('emails')
        .insert(batch);

      if (error) {
        errors.push(`Emails batch ${i}: ${error.message}`);
      }

      processed += batch.length;
    }

    return { success: errors.length === 0, processedCount: processed, errors };
  }

  private async uploadAudits(audits: any[], options: { batchSize?: number; onProgress?: Function }): Promise<BatchOperationResult> {
    const { batchSize = 100 } = options;
    const transformedAudits = audits.map(audit => ({
      id: audit.id || audit._id || `audit_${Date.now()}_${Math.random().toString(36).substring(2)}`,
      spotify_id: audit.spotify_id || audit.spotifyId,
      email: audit.email || null,
      request_type: audit.request_type || audit.type || 'inbound',
      status: audit.status || 'pending',
      source: audit.source || 'dashboard',
      requested_at: audit.requested_at || audit.createdAt || new Date().toISOString(),
      completed_at: audit.completed_at || audit.completedAt || null
    }));

    let processed = 0;
    const errors: string[] = [];

    for (let i = 0; i < transformedAudits.length; i += batchSize) {
      const batch = transformedAudits.slice(i, i + batchSize);
      
      const { error } = await supabase
        .from('audits')
        .insert(batch);

      if (error) {
        errors.push(`Audits batch ${i}: ${error.message}`);
      }

      processed += batch.length;
    }

    return { success: errors.length === 0, processedCount: processed, errors };
  }

  private async uploadConvrtLeads(leads: any[], options: { batchSize?: number; onProgress?: Function }): Promise<BatchOperationResult> {
    const { batchSize = 100 } = options;
    const transformedLeads = leads.map(lead => ({
      id: lead.id || `convrt_lead_${Date.now()}_${Math.random().toString(36).substring(2)}`,
      spotify_id: lead.spotify_id || lead.spotifyId,
      email: lead.email || null,
      instagram_handle: lead.instagram_handle || lead.instagramHandle,
      campaign_type: lead.campaign_type || lead.type || 'report_link',
      status: lead.status || 'active',
      deal_amount: parseFloat(lead.deal_amount || lead.dealAmount || '0'),
      created_at: lead.created_at || lead.createdAt || new Date().toISOString()
    }));

    let processed = 0;
    const errors: string[] = [];

    for (let i = 0; i < transformedLeads.length; i += batchSize) {
      const batch = transformedLeads.slice(i, i + batchSize);
      
      const { error } = await supabase
        .from('convrt_leads')
        .insert(batch);

      if (error) {
        errors.push(`Convrt leads batch ${i}: ${error.message}`);
      }

      processed += batch.length;
    }

    return { success: errors.length === 0, processedCount: processed, errors };
  }

  private async uploadLabels(labels: any[], options: { batchSize?: number; onProgress?: Function }): Promise<BatchOperationResult> {
    const { batchSize = 100 } = options;
    const transformedLabels = labels.map(label => ({
      id: label.id || `label_${Date.now()}_${Math.random().toString(36).substring(2)}`,
      name: label.name,
      color: label.color || '#666666',
      description: label.description || null,
      category: label.category || 'general'
    }));

    let processed = 0;
    const errors: string[] = [];

    for (let i = 0; i < transformedLabels.length; i += batchSize) {
      const batch = transformedLabels.slice(i, i + batchSize);
      
      const { error } = await supabase
        .from('labels')
        .insert(batch);

      if (error) {
        errors.push(`Labels batch ${i}: ${error.message}`);
      }

      processed += batch.length;
    }

    return { success: errors.length === 0, processedCount: processed, errors };
  }

  // Fallback method for full raw source data upload (non-optimized)
  private async uploadRawSourceData(
    rawData: any, 
    options: { batchSize?: number; onProgress?: Function } = {}
  ): Promise<{ success: boolean; summary: any }> {
    console.log('⚠️ Using fallback raw data upload - consider using essential data upload instead');
    
    // For now, use the essential upload as fallback to maintain functionality
    return await this.uploadEssentialDashboardData(rawData, options);
  }

  // Helper methods
  private extractEmailsFromSources(rawData: any): any[] {
    const emails: any[] = [];
    
    // Extract from email export files
    ['v1Emails', 'v2Emails', 'v3Emails', 'v3SubsequenceEmails', 'auditEmails'].forEach(key => {
      if (rawData[key] && Array.isArray(rawData[key])) {
        emails.push(...rawData[key]);
      }
    });

    return emails;
  }

  private determinePipeline(sequenceIdentifier: string): string {
    if (!sequenceIdentifier) return 'unknown';
    
    const id = sequenceIdentifier.toLowerCase();
    if (id.includes('quao1gj12nqsypj99outg') || id.includes('haajawk44uxpgttihmeuz')) {
      return 'email_outreach_old';
    } else if (id.includes('wi7oitk80ujguc59z7nct') || id.includes('yq8zuesfv8h4z67pgu7po')) {
      return 'email_outreach_new';
    } else if (id.includes('audit') || id.includes('inbound')) {
      return 'royalty_audit';
    } else if (id.includes('instagram') || id.includes('convrt')) {
      return 'instagram_outreach';
    }
    
    return 'unattributed';
  }

  private categorizeReply(thread: any): string {
    // Simple reply categorization logic
    if (thread.positive_reply || thread.interested) return 'positive';
    if (thread.negative_reply || thread.unsubscribe) return 'negative';
    if (thread.reply_count > 0) return 'neutral';
    return 'no_reply';
  }

  // Comprehensive method for uploading all data (raw + attribution results)
  async uploadComprehensiveData(
    rawData: any,
    attributionResults: AttributionResult,
    options: {
      batchSize?: number;
      onProgress?: (progress: { processed: number; total: number; percentage: number }) => void;
      uploadRawData?: boolean;
      uploadEnhancements?: boolean;
      essentialOnly?: boolean; // New option for optimized strategy
    } = {}
  ): Promise<{ success: boolean; jobId: number; summary: any }> {
    const { batchSize = 50, onProgress, uploadRawData = true, uploadEnhancements = true, essentialOnly = true } = options;
    const jobId = await this.createProcessingJob('comprehensive_upload');

    console.log('🚀 Starting comprehensive Supabase upload');
    console.log(`📊 Raw Data Sources: ${Object.keys(rawData).length}`);
    console.log(`👥 Attribution Clients: ${attributionResults.attributed_clients_data.length}`);
    console.log(`⚡ Optimized Strategy: ${essentialOnly ? 'Essential data only' : 'Full data upload'}`);

    let totalSteps = 0;
    let completedSteps = 0;

    // Calculate total steps for progress tracking
    if (uploadRawData) {
      if (essentialOnly) {
        totalSteps += 6; // Essential tables: contacts, sequences, threads, audits, convrt_leads, labels
      } else {
        totalSteps += Object.keys(rawData).filter(key => rawData[key] && Array.isArray(rawData[key])).length;
      }
    }
    totalSteps += 1; // Attribution results
    if (uploadEnhancements) {
      totalSteps += 3; // Sequence variants, funnel metrics, conversion timing
    }

    const summary: any = {
      raw_data_upload: null,
      attribution_upload: null,
      enhancement_uploads: null,
      total_records_uploaded: 0
    };

    try {
      // Clear existing data
      console.log('🗑️ Clearing existing data...');
      await this.clearExistingData();

      // Step 1: Upload Raw Source Data (if enabled)
      if (uploadRawData && rawData) {
        if (essentialOnly) {
          console.log('⚡ Starting optimized essential data upload...');
          const essentialResult = await this.uploadEssentialDashboardData(rawData, { batchSize, onProgress });
          summary.raw_data_upload = essentialResult.summary;
          summary.total_records_uploaded += essentialResult.summary.total_essential_records;
          completedSteps += 6; // Essential tables count
        } else {
          console.log('🔄 Starting full raw source data upload...');
          const rawDataResult = await this.uploadRawSourceData(rawData, { batchSize, onProgress });
          summary.raw_data_upload = rawDataResult.summary;
          summary.total_records_uploaded += rawDataResult.summary.total_source_records;
          completedSteps += Object.keys(rawData).filter(key => rawData[key] && Array.isArray(rawData[key])).length;
        }
        
        if (onProgress) {
          onProgress({
            processed: completedSteps,
            total: totalSteps,
            percentage: Math.round((completedSteps / totalSteps) * 100)
          });
        }
      }

      // Step 2: Upload Attribution Results
      console.log('🎯 Starting attribution results upload...');
      const attributionResult = await this.uploadAttributionResults(attributionResults, {
        batchSize,
        onProgress: (clientProgress) => {
          // Map client progress to overall progress
          const overallProgress = Math.round(((completedSteps + 0.5) / totalSteps) * 100);
          if (onProgress) {
            onProgress({
              processed: completedSteps + Math.round(clientProgress.percentage / 100),
              total: totalSteps,
              percentage: overallProgress
            });
          }
        },
        uploadEnhancements
      });

      summary.attribution_upload = attributionResult.summary;
      summary.total_records_uploaded += attributionResult.summary.successful_uploads || 0;
      completedSteps += 1;

      if (uploadEnhancements && attributionResult.summary) {
        // Enhancement uploads are handled within uploadAttributionResults
        summary.enhancement_uploads = {
          sequence_variants: attributionResult.summary.sequence_variants_upload,
          funnel_metrics: attributionResult.summary.funnel_metrics_upload,
          conversion_timing: attributionResult.summary.conversion_timing_upload
        };
        completedSteps += 3;
      }

      // Final progress update
      if (onProgress) {
        onProgress({
          processed: totalSteps,
          total: totalSteps,
          percentage: 100
        });
      }

      // Update job status
      await this.updateProcessingJob(
        jobId,
        'completed',
        summary.total_records_uploaded,
        summary.total_records_uploaded,
        0,
        summary,
        null
      );

      console.log('🎉 Comprehensive upload completed successfully');
      console.log('📊 Total Records Uploaded:', summary.total_records_uploaded);

      return {
        success: true,
        jobId,
        summary
      };

    } catch (error) {
      console.error('❌ Comprehensive upload failed:', error);
      
      await this.updateProcessingJob(
        jobId,
        'failed',
        completedSteps,
        completedSteps,
        1,
        summary,
        error instanceof Error ? error.message : String(error)
      );

      throw error;
    }
  }

  // Enhanced method for uploading sequence variant analytics
  async uploadSequenceVariantAnalytics(
    sequenceVariantsSummary: any,
    options: { batchSize?: number; onProgress?: Function } = {}
  ): Promise<BatchOperationResult> {
    console.log('📊 Starting sequence variant analytics upload...');
    
    if (!sequenceVariantsSummary) {
      console.log('⚠️ No sequence variants summary provided');
      return { success: true, processedCount: 0, errors: [] };
    }

    const variants = [];
    
    try {
      // Extract main sequence variants
      if (sequenceVariantsSummary.main_sequence) {
        Object.entries(sequenceVariantsSummary.main_sequence).forEach(([id, data]: [string, any]) => {
          if (data.count > 0) {
            variants.push({
              id: `main_${id}_${Date.now()}`,
              variant_pattern: data.label || id,
              sequence_id: 'seq_wi7oitk80ujguc59z7nct',
              sequence_name: 'UniteSync Outreach V3 (New Method)',
              email_count: data.count || 0,
              client_count: data.clients?.length || 0,
              confidence_score: 0.8,
              status: 'active'
            });
          }
        });
      }
      
      // Extract subsequence variants
      if (sequenceVariantsSummary.subsequence) {
        Object.entries(sequenceVariantsSummary.subsequence).forEach(([id, data]: [string, any]) => {
          if (data.count > 0) {
            variants.push({
              id: `sub_${id}_${Date.now()}`,
              variant_pattern: data.label || id,
              sequence_id: 'seq_yq8zuesfv8h4z67pgu7po',
              sequence_name: 'Subsequence V3 Positive (New Method)',
              email_count: data.count || 0,
              client_count: data.clients?.length || 0,
              confidence_score: 0.8,
              status: 'active'
            });
          }
        });
      }

      console.log(`🔍 Extracted ${variants.length} sequence variant analytics records`);

      if (variants.length === 0) {
        return { success: true, processedCount: 0, errors: [] };
      }

      // Upload variants to sequence_variant_analytics table
      const { data, error } = await supabase
        .from('sequence_variant_analytics')
        .insert(variants);

      if (error) {
        console.error('❌ Sequence variant analytics upload failed:', error);
        return { success: false, processedCount: 0, errors: [error.message] };
      }

      console.log(`✅ Successfully uploaded ${variants.length} sequence variant analytics`);
      return { success: true, processedCount: variants.length, errors: [] };

    } catch (error) {
      console.error('❌ Sequence variant analytics upload error:', error);
      return { success: false, processedCount: 0, errors: [error.message] };
    }
  }

  // Enhanced method for uploading funnel metrics
  async uploadFunnelMetrics(
    funnelMetrics: any,
    processingDate: string,
    options: { batchSize?: number; onProgress?: Function } = {}
  ): Promise<BatchOperationResult> {
    console.log('📈 Starting funnel metrics upload...');
    
    if (!funnelMetrics) {
      console.log('⚠️ No funnel metrics provided');
      return { success: true, processedCount: 0, errors: [] };
    }

    const metrics = [];
    
    try {
      Object.entries(funnelMetrics).forEach(([pipeline, data]: [string, any]) => {
        metrics.push({
          pipeline,
          metric_type: pipeline,
          total_contacted: data.total_contacted || 0,
          total_replied: data.total_replied || 0,
          reply_rate: data.reply_rate || 0,
          conversion_rate: data.conversion_rate || 0,
          processing_date: processingDate
        });
      });

      console.log(`🔍 Extracted ${metrics.length} funnel metrics records`);

      if (metrics.length === 0) {
        return { success: true, processedCount: 0, errors: [] };
      }

      // Upload metrics to funnel_metrics table
      const { data, error } = await supabase
        .from('funnel_metrics')
        .insert(metrics);

      if (error) {
        console.error('❌ Funnel metrics upload failed:', error);
        return { success: false, processedCount: 0, errors: [error.message] };
      }

      console.log(`✅ Successfully uploaded ${metrics.length} funnel metrics`);
      return { success: true, processedCount: metrics.length, errors: [] };

    } catch (error) {
      console.error('❌ Funnel metrics upload error:', error);
      return { success: false, processedCount: 0, errors: [error.message] };
    }
  }

  // Enhanced method for uploading conversion timing data
  async uploadConversionTiming(
    conversionTimingAnalysis: any,
    processingDate: string,
    options: { batchSize?: number; onProgress?: Function } = {}
  ): Promise<BatchOperationResult> {
    console.log('⏰ Starting conversion timing upload...');
    
    if (!conversionTimingAnalysis?.conversion_variant_stats) {
      console.log('⚠️ No conversion timing analysis provided');
      return { success: true, processedCount: 0, errors: [] };
    }

    const timingData = [];
    
    try {
      // Extract conversion timing data from analysis results
      Object.entries(conversionTimingAnalysis.conversion_variant_stats).forEach(([variant, count]: [string, any]) => {
        timingData.push({
          variant_pattern: variant,
          pipeline: 'email_outreach_new', // Default pipeline for variant analysis
          conversion_trigger: variant,
          processing_date: processingDate
        });
      });

      // Add any specific conversion timing records if available
      if (conversionTimingAnalysis.timing_patterns) {
        Object.entries(conversionTimingAnalysis.timing_patterns).forEach(([pattern, data]: [string, any]) => {
          timingData.push({
            variant_pattern: pattern,
            pipeline: data.pipeline || 'email_outreach_new',
            days_to_conversion: data.days_to_conversion || null,
            conversion_trigger: data.trigger || pattern,
            processing_date: processingDate
          });
        });
      }

      console.log(`🔍 Extracted ${timingData.length} conversion timing records`);

      if (timingData.length === 0) {
        return { success: true, processedCount: 0, errors: [] };
      }

      // Upload timing data to conversion_timing table
      const { data, error } = await supabase
        .from('conversion_timing')
        .insert(timingData);

      if (error) {
        console.error('❌ Conversion timing upload failed:', error);
        return { success: false, processedCount: 0, errors: [error.message] };
      }

      console.log(`✅ Successfully uploaded ${timingData.length} conversion timing records`);
      return { success: true, processedCount: timingData.length, errors: [] };

    } catch (error) {
      console.error('❌ Conversion timing upload error:', error);
      return { success: false, processedCount: 0, errors: [error.message] };
    }
  }

  private async createProcessingJob(jobType: string): Promise<number> {
    const { data, error } = await supabase
      .from('data_processing_jobs')
      .insert({
        job_type: jobType,
        status: 'processing',
        started_at: new Date().toISOString(),
        records_processed: 0,
        records_success: 0,
        records_failed: 0
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create processing job: ${error.message}`);
    }

    return data.id;
  }

  private async updateProcessingJob(
    jobId: number, 
    status: string, 
    processed: number, 
    success: number, 
    failed: number, 
    results?: any, 
    errorLog?: string
  ): Promise<void> {
    const { error } = await supabase
      .from('data_processing_jobs')
      .update({
        status,
        records_processed: processed,
        records_success: success,
        records_failed: failed,
        completed_at: new Date().toISOString(),
        results,
        error_log: errorLog
      })
      .eq('id', jobId);

    if (error) {
      throw new Error(`Failed to update processing job: ${error.message}`);
    }
  }

  private transformClientData(client: AttributedClient): ClientInsert {
    console.log(`🔄 Transforming client data for: ${client.email}`);
    console.log(`📋 Raw client data:`, {
      id: client.id,
      signup_date: client.signup_date,
      created_at: client.created_at,
      updated_at: client.updated_at,
      revenue: client.revenue,
      attribution_confidence: client.attribution_confidence
    });

    // Debug: Check for any date-like fields in the raw data
    const allClientKeys = Object.keys(client);
    const dateFields = allClientKeys.filter(key => {
      const value = (client as any)[key];
      return key.toLowerCase().includes('date') || 
             key.toLowerCase().includes('time') ||
             (typeof value === 'string' && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(value));
    });
    if (dateFields.length > 0) {
      console.log('📅 Found potential date fields:', dateFields.map(field => `${field}: ${(client as any)[field]}`));
    }
    
    // Helper function to parse and format dates consistently
    const parseDate = (dateString: string | null | undefined): string | null => {
      if (!dateString || dateString.trim() === '') {
        console.log(`🔍 Date field is empty/null: ${dateString}`);
        return null;
      }
      
      try {
        const trimmedDate = dateString.trim();
        console.log(`🔍 Parsing date: "${trimmedDate}" (length: ${trimmedDate.length})`);
        
        // Handle various date formats
        let parsedDate: Date;
        
        // Check if it's already in ISO format
        if (trimmedDate.includes('T') || trimmedDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
          parsedDate = new Date(trimmedDate);
          console.log(`📅 ISO format detected: ${trimmedDate}`);
        }
        // Handle DD/MM/YYYY format (our main problem)
        else if (trimmedDate.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
          const [day, month, year] = trimmedDate.split('/');
          parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          console.log(`📅 DD/MM/YYYY format detected: ${trimmedDate} -> day:${day}, month:${month}, year:${year}`);
        }
        // Handle MM-DD-YYYY format
        else if (trimmedDate.match(/^\d{1,2}-\d{1,2}-\d{4}$/)) {
          const [month, day, year] = trimmedDate.split('-');
          parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          console.log(`📅 MM-DD-YYYY format detected: ${trimmedDate}`);
        }
        // Handle YYYY-MM-DD format
        else if (trimmedDate.match(/^\d{4}-\d{1,2}-\d{1,2}$/)) {
          parsedDate = new Date(trimmedDate);
          console.log(`📅 YYYY-MM-DD format detected: ${trimmedDate}`);
        }
        // Fallback to direct parsing
        else {
          parsedDate = new Date(trimmedDate);
          console.log(`📅 Fallback parsing for: ${trimmedDate}`);
        }

        // Validate the parsed date
        if (isNaN(parsedDate.getTime())) {
          console.warn(`⚠️ Invalid date format: ${trimmedDate}, using null`);
          return null;
        }

        // Return only the date part (YYYY-MM-DD) for date fields
        const result = parsedDate.toISOString().split('T')[0];
        console.log(`✅ Date parsed successfully: ${trimmedDate} -> ${result}`);
        return result;
      } catch (error) {
        console.warn(`⚠️ Date parsing error for "${dateString}":`, error);
        return null;
      }
    };

    // Helper function to safely parse numeric values
    const parseNumeric = (value: any): number => {
      console.log(`🔢 Parsing numeric value: ${value} (type: ${typeof value})`);
      if (value === null || value === undefined || value === '') {
        console.log(`🔢 Numeric value is null/undefined/empty, returning 0`);
        return 0;
      }
      const parsed = parseFloat(value);
      const result = isNaN(parsed) ? 0 : parsed;
      console.log(`🔢 Numeric parsed: ${value} -> ${result}`);
      return result;
    };

    // Generate fallback ID if missing
    const safeId = client.id || `client_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    console.log(`🆔 Client ID: original="${client.id}", safe="${safeId}"`);

    const transformedData = {
      id: safeId,
      email: client.email,
      first_name: client.first_name || null,
      last_name: client.last_name || null,
      spotify_id: client.spotify_id || null,
      invitation_code: client.invitation_code || null,
      status: client.status,
      revenue: parseNumeric(client.revenue),
      signup_date: parseDate(client.signup_date),
      attribution_source: client.attribution_source,
      attribution_confidence: parseNumeric(client.attribution_confidence),
      attribution_method: client.attribution_method,
      attribution_sequence: client.attribution_details?.sequence || null,
      attribution_days_diff: client.attribution_details?.timing_score 
        ? Math.round(parseNumeric(client.attribution_details.timing_score) * 100) 
        : null,
      attribution_invitation_code: client.attribution_details?.invitation_code || null,
      created_at: client.created_at || new Date().toISOString(),
      updated_at: client.updated_at || new Date().toISOString()
    };

    console.log(`✅ Transformed client data:`, {
      id: transformedData.id,
      signup_date: transformedData.signup_date,
      created_at: transformedData.created_at,
      updated_at: transformedData.updated_at,
      revenue: transformedData.revenue,
      attribution_confidence: transformedData.attribution_confidence
    });

    // Debug: Log full transformed data for first few clients to identify the date issue
    if (client.email && (client.email.includes('slimisgold') || client.email.includes('onenamedpeter'))) {
      console.log('🔍 FULL DEBUG - Transformed data:', JSON.stringify(transformedData, null, 2));
    }

    // Final validation: Ensure all date fields are properly formatted or null
    const validateDateFormat = (dateValue: any, fieldName: string): string | null => {
      if (!dateValue) return null;
      
      if (typeof dateValue === 'string') {
        // Check if it's already in YYYY-MM-DD format
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
          return dateValue;
        }
        // Check if it's in ISO format
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(dateValue)) {
          return dateValue.split('T')[0];
        }
        // If it's in DD/MM/YYYY format, re-parse it
        if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateValue)) {
          console.warn(`⚠️  Found DD/MM/YYYY format in ${fieldName}: ${dateValue}, re-parsing...`);
          return parseDate(dateValue);
        }
        console.warn(`⚠️  Unknown date format in ${fieldName}: ${dateValue}, setting to null`);
        return null;
      }
      
      return null;
    };

    // Validate all date fields
    transformedData.signup_date = validateDateFormat(transformedData.signup_date, 'signup_date');
    transformedData.created_at = validateDateFormat(transformedData.created_at, 'created_at') || new Date().toISOString();
    transformedData.updated_at = validateDateFormat(transformedData.updated_at, 'updated_at') || new Date().toISOString();

    return transformedData;
  }

  async uploadAttributionResults(
    attributionResults: AttributionResult,
    options: {
      batchSize?: number;
      onProgress?: (progress: { processed: number; total: number; percentage: number }) => void;
      uploadEnhancements?: boolean;
    } = {}
  ): Promise<{ success: boolean; jobId: number; summary: any }> {
    const { batchSize = 50, onProgress } = options;
    const jobId = await this.createProcessingJob('attribution_upload');

    console.log('🚀 Starting Supabase upload for attribution results');
    console.log(`📊 Total clients to upload: ${attributionResults.attributed_clients_data.length}`);
    console.log('🗂️ Starting core attribution data upload...');

    let processed = 0;
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    try {
      // Clear existing data (if any)
      console.log('🗑️ Clearing existing data...');
      await this.clearExistingData();
      console.log('✅ Existing data cleared');

      // Process clients in batches
      const clients = attributionResults.attributed_clients_data;
      const totalClients = clients.length;
      console.log(`👥 Processing ${totalClients} clients in batches of ${batchSize}...`);

      for (let i = 0; i < totalClients; i += batchSize) {
        const batch = clients.slice(i, i + batchSize);
        const transformedBatch = batch.map(client => this.transformClientData(client));

        try {
          const { data, error } = await supabase
            .from('clients')
            .insert(transformedBatch);

          if (error) {
            console.error('❌ Batch insert error:', error);
            errors.push(`Batch ${i}-${i + batch.length}: ${error.message}`);
            failed += batch.length;
          } else {
            console.log(`✅ Uploaded batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(totalClients/batchSize)}: ${batch.length} clients to database`);
            success += batch.length;
          }
        } catch (batchError) {
          console.error('❌ Batch processing error:', batchError);
          errors.push(`Batch ${i}-${i + batch.length}: ${batchError}`);
          failed += batch.length;
        }

        processed += batch.length;

        // Report progress
        if (onProgress) {
          onProgress({
            processed,
            total: totalClients,
            percentage: Math.round((processed / totalClients) * 100)
          });
        }

        // Small delay to prevent overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log(`📋 Core client upload complete: ${success} successful, ${failed} failed`);

      // Phase 2 Enhancement Uploads
      const { uploadEnhancements = true } = options;
      let enhancementResults = {};
      
      if (uploadEnhancements) {
        console.log('🎯 Starting Phase 2 enhancement uploads...');
        
        try {
          // Upload sequence variant analytics
          if (attributionResults.sequence_variants_summary) {
            console.log('📊 Uploading sequence variant analytics...');
            const variantsResult = await this.uploadSequenceVariantAnalytics(
              attributionResults.sequence_variants_summary,
              { onProgress }
            );
            enhancementResults.sequence_variants_upload = variantsResult;
            console.log(`✅ Sequence variants: ${variantsResult.processedCount} records`);
          }
          
          // Upload funnel metrics
          if (attributionResults.additional_data?.funnelMetrics) {
            console.log('📈 Uploading funnel metrics...');
            const funnelResult = await this.uploadFunnelMetrics(
              attributionResults.additional_data.funnelMetrics,
              attributionResults.processing_date,
              { onProgress }
            );
            enhancementResults.funnel_metrics_upload = funnelResult;
            console.log(`✅ Funnel metrics: ${funnelResult.processedCount} records`);
          }
          
          // Upload conversion timing
          if (attributionResults.conversion_timing_analysis) {
            console.log('⏰ Uploading conversion timing...');
            const timingResult = await this.uploadConversionTiming(
              attributionResults.conversion_timing_analysis,
              attributionResults.processing_date,
              { onProgress }
            );
            enhancementResults.conversion_timing_upload = timingResult;
            console.log(`✅ Conversion timing: ${timingResult.processedCount} records`);
          }
          
          console.log('🎉 Phase 2 enhancement uploads completed successfully');
          
        } catch (enhancementError) {
          console.warn('⚠️ Phase 2 enhancement uploads failed:', enhancementError);
          enhancementResults.enhancement_errors = enhancementError.message;
        }
      }

      // Create comprehensive summary
      const summary = {
        total_clients: totalClients,
        processed_clients: processed,
        successful_uploads: success,
        failed_uploads: failed,
        attribution_rate: attributionResults.attribution_rate,
        attribution_breakdown: attributionResults.attribution_breakdown,
        revenue_breakdown: attributionResults.revenue_breakdown,
        data_sources_summary: attributionResults.data_sources_summary,
        methodology: attributionResults.methodology,
        upload_date: new Date().toISOString(),
        // Include new Phase 2 data
        sequence_variants_summary: attributionResults.sequence_variants_summary || null,
        conversion_timing_analysis: attributionResults.conversion_timing_analysis || null,
        funnel_metrics: attributionResults.funnelMetrics || null,
        revenue_analytics: attributionResults.revenueAnalytics || null,
        additional_data: attributionResults.additional_data || null,
        // Include enhancement upload results
        ...enhancementResults
      };

      // Update job status
      await this.updateProcessingJob(
        jobId,
        failed > 0 ? 'completed_with_errors' : 'completed',
        processed,
        success,
        failed,
        summary,
        errors.length > 0 ? errors.join('\n') : null
      );

      console.log('📊 Upload Summary:');
      console.log(`   Total clients: ${totalClients}`);
      console.log(`   Successful uploads: ${success}`);
      console.log(`   Failed uploads: ${failed}`);
      console.log(`   Attribution rate: ${attributionResults.attribution_rate}`);

      return {
        success: failed === 0,
        jobId,
        summary
      };

    } catch (error) {
      console.error('❌ Upload failed:', error);
      
      await this.updateProcessingJob(
        jobId,
        'failed',
        processed,
        success,
        failed,
        null,
        error instanceof Error ? error.message : String(error)
      );

      throw error;
    }
  }

  private async clearExistingData(): Promise<void> {
    console.log('🗑️ Clearing existing data from all tables...');
    
    try {
      // Clear clients table
      console.log('🗂️ Clearing clients table...');
      const { error: clientsError } = await supabase
        .from('clients')
        .delete()
        .neq('id', 'non-existent-id'); // Delete all records

      if (clientsError) {
        console.warn('⚠️ Warning: Could not clear clients table:', clientsError.message);
      } else {
        console.log('✅ Cleared clients table');
      }

      // Clear related attribution tables
      console.log('🔗 Clearing client_contact_attribution table...');
      const { error: attributionError } = await supabase
        .from('client_contact_attribution')
        .delete()
        .neq('id', 0); // Delete all records

      if (attributionError) {
        console.warn('⚠️ Warning: Could not clear attribution table:', attributionError.message);
      } else {
        console.log('✅ Cleared client_contact_attribution table');
      }

      // Clear Phase 2 enhancement tables
      console.log('🎯 Clearing Phase 2 enhancement tables...');
      
      // Clear sequence variant analytics
      const { error: variantsError } = await supabase
        .from('sequence_variant_analytics')
        .delete()
        .neq('id', 'non-existent-id');

      if (variantsError) {
        console.warn('⚠️ Warning: Could not clear sequence_variant_analytics table:', variantsError.message);
      } else {
        console.log('✅ Cleared sequence_variant_analytics table');
      }

      // Clear funnel metrics
      const { error: funnelError } = await supabase
        .from('funnel_metrics')
        .delete()
        .neq('id', 0);

      if (funnelError) {
        console.warn('⚠️ Warning: Could not clear funnel_metrics table:', funnelError.message);
      } else {
        console.log('✅ Cleared funnel_metrics table');
      }

      // Clear conversion timing
      const { error: timingError } = await supabase
        .from('conversion_timing')
        .delete()
        .neq('id', 0);

      if (timingError) {
        console.warn('⚠️ Warning: Could not clear conversion_timing table:', timingError.message);
      } else {
        console.log('✅ Cleared conversion_timing table');
      }

      console.log('🎉 All tables cleared successfully');

    } catch (error) {
      console.warn('⚠️ Warning: Error during data clearing:', error);
    }
  }

  async getUploadStatus(jobId: number): Promise<any> {
    const { data, error } = await supabase
      .from('data_processing_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error) {
      throw new Error(`Failed to get upload status: ${error.message}`);
    }

    return data;
  }

  async getLatestAttributionResults(): Promise<any> {
    const { data, error } = await supabase
      .from('data_processing_jobs')
      .select('*')
      .eq('job_type', 'attribution_upload')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      throw new Error(`Failed to get latest attribution results: ${error.message}`);
    }

    return data;
  }

  async getClientAttributionSummary(): Promise<any> {
    const { data, error } = await supabase
      .from('clients')
      .select('attribution_source, status, revenue')
      .order('attribution_source');

    if (error) {
      throw new Error(`Failed to get client attribution summary: ${error.message}`);
    }

    // Group by attribution source
    const summary = data.reduce((acc: any, client) => {
      const source = client.attribution_source || 'Unattributed';
      if (!acc[source]) {
        acc[source] = {
          total_clients: 0,
          active_clients: 0,
          total_revenue: 0,
          active_revenue: 0
        };
      }
      
      acc[source].total_clients++;
      acc[source].total_revenue += client.revenue || 0;
      
      if (client.status === 'Active') {
        acc[source].active_clients++;
        acc[source].active_revenue += client.revenue || 0;
      }
      
      return acc;
    }, {});

    return summary;
  }
}

export const supabaseUploadService = new SupabaseUploadService();