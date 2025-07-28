import { supabase } from './supabase';

// Batch size for Supabase operations (recommended: 1000 records per batch)
const BATCH_SIZE = 1000;

// Interface for batch operation results
interface BatchOperationResult {
  success: boolean;
  processedCount: number;
  errors: string[];
  totalBatches: number;
  completedBatches: number;
}

// Generic batch upsert function
export async function batchUpsert<T>(
  tableName: string,
  data: T[],
  onProgress?: (progress: { message: string; progress: number }) => void
): Promise<BatchOperationResult> {
  if (!data || data.length === 0) {
    return {
      success: true,
      processedCount: 0,
      errors: [],
      totalBatches: 0,
      completedBatches: 0
    };
  }

  const totalBatches = Math.ceil(data.length / BATCH_SIZE);
  const errors: string[] = [];
  let processedCount = 0;

  for (let i = 0; i < totalBatches; i++) {
    const startIndex = i * BATCH_SIZE;
    const endIndex = Math.min(startIndex + BATCH_SIZE, data.length);
    const batch = data.slice(startIndex, endIndex);
    
    try {
      const { error } = await supabase
        .from(tableName)
        .upsert(batch, { onConflict: 'id' });

      if (error) {
        errors.push(`Batch ${i + 1}: ${error.message}`);
      } else {
        processedCount += batch.length;
      }

      // Report progress
      if (onProgress) {
        const progress = Math.round(((i + 1) / totalBatches) * 100);
        onProgress({
          message: `Processing ${tableName}: batch ${i + 1}/${totalBatches}`,
          progress
        });
      }

    } catch (error) {
      errors.push(`Batch ${i + 1}: ${error.message}`);
    }
  }

  return {
    success: errors.length === 0,
    processedCount,
    errors,
    totalBatches,
    completedBatches: totalBatches - errors.length
  };
}

// Specific functions for each data type
export async function upsertContacts(
  contacts: any[],
  onProgress?: (progress: { message: string; progress: number }) => void
): Promise<BatchOperationResult> {
  // Transform contacts data to match database schema
  const transformedContacts = contacts.map(contact => ({
    id: contact.id,
    first_name: contact.firstName,
    last_name: contact.lastName,
    email: contact.email,
    company: contact.company,
    linkedin_url: contact.linkedinUrl,
    tags: contact.tags,
    custom_vars: contact.customVars,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }));

  return batchUpsert('contacts', transformedContacts, onProgress);
}

export async function upsertClients(
  clients: any[],
  onProgress?: (progress: { message: string; progress: number }) => void
): Promise<BatchOperationResult> {
  // Transform clients data to match database schema
  const transformedClients = clients.map(client => ({
    id: client.id || `client_${Date.now()}_${Math.random()}`,
    email: client.email,
    spotify_id: client.spotify_id,
    invitation_code: client.invitation,
    status: client.status,
    revenue: parseFloat(client.revenue) || 0,
    signup_date: client.created_at,
    attribution_source: client.attribution_source || 'Unattributed',
    attribution_confidence: client.attribution_confidence || 0,
    attribution_method: client.attribution_method || 'none',
    attribution_sequence: client.attribution_sequence,
    attribution_days_diff: client.attribution_days_diff,
    attribution_invitation_code: client.attribution_invitation_code,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }));

  return batchUpsert('clients', transformedClients, onProgress);
}

export async function upsertAudits(
  audits: any[],
  onProgress?: (progress: { message: string; progress: number }) => void
): Promise<BatchOperationResult> {
  // Transform audits data to match database schema
  const transformedAudits = audits.map(audit => {
    // Handle referral source NULL mapping consistent with Phase 2 fixes
    let referralSource = audit.referral_source;
    if (referralSource === null || 
        referralSource === undefined || 
        referralSource === '' || 
        referralSource === 'null' ||
        referralSource === 'NULL' ||
        String(referralSource).trim() === '' ||
        String(referralSource).toLowerCase() === 'null') {
      referralSource = '999'; // Map to 'Unknown' category
    }
    
    return {
      id: audit.id,
      spotify_id: audit.spotify_id,
      artist_name: audit.artist_name,
      composer: audit.composer,
      email: audit.email,
      status: audit.status,
      referral_source: referralSource,
      has_sent_webhook: audit.has_sent_webhook,
      created_at: audit.created_at,
      updated_at: audit.updated_at
    };
  });

  return batchUpsert('audits', transformedAudits, onProgress);
}

