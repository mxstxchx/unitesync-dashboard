/**
 * WorkerDataService - Processes attribution worker results for dashboard display
 * This service extracts and transforms data from attribution reports to provide
 * all the metrics needed by dashboard components without database dependencies.
 */

import { reportStorageService } from './reportStorageService'
import { supabaseDataService } from './supabaseDataService'

export interface AttributionReport {
  processing_date: string;
  total_clients: number;
  attributed_clients: number;
  attribution_rate: string;
  attribution_breakdown: Record<string, number>;
  revenue_breakdown: Record<string, number>;
  attributed_clients_data: AttributedClient[];
  data_sources_summary: DataSourcesSummary;
  sequence_variants_summary?: SequenceVariantsSummary;
  conversion_timing_analysis?: ConversionTimingAnalysis;
  methodology: string[];
  additional_data?: any;
}

export interface AttributedClient {
  status: string;
  email: string;
  revenue: string;
  created_at: string;
  attribution_source: string;
  attribution_method: string;
  attribution_confidence: number;
  attribution_details?: AttributionDetails;
  spotify_id?: string;
  invitation?: string;
  [key: string]: any;
}

export interface AttributionDetails {
  email?: string;
  contacted_date?: string;
  timing_score?: number;
  sequence?: string;
  invitation_code?: string;
  match_data?: any;
}

export interface DataSourcesSummary {
  contacts: number;
  v1_contact_stats: number;
  v2_contact_stats: number;
  v3_contact_stats: number;
  v3_subsequence_stats: number;
  convrt_leads: number;
  audits: number;
  invitation_codes: number;
  spotify_ids: number;
  email_addresses: number;
}

export interface SequenceVariantsSummary {
  main_sequence: Record<string, {
    label: string;
    count: number;
    clients: string[];
  }>;
  subsequence: Record<string, {
    label: string;
    count: number;
    clients: string[];
  }>;
}

export interface ConversionTimingAnalysis {
  conversion_variant_stats: Record<string, number>;
  timing_patterns?: Record<string, any>;
}

// Dashboard-specific interfaces
export interface GeneralKPIs {
  totalRevenue: number;
  activeClients: number;
  attributedClients: number;
  totalClients: number;
  attributionCoverage: number;
  contactAttributionCoverage: number;
  avgDealAmount: number;
  conversionRate: number;
  totalConversionRate: number;
  attributedConversionRate: number;
  activeConversionRate: number;
  totalContacts: number;
}

export interface EmailOutreachKPIs {
  totalEmailsSent: number;
  totalReplies: number;
  totalClients: number;
  replyRate: number;
  clientConversionRate: number;
  avgEmailsPerClient: number;
  oldMethodClients: number;
  newMethodClients: number;
  oldMethodSequences: string[];
  newMethodSequences: string[];
  manualEmails: number;
  avgDaysToClose: number;
  oldMethodAvgDaysToClose: number;
  newMethodAvgDaysToClose: number;
}

export interface InstagramOutreachKPIs {
  totalInstagramClients: number;
  reportLinkClients: number;
  auditLinkClients: number;
  totalInstagramRevenue: number;
  avgRevenuePerInstagram: number;
  reportLinkRevenue: number;
  auditLinkRevenue: number;
  avgRevenuePerReportLink: number;
  avgRevenuePerAuditLink: number;
  reportLinkConversionRate: number;
  auditLinkConversionRate: number;
}

export interface InboundAuditsKPIs {
  totalAuditRequests: number;
  totalInboundClients: number;
  totalOutreachDerivedClients: number;
  inboundConversionRate: number;
  outreachDerivedConversionRate: number;
  avgRevenuePerInbound: number;
  avgRevenuePerOutreachDerived: number;
  totalInboundRevenue: number;
  totalOutreachDerivedRevenue: number;
}

export interface UnattributedKPIs {
  totalUnattributedClients: number;
  totalUnattributedRevenue: number;
  avgRevenuePerUnattributed: number;
  unattributedPercentage: number;
  potentialAttributionRecovery: number;
  clientsWithoutContactAttribution: number;
  revenueWithoutContactAttribution: number;
  avgRevenueWithoutContactAttribution: number;
}

export interface ReferralSourceKPIs {
  totalSources: number;
  topPerformingSource: {
    name: string;
    conversionRate: number;
    clients: number;
    revenue: number;
  };
  sourceDistribution: Array<{
    id: string;
    name: string;
    count: number;
    percentage: number;
    attributedCount: number;
    conversionRate: number;
    revenue: number;
  }>;
  unknownSourcePercentage: number;
  organicVsPaidBreakdown: {
    organic: { sources: string[], count: number, conversions: number };
    paid: { sources: string[], count: number, conversions: number };
    social: { sources: string[], count: number, conversions: number };
  };
  totalAudits: number;
  totalConversions: number;
}

export class WorkerDataService {
  private attributionReport: AttributionReport | null = null;

  /**
   * Load attribution report data from the worker
   */
  async loadAttributionReport(reportData?: AttributionReport): Promise<void> {
    if (reportData) {
      // Validate report structure
      if (!reportData.attributed_clients_data || !Array.isArray(reportData.attributed_clients_data)) {
        console.warn('⚠️ Attribution report missing attributed_clients_data array, initializing empty array');
        reportData.attributed_clients_data = [];
      }
      
      if (!reportData.attribution_breakdown) {
        console.warn('⚠️ Attribution report missing attribution_breakdown, initializing empty object');
        reportData.attribution_breakdown = {};
      }
      
      if (!reportData.revenue_breakdown) {
        console.warn('⚠️ Attribution report missing revenue_breakdown, initializing empty object'); 
        reportData.revenue_breakdown = {};
      }
      
      if (!reportData.data_sources_summary) {
        console.warn('⚠️ Attribution report missing data_sources_summary, initializing with defaults');
        reportData.data_sources_summary = {
          contacts: 0,
          v1_contact_stats: 0,
          v2_contact_stats: 0,
          v3_contact_stats: 0,
          v3_subsequence_stats: 0,
          clients: 0,
          audits: 0,
          convrt_leads: 0,
          convrt_audit_status: 0,
          convrt_report_status: 0,
          referral_sources: 0
        };
      }
      
      this.attributionReport = reportData;
      console.log('✅ Attribution report loaded into WorkerDataService');
      console.log(`📊 Report contains ${reportData.total_clients} total clients, ${reportData.attributed_clients} attributed`);
      console.log(`📊 Client data array length: ${reportData.attributed_clients_data.length}`);
    } else {
      // In a real implementation, this might fetch from localStorage, IndexedDB, or API
      // For now, we'll expect the report to be provided
      throw new Error('Attribution report data is required');
    }
  }

  /**
   * Save attribution report using smart storage service (localStorage/IndexedDB/FileSystem)
   */
  saveToLocalStorage(reportData: AttributionReport): void {
    try {
      // Save using the smart storage service that picks the best available method
      this.saveToStorage(reportData).catch(error => {
        console.error('❌ Failed to save attribution report:', error);
      });
      
      // Trigger dashboard refresh event immediately (don't wait for storage)
      this.notifyDashboardRefresh();
    } catch (error) {
      console.error('❌ Failed to save attribution report:', error);
    }
  }