export async function upsertConvrtLeads(
  convrtLeads: any[],
  onProgress?: (progress: { message: string; progress: number }) => void
): Promise<BatchOperationResult> {
  // Transform Convrt leads data to match database schema
  const transformedLeads = convrtLeads.map(lead => ({
    id: `convrt_${Date.now()}_${Math.random()}`,
    spotify_id: lead.spotify_id,
    artist_name: lead.artist_name,
    email: lead.email,
    method: lead.method, // 'report_link' or 'audit_link'
    status: lead.status,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }));

  return batchUpsert('convrt_leads', transformedLeads, onProgress);
}

export async function upsertThreads(
  threads: any[],
  onProgress?: (progress: { message: string; progress: number }) => void
): Promise<BatchOperationResult> {
  // Transform thread data to match database schema
  const transformedThreads = threads.map(thread => ({
    id: thread.id || `thread_${Date.now()}_${Math.random()}`,
    emails: thread.emails,
    contact_email: thread.contact_email,
    email_count: thread.emails ? thread.emails.length : 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }));

  return batchUpsert('threads', transformedThreads, onProgress);
}

// New function for Phase 2: Upsert sequence variants summary
export async function upsertSequenceVariants(
  variants: any[],
  onProgress?: (progress: { message: string; progress: number }) => void
): Promise<BatchOperationResult> {
  if (!variants || variants.length === 0) {
    return {
      success: true,
      processedCount: 0,
      errors: [],
      totalBatches: 0,
      completedBatches: 0
    };
  }

  // Transform sequence variants data to match database schema
  const transformedVariants = variants.map(variant => ({
    id: variant.variant_id || `variant_${Date.now()}_${Math.random()}`,
    variant_pattern: variant.variant_pattern,
    sequence_id: variant.sequence_id,
    sequence_name: variant.sequence_name,
    email_count: variant.email_count || 0,
    client_count: variant.client_count || 0,
    confidence_score: variant.confidence || 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }));

  return batchUpsert('sequence_variants', transformedVariants, onProgress);
}

// Process all data types in sequence
export async function processAllData(
  data: {
    contacts?: any[];
    clients?: any[];
    audits?: any[];
    convrtLeads?: any[];
    threads?: any[];
    sequenceVariants?: any[];
  },
  onProgress?: (progress: { message: string; progress: number }) => void
): Promise<{
  success: boolean;
  results: { [key: string]: BatchOperationResult };
  totalProcessed: number;
}> {
  const results: { [key: string]: BatchOperationResult } = {};
  let totalProcessed = 0;

  // Process contacts
  if (data.contacts) {
    onProgress?.({ message: 'Processing contacts...', progress: 10 });
    results.contacts = await upsertContacts(data.contacts, onProgress);
    totalProcessed += results.contacts.processedCount;
  }

  // Process clients
  if (data.clients) {
    onProgress?.({ message: 'Processing clients...', progress: 30 });
    results.clients = await upsertClients(data.clients, onProgress);
    totalProcessed += results.clients.processedCount;
  }

  // Process audits
  if (data.audits) {
    onProgress?.({ message: 'Processing audits...', progress: 50 });
    results.audits = await upsertAudits(data.audits, onProgress);
    totalProcessed += results.audits.processedCount;
  }

  // Process Convrt leads
  if (data.convrtLeads) {
    onProgress?.({ message: 'Processing Instagram leads...', progress: 70 });
    results.convrtLeads = await upsertConvrtLeads(data.convrtLeads, onProgress);
    totalProcessed += results.convrtLeads.processedCount;
  }

  // Process threads
  if (data.threads) {
    onProgress?.({ message: 'Processing email threads...', progress: 85 });
    results.threads = await upsertThreads(data.threads, onProgress);
    totalProcessed += results.threads.processedCount;
  }

  // Process sequence variants (Phase 2)
  if (data.sequenceVariants) {
    onProgress?.({ message: 'Processing sequence variants...', progress: 90 });
    results.sequenceVariants = await upsertSequenceVariants(data.sequenceVariants, onProgress);
    totalProcessed += results.sequenceVariants.processedCount;
  }

  onProgress?.({ message: 'Data processing complete', progress: 100 });

  // Check if all operations were successful
  const allSuccessful = Object.values(results).every(result => result.success);

  return {
    success: allSuccessful,
    results,
    totalProcessed
  };
}