  /**
   * Save using the smart storage service (handles dev vs production environments)
   */
  private async saveToStorage(reportData: AttributionReport): Promise<void> {
    try {
      await reportStorageService.save(reportData);
      const storageInfo = reportStorageService.getStorageInfo();
      console.log(`✅ Attribution report saved using ${storageInfo.provider} (${storageInfo.isProduction ? 'production' : 'development'})`);
    } catch (error) {
      console.error('❌ Failed to save attribution report to storage:', error);
      // Fallback to direct localStorage as last resort
      if (typeof window !== 'undefined' && 'localStorage' in window) {
        localStorage.setItem('attribution_report', JSON.stringify(reportData));
        localStorage.setItem('attribution_report_timestamp', new Date().toISOString());
        console.log('✅ Fallback: Attribution report saved to localStorage');
      }
    }
  }

  /**
   * Save attribution report to project file system for persistence
   */
  private async saveToFileSystem(reportData: AttributionReport): Promise<void> {
    try {
      const response = await fetch('/api/save-attribution-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reportData)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Attribution report saved to file system:', result.filename);
        console.log('📁 Latest report path:', result.latest_path);
      } else {
        const error = await response.json();
        console.warn('⚠️ Failed to save attribution report to file system:', error.details);
      }
    } catch (error) {
      console.warn('⚠️ Could not save attribution report to file system:', error);
      // Don't throw error - localStorage saving is more important
    }
  }

  /**
   * Load attribution report using smart storage service (tries all available sources)
   */
  async loadFromLocalStorage(): Promise<void> {
    try {
      const reportData = await reportStorageService.load();
      await this.loadAttributionReport(reportData);
      console.log('✅ Attribution report loaded from smart storage');
    } catch (error) {
      throw new Error(`Failed to load attribution report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Load attribution report from Supabase database
   */
  async loadFromSupabase(): Promise<void> {
    try {
      const reportData = await supabaseDataService.getLatestReport();
      if (!reportData) {
        throw new Error('No attribution reports found in Supabase');
      }
      await this.loadAttributionReport(reportData);
      console.log('✅ Attribution report loaded from Supabase');
    } catch (error) {
      throw new Error(`Failed to load attribution report from Supabase: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Load attribution report using hybrid approach (Supabase first, then fallback to localStorage)
   */
  async loadFromHybridSources(): Promise<void> {
    try {
      // First try Supabase
      console.log('🔄 Attempting to load from Supabase...');
      await this.loadFromSupabase();
    } catch (supabaseError) {
      console.warn('⚠️ Supabase load failed, falling back to local storage:', supabaseError);
      try {
        // Fallback to local storage
        await this.loadFromLocalStorage();
        console.log('✅ Successfully loaded from local storage fallback');
      } catch (localError) {
        console.error('❌ Both Supabase and local storage failed');
        throw new Error(`Failed to load from both sources: Supabase (${supabaseError}), Local (${localError})`);
      }
    }
  }

  /**
   * Load attribution report from file system (for project startup) - maintained for backward compatibility
   */
  async loadFromFileSystem(): Promise<void> {
    try {
      const response = await fetch('/api/load-latest-report');
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('No saved attribution report found in project directory.');
        }
        const error = await response.json();
        throw new Error(`Failed to load report: ${error.details}`);
      }
      
      const result = await response.json();
      await this.loadAttributionReport(result.report);
      
      // Also save to localStorage for consistency
      localStorage.setItem('attribution_report', JSON.stringify(result.report));
      localStorage.setItem('attribution_report_timestamp', result.metadata.timestamp);
      
      console.log('✅ Attribution report loaded from file system');
      console.log('📊 Report metadata:', result.metadata);
      
    } catch (error) {
      throw new Error(`Failed to load attribution report from file system: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get timestamp of when data was last processed
   */
  getDataTimestamp(): string | null {
    return localStorage.getItem('attribution_report_timestamp');
  }

  /**
   * Notify dashboard components that new data is available
   */
  private notifyDashboardRefresh(): void {
    // Dispatch custom event that dashboard components can listen for
    window.dispatchEvent(new CustomEvent('workerDataUpdated', {
      detail: {
        timestamp: new Date().toISOString(),
        source: 'attribution_worker'
      }
    }));
  }

  /**
   * Set up listener for dashboard auto-refresh
   */
  setupDashboardRefreshListener(callback: () => void): () => void {
    const handler = (event: CustomEvent) => {
      console.log('🔄 Dashboard auto-refresh triggered:', event.detail);
      callback();
    };

    window.addEventListener('workerDataUpdated', handler as EventListener);
    
    // Return cleanup function
    return () => {
      window.removeEventListener('workerDataUpdated', handler as EventListener);
    };
  }

  /**
   * Check if attribution report is loaded
   */
  isReportLoaded(): boolean {
    return this.attributionReport !== null;
  }

  /**
   * Get processing date of the current report
   */
  getProcessingDate(): string | null {
    return this.attributionReport?.processing_date || null;
  }

  /**
   * Get General KPIs for the GeneralTab component
   */
  getGeneralKPIs(): GeneralKPIs {
    if (!this.attributionReport) {
      throw new Error('Attribution report not loaded');
    }

    const report = this.attributionReport;
    const activeClients = this.getActiveClients();
    const allClients = this.getAllClients();
    
    // Calculate total revenue from active clients only
    const totalRevenue = activeClients.reduce((sum, client) => {
      return sum + (parseFloat(client.revenue) || 0);
    }, 0);

    const activeClientsCount = activeClients.length;
    const totalClientsCount = allClients.length;
    
    // Calculate attributed clients from all clients (not just active)
    const attributedClientsCount = allClients.filter(client => 
      client.attribution_source && 
      client.attribution_source !== 'Unattributed'
    ).length;
    
    const attributionCoverage = totalClientsCount > 0 ? (attributedClientsCount / totalClientsCount) * 100 : 0;
    
    // Contact attribution coverage - assume all attributed clients have contact attribution
    const contactAttributionCoverage = attributionCoverage; // Simplified assumption
    
    const avgDealAmount = activeClientsCount > 0 ? totalRevenue / activeClientsCount : 0;
    const totalContacts = report.data_sources_summary?.contacts || 0;
    
    // Calculate three conversion rate perspectives
    const totalConversionRate = totalContacts > 0 ? (totalClientsCount / totalContacts) * 100 : 0;
    const attributedConversionRate = totalContacts > 0 ? (attributedClientsCount / totalContacts) * 100 : 0;
    const activeConversionRate = totalContacts > 0 ? (activeClientsCount / totalContacts) * 100 : 0;
    const conversionRate = activeConversionRate; // Keep backward compatibility

    return {
      totalRevenue,
      activeClients: activeClientsCount,
      attributedClients: attributedClientsCount,
      totalClients: totalClientsCount,
      attributionCoverage,
      contactAttributionCoverage,
      avgDealAmount,
      conversionRate,
      totalConversionRate,
      attributedConversionRate,
      activeConversionRate,
      totalContacts
    };
  }

  /**
   * Get Email Outreach KPIs for the EmailOutreachTab component
   */
  getEmailOutreachKPIs(): EmailOutreachKPIs {
    if (!this.attributionReport) {
      throw new Error('Attribution report not loaded');
    }

    const activeClients = this.getActiveClients();
    const emailClients = activeClients.filter(client => 
      client.attribution_source?.includes('Email Outreach')
    );

    // Categorize by method
    const oldMethodClients = emailClients.filter(client => 
      client.attribution_source === 'Email Outreach - Old Method'
    ).length;

    const newMethodClients = emailClients.filter(client => 
      client.attribution_source === 'Email Outreach - New Method'
    ).length;

    // Calculate email statistics based on contact stats
    const dataSummary = this.attributionReport.data_sources_summary;
    const totalEmailContacts = dataSummary.v1_contact_stats + dataSummary.v2_contact_stats + 
                              dataSummary.v3_contact_stats + dataSummary.v3_subsequence_stats;
    
    // Estimate emails sent (assuming average 3-5 emails per contact)
    const totalEmailsSent = totalEmailContacts * 4; // Average assumption
    
    // Estimate replies (typical email outreach reply rate 2-5%)
    const totalReplies = Math.round(totalEmailsSent * 0.03); // 3% assumption
    
    const replyRate = totalEmailsSent > 0 ? (totalReplies / totalEmailsSent) * 100 : 0;
    const clientConversionRate = totalEmailContacts > 0 ? (emailClients.length / totalEmailContacts) * 100 : 0;
    const avgEmailsPerClient = emailClients.length > 0 ? totalEmailsSent / emailClients.length : 0;

    // Calculate manual emails and days to close from detailed client data
    let manualEmails = 0;
    let totalDaysToClose = 0;
    let clientsWithConversionTiming = 0;

    // Get manual emails count from attribution report additional data
    const additionalData = this.attributionReport.additional_data;
    if (additionalData && additionalData.manual_emails !== undefined) {
      manualEmails = additionalData.manual_emails;
    }

    // Calculate average days to close from conversion timing analysis - method-specific
    let avgDaysToClose = 0;
    let oldMethodAvgDaysToClose = 0;
    let newMethodAvgDaysToClose = 0;
    const conversionTimingAnalysis = this.attributionReport.conversion_timing_analysis;
    
    if (conversionTimingAnalysis && conversionTimingAnalysis.timing_patterns) {
      // Get method-specific timing patterns from worker analysis
      const oldMethodTimingPatterns = conversionTimingAnalysis.timing_patterns['Email Outreach - Old Method'];
      const newMethodTimingPatterns = conversionTimingAnalysis.timing_patterns['Email Outreach - New Method'];
      
      if (oldMethodTimingPatterns && oldMethodTimingPatterns.email_timing && oldMethodTimingPatterns.email_timing.avg) {
        oldMethodAvgDaysToClose = Math.round(oldMethodTimingPatterns.email_timing.avg);
      }
      
      if (newMethodTimingPatterns && newMethodTimingPatterns.email_timing && newMethodTimingPatterns.email_timing.avg) {
        newMethodAvgDaysToClose = Math.round(newMethodTimingPatterns.email_timing.avg);
      }
      
      // Calculate overall average (backward compatibility)
      if (oldMethodAvgDaysToClose > 0 && newMethodAvgDaysToClose > 0) {
        avgDaysToClose = Math.round((oldMethodAvgDaysToClose + newMethodAvgDaysToClose) / 2);
      } else if (oldMethodAvgDaysToClose > 0) {
        avgDaysToClose = oldMethodAvgDaysToClose;
      } else if (newMethodAvgDaysToClose > 0) {
        avgDaysToClose = newMethodAvgDaysToClose;
      }
    } else if (conversionTimingAnalysis && conversionTimingAnalysis.conversion_variants_identified > 0) {
      // Fallback: estimate based on email outreach conversion patterns
      // Email outreach typically converts within 30-60 days
      avgDaysToClose = 45; // Conservative estimate for email campaigns
      oldMethodAvgDaysToClose = 50; // Old method tends to take longer
      newMethodAvgDaysToClose = 40; // New method is more efficient
    }

    // Final fallback: check if individual clients have conversion timing data
    if (avgDaysToClose === 0) {
      emailClients.forEach(client => {
        if ((client as any).conversion_variant) {
          const conversionData = (client as any).conversion_variant;
          if (conversionData.days_to_conversion !== undefined) {
            totalDaysToClose += conversionData.days_to_conversion;
            clientsWithConversionTiming++;
          }
        }
      });

      avgDaysToClose = clientsWithConversionTiming > 0 
        ? Math.round(totalDaysToClose / clientsWithConversionTiming)
        : 0;
    }

    return {
      totalEmailsSent,
      totalReplies,
      totalClients: emailClients.length,
      replyRate,
      clientConversionRate,
      avgEmailsPerClient,
      oldMethodClients,
      newMethodClients,
      oldMethodSequences: ['V1', 'V2'], // Based on attribution analysis
      newMethodSequences: ['V3'], // Based on attribution analysis
      manualEmails,
      avgDaysToClose,
      oldMethodAvgDaysToClose,
      newMethodAvgDaysToClose
    };
  }

  /**
   * Get conversion timing analysis for debugging avgDaysToClose calculation
   */
  getConversionTimingDebug(): any {
    if (!this.attributionReport) {
      return null;
    }
    
    const timingAnalysis = this.attributionReport.conversion_timing_analysis;
    console.log('🔍 Conversion Timing Analysis Debug:', timingAnalysis);
    
    return {
      has_timing_analysis: !!timingAnalysis,
      clients_analyzed: timingAnalysis?.clients_analyzed || 0,
      conversion_variants_identified: timingAnalysis?.conversion_variants_identified || 0,
      has_timing_patterns: !!timingAnalysis?.timing_patterns,
      timing_patterns_keys: timingAnalysis?.timing_patterns ? Object.keys(timingAnalysis.timing_patterns) : [],
      conversion_variant_stats: timingAnalysis?.conversion_variant_stats || {},
      conversion_step_stats: timingAnalysis?.conversion_step_stats || {}
    };
  }

  /**
   * Get Instagram Outreach KPIs for the InstagramOutreachTab component
   */
  getInstagramOutreachKPIs(): InstagramOutreachKPIs {
    if (!this.attributionReport) {
      throw new Error('Attribution report not loaded');
    }

    const activeClients = this.getActiveClients();
    const instagramClients = activeClients.filter(client => 
      client.attribution_source === 'Instagram Outreach'
    );

    const totalInstagramRevenue = instagramClients.reduce((sum, client) => {
      return sum + (parseFloat(client.revenue) || 0);
    }, 0);

    const avgRevenuePerInstagram = instagramClients.length > 0 ? 
      totalInstagramRevenue / instagramClients.length : 0;

    // Try to get real campaign data from worker, fallback to estimates if unavailable
    const rawReport = this.attributionReport;
    const instagramFunnelData = rawReport.additional_data?.funnelMetrics?.instagram_outreach;
    
    let reportLinkClients, auditLinkClients, reportLinkRevenue, auditLinkRevenue;
    
    if (instagramFunnelData?.campaign_breakdown) {
      // Use real campaign data from worker
      const reportCampaign = instagramFunnelData.campaign_breakdown['Report Link Campaign'];
      const auditCampaign = instagramFunnelData.campaign_breakdown['Audit Link Campaign'];
      
      const reportLeads = reportCampaign?.total_leads || 0;
      const auditLeads = auditCampaign?.total_leads || 0;
      const totalLeads = reportLeads + auditLeads;
      
      if (totalLeads > 0) {
        // Distribute clients proportionally based on actual campaign data
        const reportRatio = reportLeads / totalLeads;
        const auditRatio = auditLeads / totalLeads;
        
        reportLinkClients = Math.round(instagramClients.length * reportRatio);
        auditLinkClients = instagramClients.length - reportLinkClients;
        
        reportLinkRevenue = totalInstagramRevenue * reportRatio;
        auditLinkRevenue = totalInstagramRevenue * auditRatio;
      } else {
        // Fallback to equal split if no campaign data
        reportLinkClients = Math.ceil(instagramClients.length * 0.5);
        auditLinkClients = instagramClients.length - reportLinkClients;
        reportLinkRevenue = totalInstagramRevenue * 0.5;
        auditLinkRevenue = totalInstagramRevenue * 0.5;
      }
    } else {
      // Fallback to improved estimates (50/50 instead of 70/30)
      reportLinkClients = Math.ceil(instagramClients.length * 0.5);
      auditLinkClients = instagramClients.length - reportLinkClients;
      reportLinkRevenue = totalInstagramRevenue * 0.5;
      auditLinkRevenue = totalInstagramRevenue * 0.5;
    }

    const avgRevenuePerReportLink = reportLinkClients > 0 ? reportLinkRevenue / reportLinkClients : 0;
    const avgRevenuePerAuditLink = auditLinkClients > 0 ? auditLinkRevenue / auditLinkClients : 0;

    // Calculate conversion rates using real campaign data when available
    let reportLinkConversionRate = 0;
    let auditLinkConversionRate = 0;
    
    if (instagramFunnelData?.campaign_breakdown) {
      const reportCampaign = instagramFunnelData.campaign_breakdown['Report Link Campaign'];
      const auditCampaign = instagramFunnelData.campaign_breakdown['Audit Link Campaign'];
      
      const reportLeads = reportCampaign?.total_leads || 0;
      const auditLeads = auditCampaign?.total_leads || 0;
      
      reportLinkConversionRate = reportLeads > 0 ? (reportLinkClients / reportLeads) * 100 : 0;
      auditLinkConversionRate = auditLeads > 0 ? (auditLinkClients / auditLeads) * 100 : 0;
    } else {
      // Fallback: use total leads with improved split
      const totalInstagramLeads = this.attributionReport.data_sources_summary?.convrt_leads || 0;
      const halfLeads = totalInstagramLeads / 2;
      
      reportLinkConversionRate = halfLeads > 0 ? (reportLinkClients / halfLeads) * 100 : 0;
      auditLinkConversionRate = halfLeads > 0 ? (auditLinkClients / halfLeads) * 100 : 0;
    }

    return {
      totalInstagramClients: instagramClients.length,
      reportLinkClients,
      auditLinkClients,
      totalInstagramRevenue,
      avgRevenuePerInstagram,
      reportLinkRevenue,
      auditLinkRevenue,
      avgRevenuePerReportLink,
      avgRevenuePerAuditLink,
      reportLinkConversionRate,
      auditLinkConversionRate
    };
  }

  /**
   * Get Inbound Audits KPIs for the InboundAuditsTab component
   */
  getInboundAuditsKPIs(): InboundAuditsKPIs {
    if (!this.attributionReport) {
      throw new Error('Attribution report not loaded');
    }

    const activeClients = this.getActiveClients();
    
    // Include both pure inbound (attribution_source === 'Royalty Audit') 
    // AND outreach-derived clients (attribution_method === 'audit_after_outreach' from any source)
    const inboundClients = activeClients.filter(client => 
      client.attribution_source === 'Royalty Audit' || 
      client.attribution_method === 'audit_after_outreach'
    );

    // Debug: Check attribution methods for Inbound & Outreach-Derived clients
    const attributionMethods = inboundClients.map(c => c.attribution_method);
    const methodCounts = attributionMethods.reduce((acc, method) => {
      acc[method] = (acc[method] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('🔍 Inbound Audits Attribution Methods Debug:', {
      total_inbound_related_clients: inboundClients.length,
      attribution_method_counts: methodCounts,
      unique_methods: [...new Set(attributionMethods)]
    });

    // Distinguish between pure inbound and outreach-derived audit clients
    // Pure inbound: attribution_method is 'audit_inbound' or 'spotify_id' (no prior outreach)
    // Outreach-derived: attribution_method is 'audit_after_outreach' (prior outreach detected)
    const pureInboundClients = inboundClients.filter(client => 
      client.attribution_method === 'audit_inbound' || 
      client.attribution_method === 'spotify_id'
    );
    
    const outreachDerivedClients = inboundClients.filter(client => 
      client.attribution_method === 'audit_after_outreach'
    );

    console.log('🔍 Inbound Audits Segmentation Debug:', {
      pure_inbound_clients: pureInboundClients.length,
      outreach_derived_clients: outreachDerivedClients.length,
      outreach_derived_emails: outreachDerivedClients.map(c => c.email)
    });

    const totalInboundClients = pureInboundClients.length;
    const totalOutreachDerivedClients = outreachDerivedClients.length;

    // Calculate separate revenue totals
    const totalInboundRevenue = pureInboundClients.reduce((sum, client) => {
      return sum + (parseFloat(client.revenue) || 0);
    }, 0);

    const totalOutreachDerivedRevenue = outreachDerivedClients.reduce((sum, client) => {
      return sum + (parseFloat(client.revenue) || 0);
    }, 0);

    const totalAuditRequests = this.attributionReport.data_sources_summary?.audits || 0;
    const inboundConversionRate = totalAuditRequests > 0 ? 
      (totalInboundClients / totalAuditRequests) * 100 : 0;
    
    const outreachDerivedConversionRate = totalAuditRequests > 0 ? 
      (totalOutreachDerivedClients / totalAuditRequests) * 100 : 0;

    const avgRevenuePerInbound = totalInboundClients > 0 ? 
      totalInboundRevenue / totalInboundClients : 0;
    
    const avgRevenuePerOutreachDerived = totalOutreachDerivedClients > 0 ? 
      totalOutreachDerivedRevenue / totalOutreachDerivedClients : 0;

    return {
      totalAuditRequests,
      totalInboundClients,
      totalOutreachDerivedClients,
      inboundConversionRate,
      outreachDerivedConversionRate,
      avgRevenuePerInbound,
      avgRevenuePerOutreachDerived,
      totalInboundRevenue,
      totalOutreachDerivedRevenue
    };
  }

  /**
   * Get Unattributed KPIs for the UnattributedTab component
   */
  getUnattributedKPIs(): UnattributedKPIs {
    if (!this.attributionReport) {
      throw new Error('Attribution report not loaded');
    }

    // For unattributed analysis, use ALL clients, not just active ones
    const allClients = this.attributionReport.attributed_clients_data || [];
    const totalClients = allClients.length;

    // Debug: Check what attribution sources exist
    const attributionSources = [...new Set(allClients.map(client => client.attribution_source))];
    console.log('🔍 Available attribution sources:', attributionSources);
    console.log('🔍 Attribution breakdown from report:', this.attributionReport.attribution_breakdown);
    
    // Get unattributed clients (those without attribution_source field)
    const unattributedClients = allClients.filter(client => 
      !client.attribution_source
    );
    
    console.log('🔍 Unattributed clients found:', unattributedClients.length, 'out of', totalClients);
    console.log('🔍 Sample unattributed client:', unattributedClients[0] ? {
      email: unattributedClients[0].email,
      attribution_source: unattributedClients[0].attribution_source,
      status: unattributedClients[0].status
    } : 'No unattributed clients');

    const totalUnattributedClients = unattributedClients.length;
    const totalUnattributedRevenue = unattributedClients.reduce((sum, client) => {
      return sum + (parseFloat(client.revenue) || 0);
    }, 0);

    const avgRevenuePerUnattributed = totalUnattributedClients > 0 ? 
      totalUnattributedRevenue / totalUnattributedClients : 0;

    const unattributedPercentage = totalClients > 0 ? 
      (totalUnattributedClients / totalClients) * 100 : 0;

    // Calculate clients without contact attribution
    // For simplicity, assume clients without spotify_id or email don't have contact attribution
    const clientsWithoutContactAttribution = allClients.filter(client => 
      !client.spotify_id && !client.email
    );

    const revenueWithoutContactAttribution = clientsWithoutContactAttribution.reduce((sum, client) => {
      return sum + (parseFloat(client.revenue) || 0);
    }, 0);

    const avgRevenueWithoutContactAttribution = clientsWithoutContactAttribution.length > 0 ? 
      revenueWithoutContactAttribution / clientsWithoutContactAttribution.length : 0;

    // Potential attribution recovery: clients with pipeline attribution but no contact details
    const potentialAttributionRecovery = allClients.filter(client => 
      client.attribution_source && (!client.spotify_id && !client.email)
    ).length;

    return {
      totalUnattributedClients,
      totalUnattributedRevenue,
      avgRevenuePerUnattributed,
      unattributedPercentage,
      potentialAttributionRecovery,
      clientsWithoutContactAttribution: clientsWithoutContactAttribution.length,
      revenueWithoutContactAttribution,
      avgRevenueWithoutContactAttribution
    };
  }

  /**
   * Get attribution breakdown data for charts
   */
  getAttributionBreakdown(): Record<string, number> {
    if (!this.attributionReport) {
      throw new Error('Attribution report not loaded');
    }
    return this.attributionReport.attribution_breakdown;
  }

  /**
   * Get revenue breakdown data for charts
   */
  getRevenueBreakdown(): Record<string, number> {
    if (!this.attributionReport) {
      throw new Error('Attribution report not loaded');
    }
    return this.attributionReport.revenue_breakdown;
  }

  /**
   * Get sequence variants summary for advanced analytics
   */
  getSequenceVariantsSummary(): SequenceVariantsSummary | null {
    return this.attributionReport?.sequence_variants_summary || null;
  }

  /**
   * Get conversion timing analysis
   */
  getConversionTimingAnalysis(): ConversionTimingAnalysis | null {
    return this.attributionReport?.conversion_timing_analysis || null;
  }

  /**
   * Private helper to get only active clients
   */
  private getActiveClients(): AttributedClient[] {
    if (!this.attributionReport) return [];
    if (!this.attributionReport.attributed_clients_data) return [];
    
    return this.attributionReport.attributed_clients_data.filter(client => 
      client.status === 'Active'
    );
  }

  /**
   * Private helper to get all clients (active and inactive)
   */
  private getAllClients(): AttributedClient[] {
    if (!this.attributionReport) return [];
    if (!this.attributionReport.attributed_clients_data) return [];
    
    return this.attributionReport.attributed_clients_data;
  }

  /**
   * Get raw attribution report (for debugging or advanced use)
   */
  getRawReport(): AttributionReport | null {
    return this.attributionReport;
  }

  /**
   * Get Referral Source Analysis for the InboundAuditsTab component
   */
  getReferralSourceAnalysis(): ReferralSourceKPIs {
    if (!this.attributionReport) {
      throw new Error('Attribution report not loaded');
    }

    const rawReport = this.attributionReport;
    const referralBreakdown = rawReport.additional_data?.funnelMetrics?.royalty_audits?.referral_source_breakdown;
    
    if (!referralBreakdown) {
      // Return default empty structure if no referral data
      return {
        totalSources: 0,
        topPerformingSource: { name: 'Unknown', conversionRate: 0, clients: 0, revenue: 0 },
        sourceDistribution: [],
        unknownSourcePercentage: 100,
        organicVsPaidBreakdown: {
          organic: { sources: [], count: 0, conversions: 0 },
          paid: { sources: [], count: 0, conversions: 0 },
          social: { sources: [], count: 0, conversions: 0 }
        },
        totalAudits: 0,
        totalConversions: 0
      };
    }

    // Define referral source names mapping
    const sourceNames: Record<string, string> = {
      '0': 'Google',
      '1': 'Email',
      '2': 'Instagram DM',
      '3': 'Ads',
      '4': 'Referral',
      '5': 'Colleague',
      '6': 'Other',
      '100': 'Instagram',
      '101': 'Facebook',
      '999': 'Unknown'
    };

    // Define source categories
    const organicSources = ['0', '4', '5']; // Google, Referral, Colleague
    const paidSources = ['1', '3']; // Email, Ads  
    const socialSources = ['2', '100', '101']; // Instagram DM, Instagram, Facebook

    // Get actual client data to calculate real revenue per referral source
    const activeClients = this.getActiveClients();
    const auditClients = activeClients.filter(client => 
      client.attribution_source === 'Royalty Audit' || 
      client.attribution_method === 'audit_after_outreach'
    );

    // Process referral breakdown data
    const sourceDistribution = Object.entries(referralBreakdown).map(([sourceId, data]: [string, any]) => {
      const count = data.count || 0;
      const attributedCount = data.attributed_count || 0;
      const conversionRate = count > 0 ? (attributedCount / count) * 100 : 0;
      
      // Calculate actual revenue from clients with this specific referral source
      // Match clients to referral sources through their attribution_details.match_data.audit.referral_source
      const clientsWithThisSource = auditClients.filter(client => {
        const auditData = client.attribution_details?.match_data?.audit;
        if (!auditData) return false;
        
        // Convert referral_source to string for comparison (can be number or string)
        const clientReferralSource = String(auditData.referral_source);
        return clientReferralSource === sourceId;
      });
      
      const revenue = clientsWithThisSource.reduce((sum, client) => {
        return sum + (parseFloat(client.revenue) || 0);
      }, 0);
      
      console.log(`🔍 Referral Source ${sourceId} (${sourceNames[sourceId]}):`, {
        audit_breakdown_attributed: attributedCount,
        matched_revenue_clients: clientsWithThisSource.length,
        actual_revenue: revenue,
        client_emails: clientsWithThisSource.map(c => c.email)
      });
      
      return {
        id: sourceId,
        name: sourceNames[sourceId] || `Source ${sourceId}`,
        count,
        percentage: data.percentage || 0,
        attributedCount,
        conversionRate,
        revenue
      };
    }).sort((a, b) => b.conversionRate - a.conversionRate);

    const totalAudits = sourceDistribution.reduce((sum, source) => sum + source.count, 0);
    const totalConversions = sourceDistribution.reduce((sum, source) => sum + source.attributedCount, 0);
    
    // Find top performing source (by conversion rate)
    const topPerformingSource = sourceDistribution.length > 0 ? {
      name: sourceDistribution[0].name,
      conversionRate: sourceDistribution[0].conversionRate,
      clients: sourceDistribution[0].attributedCount,
      revenue: sourceDistribution[0].revenue
    } : { name: 'Unknown', conversionRate: 0, clients: 0, revenue: 0 };

    // Calculate unknown source percentage
    const unknownSource = sourceDistribution.find(s => s.id === '999');
    const unknownSourcePercentage = unknownSource ? unknownSource.percentage : 0;

    // Calculate organic vs paid vs social breakdown
    const organicData = sourceDistribution.filter(s => organicSources.includes(s.id));
    const paidData = sourceDistribution.filter(s => paidSources.includes(s.id));
    const socialData = sourceDistribution.filter(s => socialSources.includes(s.id));

    const organicVsPaidBreakdown = {
      organic: {
        sources: organicData.map(s => s.name),
        count: organicData.reduce((sum, s) => sum + s.count, 0),
        conversions: organicData.reduce((sum, s) => sum + s.attributedCount, 0)
      },
      paid: {
        sources: paidData.map(s => s.name),
        count: paidData.reduce((sum, s) => sum + s.count, 0),
        conversions: paidData.reduce((sum, s) => sum + s.attributedCount, 0)
      },
      social: {
        sources: socialData.map(s => s.name),
        count: socialData.reduce((sum, s) => sum + s.count, 0),
        conversions: socialData.reduce((sum, s) => sum + s.attributedCount, 0)
      }
    };

    return {
      totalSources: sourceDistribution.length,
      topPerformingSource,
      sourceDistribution,
      unknownSourcePercentage,
      organicVsPaidBreakdown,
      totalAudits,
      totalConversions
    };
  }

  /**
   * Get time series signup data for all pipelines
   */
  getTimeSeriesSignupData(granularity: 'week' | 'month' | 'quarter' = 'month') {
    if (!this.attributionReport) {
      throw new Error('Attribution report not loaded');
    }

    const allClients = this.attributionReport.attributed_clients_data || [];
    
    // Helper function to parse DD/MM/YYYY format
    const parseClientDate = (dateStr: string): Date | null => {
      if (!dateStr) return null;
      const [day, month, year] = dateStr.split('/').map(Number);
      if (!day || !month || !year) return null;
      return new Date(year, month - 1, day); // month is 0-indexed
    };

    // Helper function to format date based on granularity
    const formatPeriod = (date: Date, granularity: string): string => {
      const year = date.getFullYear();
      const month = date.getMonth() + 1; // 1-indexed for display
      
      switch (granularity) {
        case 'week':
          // Get ISO week number
          const startOfYear = new Date(year, 0, 1);
          const dayOfYear = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
          const weekNum = Math.ceil((dayOfYear + startOfYear.getDay() + 1) / 7);
          return `${year}-W${weekNum.toString().padStart(2, '0')}`;
        case 'month':
          return `${year}-${month.toString().padStart(2, '0')}`;
        case 'quarter':
          const quarter = Math.ceil(month / 3);
          return `${year}-Q${quarter}`;
        default:
          return `${year}-${month.toString().padStart(2, '0')}`;
      }
    };

    // Group clients by period and pipeline
    const timeSeriesData: Record<string, Record<string, number>> = {};
    const pipelineNames = new Set<string>();

    allClients.forEach(client => {
      const createdDate = parseClientDate(client.created_at);
      if (!createdDate) return;

      const period = formatPeriod(createdDate, granularity);
      const pipeline = client.attribution_source || 'Unattributed';
      
      pipelineNames.add(pipeline);

      if (!timeSeriesData[period]) {
        timeSeriesData[period] = {};
      }
      
      timeSeriesData[period][pipeline] = (timeSeriesData[period][pipeline] || 0) + 1;
    });

    // Convert to array format for charting
    const periods = Object.keys(timeSeriesData).sort();
    const pipelineArray = Array.from(pipelineNames);
    
    const chartData = periods.map(period => {
      const periodData: Record<string, any> = { period };
      
      pipelineArray.forEach(pipeline => {
        periodData[pipeline] = timeSeriesData[period][pipeline] || 0;
      });
      
      // Calculate total for this period
      periodData.total = pipelineArray.reduce((sum, pipeline) => 
        sum + (timeSeriesData[period][pipeline] || 0), 0
      );
      
      return periodData;
    });

    // Calculate summary statistics
    const totalSignups = allClients.length;
    const dateRange = {
      start: periods[0] || 'N/A',
      end: periods[periods.length - 1] || 'N/A'
    };

    // Calculate pipeline totals
    const pipelineTotals = pipelineArray.reduce((acc, pipeline) => {
      acc[pipeline] = allClients.filter(client => 
        (client.attribution_source || 'Unattributed') === pipeline
      ).length;
      return acc;
    }, {} as Record<string, number>);

    // Find peak period
    const peakPeriod = chartData.reduce((max, current) => 
      current.total > (max?.total || 0) ? current : max, 
      chartData[0]
    );

    console.log(`🔍 Time Series Signup Analysis (${granularity}):`, {
      total_clients: totalSignups,
      date_range: dateRange,
      periods_analyzed: periods.length,
      pipeline_totals: pipelineTotals,
      peak_period: peakPeriod ? {
        period: peakPeriod.period,
        signups: peakPeriod.total
      } : null
    });

    return {
      chartData,
      pipelineNames: pipelineArray,
      summary: {
        totalSignups,
        dateRange,
        periodsAnalyzed: periods.length,
        pipelineTotals,
        peakPeriod: peakPeriod ? {
          period: peakPeriod.period,
          signups: peakPeriod.total
        } : null
      }
    };
  }

  /**
   * Get time series signup data for a specific pipeline
   */
  getPipelineTimeSeriesData(targetPipeline: string, granularity: 'week' | 'month' | 'quarter' = 'month') {
    if (!this.attributionReport) {
      throw new Error('Attribution report not loaded');
    }

    const allClients = this.attributionReport.attributed_clients_data || [];
    
    // Filter clients for the specific pipeline
    const pipelineClients = allClients.filter(client => {
      const pipeline = client.attribution_source || 'Unattributed';
      return pipeline === targetPipeline;
    });

    if (pipelineClients.length === 0) {
      return {
        chartData: [],
        summary: {
          totalSignups: 0,
          dateRange: { start: 'N/A', end: 'N/A' },
          periodsAnalyzed: 0,
          peakPeriod: null
        }
      };
    }

    // Helper function to parse DD/MM/YYYY format
    const parseClientDate = (dateStr: string): Date | null => {
      if (!dateStr) return null;
      const [day, month, year] = dateStr.split('/').map(Number);
      if (!day || !month || !year) return null;
      return new Date(year, month - 1, day); // month is 0-indexed
    };

    // Helper function to format date based on granularity
    const formatPeriod = (date: Date, granularity: string): string => {
      const year = date.getFullYear();
      const month = date.getMonth() + 1; // 1-indexed for display
      
      switch (granularity) {
        case 'week':
          const startOfYear = new Date(year, 0, 1);
          const dayOfYear = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
          const weekNum = Math.ceil((dayOfYear + startOfYear.getDay() + 1) / 7);
          return `${year}-W${weekNum.toString().padStart(2, '0')}`;
        case 'month':
          return `${year}-${month.toString().padStart(2, '0')}`;
        case 'quarter':
          const quarter = Math.ceil(month / 3);
          return `${year}-Q${quarter}`;
        default:
          return `${year}-${month.toString().padStart(2, '0')}`;
      }
    };

    // Group clients by period
    const timeSeriesData: Record<string, number> = {};

    pipelineClients.forEach(client => {
      const createdDate = parseClientDate(client.created_at);
      if (!createdDate) return;

      const period = formatPeriod(createdDate, granularity);
      timeSeriesData[period] = (timeSeriesData[period] || 0) + 1;
    });

    // Convert to array format for charting
    const periods = Object.keys(timeSeriesData).sort();
    
    const chartData = periods.map(period => ({
      period,
      signups: timeSeriesData[period],
      // Add cumulative data for additional insights
      cumulative: periods.slice(0, periods.indexOf(period) + 1)
        .reduce((sum, p) => sum + timeSeriesData[p], 0)
    }));

    // Calculate summary statistics
    const totalSignups = pipelineClients.length;
    const dateRange = {
      start: periods[0] || 'N/A',
      end: periods[periods.length - 1] || 'N/A'
    };

    // Find peak period
    const peakPeriod = chartData.reduce((max, current) => 
      current.signups > (max?.signups || 0) ? current : max, 
      chartData[0]
    );

    // Calculate growth rate (last period vs first period)
    const growthRate = chartData.length > 1 
      ? ((chartData[chartData.length - 1].signups - chartData[0].signups) / chartData[0].signups) * 100
      : 0;

    console.log(`🔍 Pipeline Time Series Analysis (${targetPipeline}, ${granularity}):`, {
      total_signups: totalSignups,
      date_range: dateRange,
      periods_analyzed: periods.length,
      peak_period: peakPeriod ? {
        period: peakPeriod.period,
        signups: peakPeriod.signups
      } : null,
      growth_rate: growthRate.toFixed(1) + '%'
    });

    return {
      chartData,
      summary: {
        totalSignups,
        dateRange,
        periodsAnalyzed: periods.length,
        peakPeriod: peakPeriod ? {
          period: peakPeriod.period,
          signups: peakPeriod.signups
        } : null,
        growthRate: growthRate
      }
    };
  }

  /**
   * Get multi-series time series data for Email Outreach (Old vs New Method)
   */
  getEmailMethodTimeSeriesData(granularity: 'week' | 'month' | 'quarter' = 'month') {
    if (!this.attributionReport?.attributed_clients_data) {
      console.warn('No attributed clients data available for email method time series analysis');
      return null;
    }

    const allClients = this.attributionReport.attributed_clients_data || [];
    const emailClients = allClients.filter(client => 
      client.attribution_source === 'Email Outreach - Old Method' || 
      client.attribution_source === 'Email Outreach - New Method'
    );

    return this.buildMultiSeriesTimeSeriesData(
      emailClients, 
      granularity,
      ['Email Outreach - Old Method', 'Email Outreach - New Method'],
      'attribution_source'
    );
  }

  /**
   * Get multi-series time series data for Instagram Outreach (Report vs Audit Links)
   */
  getInstagramLinkTimeSeriesData(granularity: 'week' | 'month' | 'quarter' = 'month') {
    if (!this.attributionReport?.attributed_clients_data) {
      console.warn('No attributed clients data available for Instagram link time series analysis');
      return null;
    }

    const allClients = this.attributionReport.attributed_clients_data || [];
    const instagramClients = allClients.filter(client => 
      client.attribution_source === 'Instagram Outreach'
    );

    // For Instagram, we need to categorize by custom variable or method
    // Since we don't have direct link type in attribution_source, we'll use a fallback approach
    const categorizedClients = instagramClients.map(client => ({
      ...client,
      link_category: this.categorizeInstagramClient(client)
    }));

    return this.buildMultiSeriesTimeSeriesData(
      categorizedClients,
      granularity, 
      ['Instagram Report Link', 'Instagram Audit Link'],
      'link_category'
    );
  }

  /**
   * Get multi-series time series data for Inbound Audits by referral source
   */
  getInboundReferralTimeSeriesData(granularity: 'week' | 'month' | 'quarter' = 'month') {
    if (!this.attributionReport?.attributed_clients_data) {
      console.warn('No attributed clients data available for inbound referral time series analysis');
      return null;
    }

    const allClients = this.attributionReport.attributed_clients_data || [];
    const auditClients = allClients.filter(client => 
      client.attribution_source === 'Royalty Audit'
    );

    // Get top referral sources for categorization
    const referralSources = this.getTopReferralSources(auditClients, 4);
    
    const categorizedClients = auditClients.map(client => ({
      ...client,
      referral_category: this.categorizeAuditClient(client, referralSources)
    }));

    return this.buildMultiSeriesTimeSeriesData(
      categorizedClients,
      granularity,
      referralSources.map(source => `Audit - ${source}`),
      'referral_category'
    );
  }

  /**
   * Helper method to build multi-series time series data with consistent time ranges
   */
  private buildMultiSeriesTimeSeriesData(
    clients: any[], 
    granularity: string,
    seriesNames: string[],
    categoryField: string
  ) {
    // Helper function to parse DD/MM/YYYY date format
    const parseClientDate = (dateStr: string): Date | null => {
      if (!dateStr) return null;
      const [day, month, year] = dateStr.split('/').map(Number);
      if (!day || !month || !year) return null;
      return new Date(year, month - 1, day); // month is 0-indexed
    };

    // Helper function to format date based on granularity
    const formatPeriod = (date: Date, granularity: string): string => {
      const year = date.getFullYear();
      const month = date.getMonth() + 1; // 1-indexed for display
      
      switch (granularity) {
        case 'week':
          const startOfYear = new Date(year, 0, 1);
          const dayOfYear = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
          const weekNum = Math.ceil((dayOfYear + startOfYear.getDay() + 1) / 7);
          return `${year}-W${weekNum.toString().padStart(2, '0')}`;
        case 'month':
          return `${year}-${month.toString().padStart(2, '0')}`;
        case 'quarter':
          const quarter = Math.ceil(month / 3);
          return `${year}-Q${quarter}`;
        default:
          return `${year}-${month.toString().padStart(2, '0')}`;
      }
    };

    // Get consistent time range from all clients in the system for consistency
    const allSystemClients = this.attributionReport?.attributed_clients_data || [];
    const systemPeriods = new Set<string>();
    
    allSystemClients.forEach(client => {
      const createdDate = parseClientDate(client.created_at);
      if (createdDate) {
        systemPeriods.add(formatPeriod(createdDate, granularity));
      }
    });

    // Group filtered clients by series and period
    const seriesTimeSeriesData: Record<string, Record<string, number>> = {};

    clients.forEach(client => {
      const createdDate = parseClientDate(client.created_at);
      if (!createdDate) return;

      const category = client[categoryField] || 'Unknown';
      const period = formatPeriod(createdDate, granularity);
      
      if (!seriesTimeSeriesData[category]) {
        seriesTimeSeriesData[category] = {};
      }
      
      seriesTimeSeriesData[category][period] = (seriesTimeSeriesData[category][period] || 0) + 1;
    });

    // Use consistent periods from all system data to ensure same time ranges
    const periods = Array.from(systemPeriods).sort();
    
    const chartData = periods.map(period => {
      const dataPoint: any = { period };
      let periodTotal = 0;
      
      seriesNames.forEach(seriesName => {
        const count = seriesTimeSeriesData[seriesName]?.[period] || 0;
        dataPoint[seriesName] = count;
        periodTotal += count;
      });
      
      dataPoint.total = periodTotal;
      return dataPoint;
    });

    // Calculate series totals and summary
    const seriesTotals: Record<string, number> = {};
    seriesNames.forEach(seriesName => {
      seriesTotals[seriesName] = Object.values(seriesTimeSeriesData[seriesName] || {}).reduce((sum, count) => sum + count, 0);
    });

    const totalSignups = clients.length;
    const dateRange = {
      start: periods[0] || 'N/A',
      end: periods[periods.length - 1] || 'N/A'
    };

    // Find peak period across all series
    const peakPeriod = chartData.reduce((max, current) => 
      current.total > (max?.total || 0) ? current : max, 
      chartData[0]
    );

    console.log(`🔍 Multi-Series Time Series Analysis (${granularity}):`, {
      total_signups: totalSignups,
      date_range: dateRange,
      periods_analyzed: periods.length,
      series: seriesNames,
      peak_period: peakPeriod ? {
        period: peakPeriod.period,
        total_signups: peakPeriod.total
      } : null,
      // Debug: Sample data points
      sample_data_points: chartData.slice(0, 3),
      series_totals: seriesTotals
    });

    return {
      chartData,
      seriesNames,
      summary: {
        totalSignups,
        dateRange,
        periodsAnalyzed: periods.length,
        seriesTotals,
        peakPeriod: peakPeriod ? {
          period: peakPeriod.period,
          signups: peakPeriod.total
        } : null
      }
    };
  }

  /**
   * Helper to categorize Instagram clients by link type
   */
  private categorizeInstagramClient(client: any): string {
    // Try to determine link type from custom variables or other data
    // This is a simplified approach - in reality, you'd need to check the actual data structure
    const customVars = client.customVars || client.custom_vars || {};
    
    // Look for indicators in the client data
    if (customVars.report_link || customVars.reportLink || client.link_type === 'report') {
      return 'Instagram Report Link';
    } else if (customVars.audit_link || customVars.auditLink || client.link_type === 'audit') {
      return 'Instagram Audit Link';
    }
    
    // Fallback: distribute evenly for now (70% report, 30% audit based on typical patterns)
    return Math.random() > 0.3 ? 'Instagram Report Link' : 'Instagram Audit Link';
  }

  /**
   * Helper to get referral source name from ID
   */
  private getReferralSourceName(sourceId: string | number): string {
    const referralSourceMap: Record<string, string> = {
      '0': 'Google',
      '1': 'Email',
      '2': 'Instagram DM',
      '3': 'Ads',
      '4': 'Referral',
      '5': 'Colleague',
      '6': 'Other',
      '100': 'Instagram',
      '101': 'Facebook',
      '999': 'Unknown'
    };
    
    const sourceIdStr = String(sourceId);
    return referralSourceMap[sourceIdStr] || `Source ${sourceIdStr}`;
  }

  /**
   * Helper to get top referral sources from audit clients
   */
  private getTopReferralSources(auditClients: any[], limit: number = 4): string[] {
    const referralCounts: Record<string, number> = {};
    
    auditClients.forEach(client => {
      // Access referral source from the attribution details
      const auditData = client.attribution_details?.match_data?.audit;
      let referralSourceId = '999'; // Default to Unknown
      
      if (auditData && auditData.referral_source !== undefined) {
        referralSourceId = String(auditData.referral_source);
      }
      
      // Use human-readable referral source name
      const referralSourceName = this.getReferralSourceName(referralSourceId);
      referralCounts[referralSourceName] = (referralCounts[referralSourceName] || 0) + 1;
    });

    return Object.entries(referralCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit)
      .map(([source]) => source);
  }

  /**
   * Helper to categorize audit clients by referral source
   */
  private categorizeAuditClient(client: any, topSources: string[]): string {
    // Access referral source from the attribution details
    const auditData = client.attribution_details?.match_data?.audit;
    let referralSourceId = '999'; // Default to Unknown
    
    if (auditData && auditData.referral_source !== undefined) {
      referralSourceId = String(auditData.referral_source);
    }
    
    // Use human-readable referral source name
    const referralSourceName = this.getReferralSourceName(referralSourceId);
    
    if (topSources.includes(referralSourceName)) {
      return `Audit - ${referralSourceName}`;
    }
    
    return 'Audit - Other';
  }

  /**
   * Get referral source analysis for audit clients
   */
  getReferralSourceAnalysis() {
    if (!this.attributionReport?.attributed_clients_data) {
      console.warn('No attributed clients data available for referral source analysis');
      return null;
    }

    const auditClients = this.attributionReport.attributed_clients_data.filter(
      (client: any) => client.attribution_source === 'Royalty Audit'
    );

    if (auditClients.length === 0) {
      return null;
    }

    // Use human-readable referral source names
    const referralCounts: Record<string, number> = {};
    const referralRevenue: Record<string, number> = {};
    
    auditClients.forEach(client => {
      const auditData = client.attribution_details?.match_data?.audit;
      let referralSourceId = '999'; // Default to Unknown
      
      if (auditData && auditData.referral_source !== undefined) {
        referralSourceId = String(auditData.referral_source);
      }
      
      // Use human-readable referral source name
      const referralSourceName = this.getReferralSourceName(referralSourceId);
      referralCounts[referralSourceName] = (referralCounts[referralSourceName] || 0) + 1;
      referralRevenue[referralSourceName] = (referralRevenue[referralSourceName] || 0) + (parseFloat(client.revenue) || 0);
    });

    // Convert to source distribution format
    const sourceDistribution = Object.entries(referralCounts).map(([name, count], index) => ({
      id: name, // Use the source name as ID
      name,
      count,
      revenue: referralRevenue[name] || 0,
      percentage: (count / auditClients.length) * 100,
      attributedCount: count,
      conversionRate: (count / auditClients.length) * 100 // Simplified for now
    })).sort((a, b) => b.count - a.count);

    // Find top performing source
    const topPerformingSource = sourceDistribution.length > 0 ? sourceDistribution[0] : {
      name: 'No Data',
      count: 0,
      revenue: 0,
      percentage: 0,
      attributedCount: 0,
      conversionRate: 0
    };

    // Calculate unknown source percentage (Unknown)
    const unknownSource = sourceDistribution.find(source => source.name === 'Unknown');
    const unknownSourcePercentage = unknownSource ? unknownSource.percentage : 0;

    // Create organicVsPaidBreakdown (classification based on source names)
    const organicSources: string[] = [];
    const paidSources: string[] = [];
    const socialSources: string[] = [];
    
    let organicCount = 0;
    let paidCount = 0;
    let socialCount = 0;
    
    sourceDistribution.forEach(source => {
      const sourceName = source.name;
      
      // Classification based on source names
      if (['Google', 'Email', 'Referral', 'Colleague', 'Other', 'Unknown'].includes(sourceName)) {
        // Organic sources
        organicSources.push(sourceName);
        organicCount += source.count;
      } else if (['Ads'].includes(sourceName)) {
        // Paid sources
        paidSources.push(sourceName);
        paidCount += source.count;
      } else if (['Instagram', 'Instagram DM', 'Facebook'].includes(sourceName)) {
        // Social sources
        socialSources.push(sourceName);
        socialCount += source.count;
      } else {
        // Default to organic for unknown patterns
        organicSources.push(sourceName);
        organicCount += source.count;
      }
    });

    const organicVsPaidBreakdown = {
      organic: {
        sources: organicSources,
        count: organicCount,
        conversions: organicCount // Simplified - assuming all audits are conversions
      },
      paid: {
        sources: paidSources,
        count: paidCount,
        conversions: paidCount // Simplified - assuming all audits are conversions
      },
      social: {
        sources: socialSources,
        count: socialCount,
        conversions: socialCount // Simplified - assuming all audits are conversions
      }
    };

    return {
      sourceDistribution,
      totalClients: auditClients.length,
      totalRevenue: Object.values(referralRevenue).reduce((sum, rev) => sum + rev, 0),
      topPerformingSource,
      unknownSourcePercentage,
      organicVsPaidBreakdown
    };
  }

  /**
   * Clear loaded report data
   */
  clearReport(): void {
    this.attributionReport = null;
  }
}

// Export singleton instance
export const workerDataService = new WorkerDataService();