// Utility functions for data retrieval
export async function getAttributionSummary(): Promise<{
  total_clients: number;
  attribution_breakdown: { [key: string]: number };
  revenue_breakdown: { [key: string]: number };
}> {
  const { data: clients, error } = await supabase
    .from('clients')
    .select('attribution_source, revenue');

  if (error) {
    throw new Error(`Failed to fetch attribution summary: ${error.message}`);
  }

  const attributionBreakdown: { [key: string]: number } = {};
  const revenueBreakdown: { [key: string]: number } = {};

  clients.forEach(client => {
    const source = client.attribution_source || 'Unattributed';
    attributionBreakdown[source] = (attributionBreakdown[source] || 0) + 1;
    revenueBreakdown[source] = (revenueBreakdown[source] || 0) + (client.revenue || 0);
  });

  return {
    total_clients: clients.length,
    attribution_breakdown: attributionBreakdown,
    revenue_breakdown: revenueBreakdown
  };
}

export async function getSequencePerformance(): Promise<{
  sequence_stats: { [key: string]: number };
  variant_stats: { [key: string]: number };
}> {
  const { data: clients, error } = await supabase
    .from('clients')
    .select('attribution_sequence, attribution_source')
    .not('attribution_sequence', 'is', null);

  if (error) {
    throw new Error(`Failed to fetch sequence performance: ${error.message}`);
  }

  const sequenceStats: { [key: string]: number } = {};
  const variantStats: { [key: string]: number } = {};

  clients.forEach(client => {
    if (client.attribution_sequence) {
      sequenceStats[client.attribution_sequence] = (sequenceStats[client.attribution_sequence] || 0) + 1;
    }
  });

  return {
    sequence_stats: sequenceStats,
    variant_stats: variantStats
  };
}

export async function getRevenueAnalytics(): Promise<{
  total_revenue: number;
  attributed_revenue: number;
  attribution_rate: number;
  pipeline_performance: { [key: string]: { clients: number; revenue: number } };
}> {
  const { data: clients, error } = await supabase
    .from('clients')
    .select('attribution_source, revenue');

  if (error) {
    throw new Error(`Failed to fetch revenue analytics: ${error.message}`);
  }

  const totalRevenue = clients.reduce((sum, client) => sum + (client.revenue || 0), 0);
  const attributedRevenue = clients
    .filter(client => client.attribution_source !== 'Unattributed')
    .reduce((sum, client) => sum + (client.revenue || 0), 0);

  const attributionRate = totalRevenue > 0 ? (attributedRevenue / totalRevenue) * 100 : 0;

  const pipelinePerformance: { [key: string]: { clients: number; revenue: number } } = {};
  
  clients.forEach(client => {
    const source = client.attribution_source || 'Unattributed';
    if (!pipelinePerformance[source]) {
      pipelinePerformance[source] = { clients: 0, revenue: 0 };
    }
    pipelinePerformance[source].clients += 1;
    pipelinePerformance[source].revenue += client.revenue || 0;
  });

  return {
    total_revenue: totalRevenue,
    attributed_revenue: attributedRevenue,
    attribution_rate: attributionRate,
    pipeline_performance: pipelinePerformance
  };
}