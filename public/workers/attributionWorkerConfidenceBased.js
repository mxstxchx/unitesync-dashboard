// Invitation-First Attribution Worker - Correct Implementation
// Implements invitation-code-first attribution with timing validation

// Import Supabase for data persistence (with robust error handling)
let supabase = null;
let supabaseClient = null;
let supabaseAvailable = false;

try {
  // Try multiple CDN sources for better reliability
  const cdnSources = [
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js',
    'https://unpkg.com/@supabase/supabase-js@2/dist/umd/supabase.js'
  ];
  
  let loaded = false;
  for (const cdnUrl of cdnSources) {
    try {
      importScripts(cdnUrl);
      supabase = self.supabase;
      if (supabase && typeof supabase.createClient === 'function') {
        console.log('✅ Supabase library loaded successfully from:', cdnUrl);
        supabaseAvailable = true;
        loaded = true;
        break;
      }
    } catch (cdnError) {
      console.warn(`⚠️ Failed to load from ${cdnUrl}:`, cdnError.message);
    }
  }
  
  if (!loaded) {
    throw new Error('All CDN sources failed');
  }
} catch (error) {
  console.warn('⚠️ Failed to load Supabase library in worker:', error.message);
  console.log('ℹ️ Worker will continue without Supabase functionality - attribution results will only be saved locally');
  supabaseAvailable = false;
}

// Supabase data persistence functions
const SupabaseUtils = {
  // Initialize Supabase client with provided config
  initializeClient(config) {
    if (!supabaseAvailable) {
      console.warn('⚠️ Supabase library not available, skipping client initialization');
      return false;
    }
    
    if (!config.url || !config.anonKey) {
      console.error('❌ Supabase URL and anon key are required');
      return false;
    }
    
    try {
      supabaseClient = supabase.createClient(config.url, config.anonKey);
      console.log('✅ Supabase client initialized in worker');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Supabase client:', error.message);
      return false;
    }
  },

  // Save attribution report to Supabase
  async saveAttributionReport(reportData) {
    if (!supabaseAvailable) {
      throw new Error('Supabase library not available');
    }
    
    if (!supabaseClient) {
      throw new Error('Supabase client not initialized');
    }

    console.log('💾 Saving attribution report to Supabase...');
    
    try {
      // Save main attribution report
      const { data: reportRecord, error: reportError } = await supabaseClient
        .from('attribution_reports')
        .insert({
          report_data: reportData,
          generated_at: new Date().toISOString(),
          total_clients: reportData.summary?.total_clients || 0,
          attributed_clients: reportData.summary?.attributed_clients || 0,
          attribution_rate: reportData.summary?.attribution_rate || 0
        })
        .select()
        .single();

      if (reportError) {
        throw new Error(`Failed to save attribution report: ${reportError.message}`);
      }

      console.log('✅ Attribution report saved with ID:', reportRecord.id);

      // Save individual client attributions
      if (reportData.clients && reportData.clients.length > 0) {
        const clientRecords = reportData.clients.map(client => ({
          report_id: reportRecord.id,
          client_email: client.email,
          pipeline: client.pipeline,
          confidence_score: client.confidence_score,
          attribution_details: client.attribution_details,
          revenue_amount: client.revenue || 0,
          signup_date: client.date_added
        }));

        const { error: clientsError } = await supabaseClient
          .from('client_attributions')
          .insert(clientRecords);

        if (clientsError) {
          console.error('❌ Failed to save client attributions:', clientsError.message);
        } else {
          console.log('✅ Saved', clientRecords.length, 'client attributions');
        }
      }

      // Save data source summary
      if (reportData.summary?.sources) {
        const sourceRecords = Object.entries(reportData.summary.sources).map(([source, data]) => ({
          report_id: reportRecord.id,
          source_name: source,
          total_count: data.total || 0,
          attributed_count: data.attributed || 0,
          attribution_rate: data.rate || 0
        }));

        const { error: sourcesError } = await supabaseClient
          .from('data_source_summaries')
          .insert(sourceRecords);

        if (sourcesError) {
          console.error('❌ Failed to save data source summaries:', sourcesError.message);
        } else {
          console.log('✅ Saved', sourceRecords.length, 'data source summaries');
        }
      }

      return reportRecord.id;
    } catch (error) {
      console.error('❌ Error saving to Supabase:', error);
      throw error;
    }
  }
};

// Core attribution utility functions
const AttributionUtils = {
  // Extract invitation code from report links (both UUID and non-UUID formats)
  extractInvitationCode(reportLink) {
    if (!reportLink) return null;
    
    // Try UUID first (invite.unitesync.com format)
    const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    const uuidMatch = reportLink.match(uuidPattern);
    if (uuidMatch) return uuidMatch[0];
    
    // Try extracting after /report/ for non-UUID codes (pub.unitesync.com format)
    const reportMatch = reportLink.match(/\/report\/([a-zA-Z0-9_-]+)/);
    if (reportMatch) return reportMatch[1];
    
    return null;
  },

  // Extract Spotify ID from various URL formats
  extractSpotifyId(url) {
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
  },

  // Parse client date format (DD/MM/YYYY) to Date object
  parseClientDate(dateStr) {
    if (!dateStr) return null;
    
    const [day, month, year] = dateStr.split('/');
    return new Date(`${year}-${month}-${day}T12:00:00Z`);
  },

  // Parse Salesforce date format (ISO string) to Date object
  parseSalesforceDate(dateStr) {
    if (!dateStr) return null;
    
    const date = new Date(dateStr);
    date.setUTCHours(12, 0, 0, 0); // Normalize to avoid timezone issues
    return date;
  },

  // Calculate days difference between two dates
  daysDifference(date1, date2) {
    const timeDiff = date2.getTime() - date1.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  },

  // Determine pipeline from contact sequence version
  determineEmailPipeline(contactStat) {
    // V1/V2 → Old Method, V3 → New Method
    const fromEmail = contactStat['From email'] || '';
    const contactDate = this.parseSalesforceDate(contactStat['Contacted date']);
    
    // Use timing as primary indicator
    if (contactDate) {
      // V3 started around March 2025
      const v3CutoffDate = new Date('2025-03-01T00:00:00Z');
      if (contactDate >= v3CutoffDate) {
        return 'Email Outreach - New Method';
      }
    }
    
    // Fallback to email domain analysis
    if (fromEmail.includes('beunitesync') || fromEmail.includes('techunitesync')) {
      return 'Email Outreach - New Method';
    }
    
    return 'Email Outreach - Old Method';
  },

  // Determine campaign from Convrt data
  determineConvrtCampaign(convrtData) {
    // Based on method field or campaign analysis
    if (convrtData.method === 'report_link') {
      return 'Instagram Outreach';
    } else if (convrtData.method === 'audit_link') {
      return 'Instagram Outreach';
    }
    return 'Instagram Outreach';
  }
};

// Invitation-First Attribution Processor
class ConfidenceBasedAttributionProcessor {
  constructor() {
    this.progressCallback = null;
    
    // Data sources
    this.contacts = [];
    this.clients = [];
    this.audits = [];
    this.convrtLeads = [];
    this.sequences = [];
    this.threads = [];
    this.convrtAuditStatus = [];
    this.convrtReportStatus = [];
    
    // Statistics by sequence version
    this.v1ContactStats = [];
    this.v2ContactStats = [];
    this.v3ContactStats = [];
    this.v3SubsequenceStats = [];
    this.inboundAuditStats = [];
    this.referralSources = [];
    
    // Attribution indexes for fast lookup
    this.invitationIndex = new Map();
    this.spotifyIndex = new Map();
    this.emailIndex = new Map();
  }

  setProgressCallback(callback) {
    this.progressCallback = callback;
  }

  reportProgress(message, progress) {
    if (this.progressCallback) {
      this.progressCallback({ message, progress });
    }
  }

  // Main attribution processing function
  async processAttribution(data) {
    console.log('🔍 Starting Invitation-First Attribution Processing');
    
    // Step 1: Load all data sources
    this.reportProgress('Loading all data sources...', 0);
    await this.loadAllDataSources(data);
    
    // Step 2: Build attribution indexes
    this.reportProgress('Building attribution indexes...', 10);
    await this.buildAttributionIndexes();
    
    // Step 3: Process confidence-based attribution
    this.reportProgress('Processing confidence-based attribution...', 30);
    const results = await this.processConfidenceBasedAttribution();
    
    // Step 4: Enhanced thread fetching for Email Outreach - New Method
    this.reportProgress('Fetching detailed thread information...', 60);
    const enhancedResults = await this.fetchDetailedThreads(results);
    
    // Step 5: Process additional data types for comprehensive dashboard
    this.reportProgress('Processing sequence statistics, labels, and Instagram leads...', 80);
    const additionalData = await this.processAdditionalDataTypes(data, enhancedResults);
    
    // Step 6: Generate comprehensive final report
    this.reportProgress('Generating final report...', 90);
    const finalReport = await this.generateFinalReport(enhancedResults, additionalData);
    
    this.reportProgress('Attribution processing complete', 100);
    return finalReport;
  }

  // Load all data sources
  async loadAllDataSources(data) {
    this.contacts = data.contacts || [];
    this.clients = data.clients || [];
    this.audits = data.audits || [];
    this.convrtLeads = data.convrtLeads || [];
    this.sequences = data.sequences || [];
    this.threads = data.threads || [];
    // Extract response arrays from Convrt JSON data (handle both direct arrays and wrapped objects)
    this.convrtAuditStatus = Array.isArray(data.convrtAuditStatus) 
      ? data.convrtAuditStatus 
      : (data.convrtAuditStatus?.response || []);
    this.convrtReportStatus = Array.isArray(data.convrtReportStatus) 
      ? data.convrtReportStatus 
      : (data.convrtReportStatus?.response || []);
    
    // Load statistics
    this.v1ContactStats = data.v1ContactStats || [];
    this.v2ContactStats = data.v2ContactStats || [];
    this.v3ContactStats = data.v3ContactStats || [];
    this.v3SubsequenceStats = data.v3SubsequenceStats || [];
    this.inboundAuditStats = data.inboundAuditStats || [];
    this.referralSources = data.referralSources || [];
    
    console.log('📊 Loaded data sources:');
    console.log(`   Contacts: ${this.contacts.length}`);
    console.log(`   Clients: ${this.clients.length}`);
    console.log(`   V1 Stats: ${this.v1ContactStats.length}`);
    console.log(`   V2 Stats: ${this.v2ContactStats.length}`);
    console.log(`   V3 Stats: ${this.v3ContactStats.length}`);
    console.log(`   V3 Subsequence Stats: ${this.v3SubsequenceStats.length}`);
    console.log(`   Audit Stats: ${this.inboundAuditStats.length}`);
    console.log(`   Convrt Leads: ${this.convrtLeads.length}`);
    console.log(`   Audits: ${this.audits.length}`);
    console.log(`   Referral Sources: ${this.referralSources.length}`);
  }

  // Build attribution indexes for fast lookups
  async buildAttributionIndexes() {
    console.log('🔍 Building attribution indexes...');
    
    // 1. Build invitation code index from Salesforge contacts
    let salesforgeInvitations = 0;
    for (const contact of this.contacts) {
      const reportLink = contact.customVars?.report_link;
      const invitationCode = AttributionUtils.extractInvitationCode(reportLink);
      
      if (invitationCode) {
        salesforgeInvitations++;
        if (!this.invitationIndex.has(invitationCode)) {
          this.invitationIndex.set(invitationCode, []);
        }
        this.invitationIndex.get(invitationCode).push({
          source: 'salesforge',
          contact: contact,
          pipeline: this.determinePipelineFromContact(contact),
          reportLink: reportLink
        });
      }
    }
    
    // 2. Build invitation code index from Convrt leads
    let convrtInvitations = 0;
    for (const lead of this.convrtLeads) {
      // Check all potential URL fields for invitation codes
      const urlFields = [
        lead.report_url,
        lead.report_link, 
        lead.artist_spotify_url,
        lead.spotify_url,
        lead.link // Additional field that might contain invitation codes
      ];
      
      let foundInvitationCode = null;
      let foundUrl = null;
      
      // Try to extract invitation code from each URL field
      for (const url of urlFields) {
        if (url) {
          const invitationCode = AttributionUtils.extractInvitationCode(url);
          if (invitationCode) {
            foundInvitationCode = invitationCode;
            foundUrl = url;
            break; // Use first valid invitation code found
          }
        }
      }
      
      if (foundInvitationCode) {
        convrtInvitations++;
        if (!this.invitationIndex.has(foundInvitationCode)) {
          this.invitationIndex.set(foundInvitationCode, []);
        }
        this.invitationIndex.get(foundInvitationCode).push({
          source: 'convrt',
          lead: lead,
          pipeline: 'Instagram Outreach',
          reportUrl: foundUrl
        });
      }
    }
    
    // 3. Build Spotify ID index from all sources
    let spotifyMatches = 0;
    
    // From Salesforge contacts - Check all Spotify fields
    for (const contact of this.contacts) {
      const spotifyFields = [
        'spotify_id',
        'artist_spotify_id', // Added field found in actual data
        'artistspotifyurl', 
        'spotify_artist_url',
        'artist_spotify_url'
      ];
      
      let spotifyId = null;
      let spotifyUrl = null;
      
      // First check if we already have a direct spotify_id or artist_spotify_id
      if (contact.spotify_id) {
        spotifyId = contact.spotify_id;
      } else if (contact.artist_spotify_id) {
        spotifyId = contact.artist_spotify_id;
      } else if (contact.customVars) {
        // Check customVars for Spotify URLs
        for (const field of spotifyFields) {
          const value = contact.customVars[field];
          if (value) {
            const extractedId = AttributionUtils.extractSpotifyId(value);
            if (extractedId) {
              spotifyId = extractedId;
              spotifyUrl = value;
              break;
            }
          }
        }
      }
      
      if (spotifyId) {
        spotifyMatches++;
        if (!this.spotifyIndex.has(spotifyId)) {
          this.spotifyIndex.set(spotifyId, []);
        }
        this.spotifyIndex.get(spotifyId).push({
          source: 'salesforge',
          contact: contact,
          pipeline: this.determinePipelineFromContact(contact),
          spotifyUrl: spotifyUrl || null
        });
      }
    }
    
    // From Convrt leads - Extract from artist_spotify_url field (not artist_id)
    for (const lead of this.convrtLeads) {
      const spotifyId = AttributionUtils.extractSpotifyId(lead.artist_spotify_url);
      
      if (spotifyId) {
        if (!this.spotifyIndex.has(spotifyId)) {
          this.spotifyIndex.set(spotifyId, []);
        }
        this.spotifyIndex.get(spotifyId).push({
          source: 'convrt',
          lead: lead,
          pipeline: 'Instagram Outreach',
          spotifyId: spotifyId,
          spotifyUrl: lead.artist_spotify_url
        });
      }
    }
    
    // From audits
    for (const audit of this.audits) {
      const spotifyId = audit.spotify_id;
      
      if (spotifyId) {
        if (!this.spotifyIndex.has(spotifyId)) {
          this.spotifyIndex.set(spotifyId, []);
        }
        this.spotifyIndex.get(spotifyId).push({
          source: 'audit',
          audit: audit,
          pipeline: 'Royalty Audit',
          spotifyId: spotifyId
        });
      }
    }
    
    // 4. Build email index from contact statistics
    const allContactStats = [
      ...this.v1ContactStats,
      ...this.v2ContactStats,
      ...this.v3ContactStats,
      ...this.v3SubsequenceStats
    ];
    
    for (const stat of allContactStats) {
      const email = stat['Contact email address'];
      if (email) {
        if (!this.emailIndex.has(email)) {
          this.emailIndex.set(email, []);
        }
        this.emailIndex.get(email).push({
          source: 'contact_stats',
          stat: stat,
          pipeline: AttributionUtils.determineEmailPipeline(stat)
        });
      }
    }
    
    console.log('📊 Attribution indexes built:');
    console.log(`   Invitation codes: ${this.invitationIndex.size} (${salesforgeInvitations} Salesforge, ${convrtInvitations} Convrt)`);
    console.log(`   Spotify IDs: ${this.spotifyIndex.size} (${spotifyMatches} total matches)`);
    console.log(`   Email addresses: ${this.emailIndex.size}`);
    
    // Debug: Show sample invitation codes
    if (this.invitationIndex.size > 0) {
      const sampleCodes = Array.from(this.invitationIndex.keys()).slice(0, 3);
      console.log('🔍 Sample invitation codes:', sampleCodes);
    }
    
    // Debug: Show sample client invitation codes
    const clientsWithInvitations = this.clients.filter(c => c.invitation_code || c.invitation);
    console.log(`📊 Clients with invitation codes: ${clientsWithInvitations.length}`);
    if (clientsWithInvitations.length > 0) {
      const sampleClientCodes = clientsWithInvitations.slice(0, 3).map(c => c.invitation_code || c.invitation);
      console.log('🔍 Sample client invitation codes:', sampleClientCodes);
    }
    
    // Debug: Show Instagram leads data
    console.log(`📊 Instagram leads: ${this.convrtLeads.length}`);
    if (this.convrtLeads.length > 0) {
      const sampleLead = this.convrtLeads[0];
      console.log('🔍 Sample Instagram lead structure:', Object.keys(sampleLead));
      console.log('🔍 Sample Instagram lead artist_spotify_url:', sampleLead.artist_spotify_url);
      console.log('🔍 Extracted Spotify ID:', AttributionUtils.extractSpotifyId(sampleLead.artist_spotify_url));
    }
    
    // Debug: Show client Spotify IDs
    const clientsWithSpotify = this.clients.filter(c => c.spotify_id);
    console.log(`📊 Clients with Spotify IDs: ${clientsWithSpotify.length}`);
    if (clientsWithSpotify.length > 0) {
      const sampleClientSpotify = clientsWithSpotify.slice(0, 3).map(c => c.spotify_id);
      console.log('🔍 Sample client Spotify IDs:', sampleClientSpotify);
    }
    
    // Debug: Check Instagram Spotify ID overlap
    const instagramSpotifyIds = this.convrtLeads
      .map(lead => AttributionUtils.extractSpotifyId(lead.artist_spotify_url))
      .filter(Boolean);
    console.log(`📊 Instagram Spotify IDs found: ${instagramSpotifyIds.length}`);
    if (instagramSpotifyIds.length > 0) {
      const sampleInstagramSpotify = instagramSpotifyIds.slice(0, 3);
      console.log('🔍 Sample Instagram Spotify IDs:', sampleInstagramSpotify);
    }
    
    // Debug: Check for overlapping Spotify IDs
    const clientSpotifyIds = new Set(clientsWithSpotify.map(c => c.spotify_id));
    const instagramSpotifyIdSet = new Set(instagramSpotifyIds);
    const overlappingIds = [...clientSpotifyIds].filter(id => instagramSpotifyIdSet.has(id));
    console.log(`📊 Overlapping Spotify IDs (Client ∩ Instagram): ${overlappingIds.length}`);
    if (overlappingIds.length > 0) {
      console.log('🔍 Sample overlapping Spotify IDs:', overlappingIds.slice(0, 3));
    }
  }

  // Main confidence-based waterfall attribution logic
  async processConfidenceBasedAttribution() {
    const results = {
      'Email Outreach - Old Method': [],
      'Email Outreach - New Method': [],
      'Instagram Outreach': [],
      'Royalty Audit': [],
      'Unattributed': []
    };

    console.log('🔍 Starting Confidence-Based Waterfall Attribution');
    console.log('📊 Total clients to process:', this.clients.length);

    let method_counts = {
      email_timing: 0,
      invitation_code: 0,
      spotify_id: 0,
      audit_after_outreach: 0,
      audit_inbound: 0,
      unattributed: 0
    };

    for (const client of this.clients) {
      const clientSignupDate = AttributionUtils.parseClientDate(client.signup_date || client.created_at);
      if (!clientSignupDate) {
        results['Unattributed'].push(client);
        method_counts.unattributed++;
        continue;
      }

      // Collect all potential attribution matches
      const potentialAttributions = [];

      // 1. Check email timing match (highest confidence: 0.90)
      const emailTimingMatch = await this.findEmailTimingMatch(client, clientSignupDate);
      if (emailTimingMatch) {
        potentialAttributions.push(emailTimingMatch);
      }

      // 2. Check invitation code match (confidence: 0.85)
      const invitationMatch = await this.findInvitationCodeMatch(client, clientSignupDate);
      if (invitationMatch) {
        potentialAttributions.push(invitationMatch);
      }

      // 3. Check Spotify ID match (confidence: 0.80)
      const spotifyMatch = await this.findSpotifyMatch(client, clientSignupDate);
      if (spotifyMatch) {
        potentialAttributions.push(spotifyMatch);
      }

      // 4. Check audit match (with audit-after-outreach logic)
      const auditMatch = await this.findAuditMatch(client, clientSignupDate);
      if (auditMatch) {
        potentialAttributions.push(auditMatch);
      }

      // CRITICAL FIX: Cross-reference outreach + audit for outreach-derived attribution
      // If client has both outreach match AND audit request, it should be outreach-derived
      const hasOutreachMatch = potentialAttributions.some(attr => 
        attr.method === 'email_timing' || attr.method === 'invitation_code' || 
        (attr.method === 'spotify_id' && attr.source !== 'Royalty Audit')
      );
      
      if (hasOutreachMatch && auditMatch && auditMatch.method === 'audit_inbound') {
        // Find the original outreach match
        const outreachMatch = potentialAttributions.find(attr => 
          attr.method === 'email_timing' || attr.method === 'invitation_code' || 
          (attr.method === 'spotify_id' && attr.source !== 'Royalty Audit')
        );
        
        if (outreachMatch) {
          // Replace audit_inbound with audit_after_outreach attributed to outreach pipeline
          const auditAfterOutreachMatch = {
            source: outreachMatch.source,
            method: 'audit_after_outreach',
            confidence: 0.75, // Higher than pure audit (0.70), lower than direct outreach
            details: {
              original_outreach: outreachMatch,
              audit_date: auditMatch.details.audit_date,
              timing_score: auditMatch.details.timing_score,
              audit_data: auditMatch.details.audit_data
            }
          };
          
          // Remove the original outreach and audit matches, add the combined one
          const filteredAttributions = potentialAttributions.filter(attr => 
            attr !== outreachMatch && attr !== auditMatch
          );
          filteredAttributions.push(auditAfterOutreachMatch);
          potentialAttributions.length = 0;
          potentialAttributions.push(...filteredAttributions);
        }
      }

      // Select the best attribution based on highest confidence
      const bestAttribution = this.selectBestAttribution(potentialAttributions);

      if (bestAttribution) {
        const pipeline = this.normalizePipeline(bestAttribution.source);
        
        // Ensure pipeline exists in results
        if (!results[pipeline]) {
          console.error(`❌ Invalid pipeline: ${bestAttribution.source} -> ${pipeline}`);
          results['Unattributed'].push(client);
          method_counts.unattributed++;
        } else {
          results[pipeline].push({
            ...client,
            attribution_source: pipeline,
            attribution_method: bestAttribution.method,
            attribution_confidence: bestAttribution.confidence,
            attribution_details: bestAttribution.details
          });
          
          method_counts[bestAttribution.method]++;
          // console.log(`✅ ${bestAttribution.method} (${bestAttribution.confidence}): ${client.email} -> ${pipeline}`);
        }
      } else {
        results['Unattributed'].push(client);
        method_counts.unattributed++;
      }
    }

    console.log('📊 Confidence-Based Attribution Results:');
    // console.log(`   Email Timing (0.90): ${method_counts.email_timing}`);
    // console.log(`   Invitation Code (0.85): ${method_counts.invitation_code}`);
    // console.log(`   Spotify ID (0.80): ${method_counts.spotify_id}`);
    console.log(`   Audit After Outreach (0.75): ${method_counts.audit_after_outreach}`);
    // console.log(`   Audit Inbound (0.70): ${method_counts.audit_inbound}`);
    console.log(`   Unattributed: ${method_counts.unattributed}`);
    console.log(`   Old Method: ${results['Email Outreach - Old Method'].length}`);
    console.log(`   New Method: ${results['Email Outreach - New Method'].length}`);
    console.log(`   Instagram: ${results['Instagram Outreach'].length}`);
    console.log(`   Audit: ${results['Royalty Audit'].length}`);
    console.log(`   Unattributed: ${results['Unattributed'].length}`);

    return results;
  }

  // Enhanced thread fetching for all email-based pipelines
  async fetchDetailedThreads(results) {
    console.log('🔍 COMPREHENSIVE THREAD FETCHING - Starting detailed thread fetching for all email-based pipelines');
    this.reportProgress('Starting comprehensive thread fetching for variant and step analysis...', 60);
    
    // Store results for use in processDetailedThreadData
    this.currentResults = results;
    
    // Collect clients from all email-based pipelines
    const newMethodClients = results['Email Outreach - New Method'] || [];
    const oldMethodClients = results['Email Outreach - Old Method'] || [];
    const auditClients = results['Royalty Audit'] || [];
    
    const allEmailClients = [
      ...newMethodClients.map(client => ({ ...client, pipeline: 'Email Outreach - New Method', analysisType: 'variant+step' })),
      ...oldMethodClients.map(client => ({ ...client, pipeline: 'Email Outreach - Old Method', analysisType: 'step' })),
      ...auditClients.map(client => ({ ...client, pipeline: 'Royalty Audit', analysisType: 'step' }))
    ];
    
    if (allEmailClients.length === 0) {
      console.log('📊 No email-based pipeline clients found, skipping thread fetching');
      return;
    }
    
    console.log(`📊 COMPREHENSIVE THREAD FETCHING - Found ${allEmailClients.length} email-based clients:`);
    console.log(`   • Email Outreach - New Method: ${newMethodClients.length} (variant + step analysis)`);
    console.log(`   • Email Outreach - Old Method: ${oldMethodClients.length} (step analysis)`);
    console.log(`   • Royalty Audit: ${auditClients.length} (step analysis)`);
    // Reduced logging: Comment out detailed client breakdown
    // console.log(`📊 Client breakdown:`);
    // allEmailClients.slice(0, 5).forEach((client, i) => {
    //   console.log(`   ${i + 1}. ${client.email} (pipeline: ${client.pipeline}, analysis: ${client.analysisType})`);
    // });
    // if (allEmailClients.length > 5) {
    //   console.log(`   ... and ${allEmailClients.length - 5} more clients`);
    // }
    
    // Debug: Show sample client structure (REDUCED LOGGING)
    // if (allEmailClients.length > 0) {
    //   const sampleClient = allEmailClients[0];
    //   console.log(`📋 Sample client structure:`, {
    //     id: sampleClient.id,
    //     email: sampleClient.email,
    //     spotify_id: sampleClient.spotify_id,
    //     attribution_method: sampleClient.attribution_method,
    //     attribution_source: sampleClient.attribution_source,
    //     pipeline: sampleClient.pipeline,
    //     analysisType: sampleClient.analysisType
    //   });
    // }
    
    // Build thread-to-mailbox mapping from existing thread data
    const threadMailboxMap = new Map();
    this.threads.forEach(thread => {
      if (thread.id && thread.mailboxId) {
        threadMailboxMap.set(thread.id, thread.mailboxId);
      }
    });
    
    console.log(`📊 THREAD MAPPING - Built thread-to-mailbox mapping for ${threadMailboxMap.size} threads`);
    console.log(`📊 THREAD DATA - Total threads available: ${this.threads.length}`);
    
    // Debug: Show sample thread structure
    if (this.threads.length > 0) {
      const sampleThread = this.threads[0];
      console.log(`📋 Sample thread structure:`, {
        id: sampleThread.id,
        contactEmail: sampleThread.contactEmail,
        mailboxId: sampleThread.mailboxId,
        subject: sampleThread.subject?.substring(0, 50) + '...'
      });
    }
    
    // Debug: Show sample thread mapping
    if (threadMailboxMap.size > 0) {
      const sampleThreads = Array.from(threadMailboxMap.entries()).slice(0, 3);
      // console.log('📋 Sample thread-to-mailbox mapping:');
      // sampleThreads.forEach(([threadId, mailboxId]) => {
      //   console.log(`   ${threadId} -> ${mailboxId}`);
      // });
    }
    
    // Collect all thread IDs that need detailed fetching
    const threadRequests = [];
    let clientsWithThreads = 0;
    
    console.log('🔍 THREAD COLLECTION - Starting comprehensive thread linkage for each client...');
    
    // Helper function to extract Spotify ID from URL
    const extractSpotifyId = (spotifyUrl) => {
      if (!spotifyUrl) return null;
      const match = spotifyUrl.match(/artist\/([a-zA-Z0-9]+)/);
      return match ? match[1] : null;
    };
    
    // Helper function to find threads using multiple methods
    const findThreadsForClient = (client) => {
      const foundThreads = new Set();
      const linkageMethods = [];
      
      // Method 1: Direct email match
      const directEmailThreads = this.threads.filter(thread => 
        thread.contactEmail && thread.contactEmail.toLowerCase() === client.email.toLowerCase()
      );
      
      if (directEmailThreads.length > 0) {
        linkageMethods.push('direct_email_match');
        directEmailThreads.forEach(thread => foundThreads.add(thread.id));
      }
      
      // Method 2: Spotify ID match
      if (client.spotify_id) {
        // Find contacts with matching Spotify ID
        const spotifyContacts = this.contacts.filter(contact => {
          const contactSpotifyId = extractSpotifyId(contact.customVars?.artistspotifyurl || contact.customVars?.spotify_artist_url);
          return contactSpotifyId && contactSpotifyId === client.spotify_id;
        });
        
        if (spotifyContacts.length > 0) {
          linkageMethods.push('spotify_id_match');
          
          // Find threads for these contacts
          spotifyContacts.forEach(contact => {
            const spotifyThreads = this.threads.filter(thread => 
              thread.contactEmail && thread.contactEmail.toLowerCase() === contact.email.toLowerCase()
            );
            
            if (spotifyThreads.length > 0) {
              linkageMethods.push('spotify_contact_to_thread');
              spotifyThreads.forEach(thread => foundThreads.add(thread.id));
            }
          });
        }
      }
      
      // Method 3: Invitation contact ID → contact → thread
      if (client.attribution_details && client.attribution_details.match_data) {
        const matchData = client.attribution_details.match_data;
        
        // Check if this is a contact-based match
        if (matchData.contact) {
          const invitationContact = matchData.contact;
          linkageMethods.push('invitation_contact_id');
          linkageMethods.push('contact_found');
          
          // Find threads for this contact
          const invitationThreads = this.threads.filter(thread => 
            thread.contactEmail && thread.contactEmail.toLowerCase() === invitationContact.email.toLowerCase()
          );
          
          if (invitationThreads.length > 0) {
            linkageMethods.push('contact_email_to_thread');
            invitationThreads.forEach(thread => foundThreads.add(thread.id));
          }
        }
        
        // Also check if the match data has a contact ID we can use
        if (matchData.source === 'contact' && matchData.contact?.id) {
          const contactId = matchData.contact.id;
          const invitationContact = this.contacts.find(contact => 
            contact.id === contactId
          );
          
          if (invitationContact) {
            linkageMethods.push('invitation_contact_id');
            linkageMethods.push('contact_found');
            
            // Find threads for this contact
            const invitationThreads = this.threads.filter(thread => 
              thread.contactEmail && thread.contactEmail.toLowerCase() === invitationContact.email.toLowerCase()
            );
            
            if (invitationThreads.length > 0) {
              linkageMethods.push('contact_email_to_thread');
              invitationThreads.forEach(thread => foundThreads.add(thread.id));
            }
          }
        }
      }
      
      return {
        threadIds: Array.from(foundThreads),
        linkageMethods: linkageMethods
      };
    };
    
    for (const client of allEmailClients) {
      const linkageResult = findThreadsForClient(client);
      
      if (linkageResult.threadIds.length > 0) {
        clientsWithThreads++;
        // console.log(`📧 Client ${client.email} (${client.pipeline}): Found ${linkageResult.threadIds.length} thread(s) via [${linkageResult.linkageMethods.join(', ')}]`);
        
        for (const threadId of linkageResult.threadIds) {
          const mailboxId = threadMailboxMap.get(threadId);
          if (mailboxId) {
            threadRequests.push({
              threadId: threadId,
              mailboxId: mailboxId,
              clientEmail: client.email,
              clientId: client.id,
              clientPipeline: client.pipeline,
              analysisType: client.analysisType,
              linkageMethods: linkageResult.linkageMethods
            });
            // console.log(`   ✅ Thread ${threadId} -> Mailbox ${mailboxId}`);
          } else {
            console.log(`   ❌ Thread ${threadId} -> No mailbox ID found`);
          }
        }
      } else {
        // console.log(`📧 Client ${client.email} (${client.pipeline}): No threads found via any method`);
      }
    }
    
    console.log(`📊 COMPREHENSIVE THREAD COLLECTION SUMMARY:`);
    console.log(`   • Total email-based clients: ${allEmailClients.length}`);
    console.log(`   • New Method clients: ${newMethodClients.length} (variant + step analysis)`);
    console.log(`   • Old Method clients: ${oldMethodClients.length} (step analysis)`);
    console.log(`   • Audit clients: ${auditClients.length} (step analysis)`);
    console.log(`   • Clients with threads: ${clientsWithThreads}`);
    console.log(`   • Total threads to fetch: ${threadRequests.length}`);
    
    if (threadRequests.length === 0) {
      console.log('⚠️ No threads found for any email-based pipeline clients');
      console.log('💡 This might indicate:');
      console.log('   • No thread data was loaded');
      console.log('   • Email addresses don\'t match between clients and threads');
      console.log('   • Threads missing mailbox_id values');
      return;
    }
    
    // Batch fetch thread details
    try {
      console.log('🚀 BATCH FETCH - Starting batch thread details fetch...');
      this.reportProgress('Fetching detailed thread data from Salesforge API...', 65);
      
      const startTime = Date.now();
      const response = await fetch('/api/salesforge/threads/batch-details', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          threads: threadRequests.map(req => ({
            threadId: req.threadId,
            mailboxId: req.mailboxId
          })),
          maxConcurrent: 1 // Sequential processing for maximum API reliability
        })
      });
      
      const fetchTime = Date.now() - startTime;
      console.log(`⏱️ API fetch completed in ${fetchTime}ms`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Batch thread fetch failed: ${response.status} - ${errorText}`);
        throw new Error(`Batch thread fetch failed: ${response.status}`);
      }
      
      const batchResult = await response.json();
      console.log(`📊 BATCH FETCH RESULTS:`);
      console.log(`   • Total requested: ${batchResult.total}`);
      console.log(`   • Successfully fetched: ${batchResult.fetched}`);
      console.log(`   • Failed: ${batchResult.failed}`);
      console.log(`   • Success rate: ${((batchResult.fetched / batchResult.total) * 100).toFixed(1)}%`);
      
      if (batchResult.errors && batchResult.errors.length > 0) {
        console.warn(`⚠️ BATCH FETCH ERRORS (showing first 3 of ${batchResult.errors.length}):`);
        batchResult.errors.slice(0, 3).forEach((error, i) => {
          console.warn(`   ${i + 1}. Thread ${error.threadId}: ${error.error}`);
        });
      }
      
      // Process the detailed thread data with comprehensive analysis
      this.reportProgress('Processing detailed thread data for variant and step analysis...', 75);
      const enhancedResults = await this.processDetailedThreadData(batchResult.results, allEmailClients, threadRequests);
      
      // Perform conversion timing analysis with enhanced client data
      this.conversionTimingResults = this.performConversionTimingAnalysis(allEmailClients);
      
      return enhancedResults || results;
      
    } catch (error) {
      console.error('❌ BATCH FETCH ERROR - Failed to fetch detailed threads:', error);
      console.error('   Error details:', error.message);
      console.error('   Stack trace:', error.stack);
      // Continue processing without detailed thread data
      return results;
    }
  }
  
  // Process detailed thread data and extract variant information
  async processDetailedThreadData(detailedThreads, allEmailClients, threadRequests) {
    console.log(`🔍 COMPREHENSIVE PROCESSING - Starting detailed thread data processing for ${detailedThreads.length} threads`);
    console.log(`📊 Analysis types: Variant analysis (New Method) + Step analysis (All pipelines)`);
    
    let totalEmails = 0;
    let variantEmails = 0;
    let sequenceEmails = 0;
    let manualEmails = 0;
    let contactEmails = 0;
    let threadsProcessed = 0;
    
    const variantCounts = {
      'Variant A': 0,
      'Variant B': 0,
      'Variant C': 0,
      'Variant D': 0,
      'Subsequence Variant A': 0,
      'Subsequence Variant B': 0
    };
    
    // Step analysis tracking
    const stepAnalysis = {
      'Email Outreach - New Method': {},
      'Email Outreach - Old Method': {},
      'Royalty Audit': {}
    };
    
    // Create mapping of threadId to client information
    const threadToClientMap = new Map();
    threadRequests.forEach(request => {
      threadToClientMap.set(request.threadId, {
        email: request.clientEmail,
        pipeline: request.clientPipeline,
        analysisType: request.analysisType
      });
    });
    
    for (const threadData of detailedThreads) {
      if (!threadData.emails || !Array.isArray(threadData.emails)) {
        // console.log(`⚠️ Thread ${threadData.id}: No emails array found`);
        continue;
      }
      
      threadsProcessed++;
      
      // Get client information for this thread
      const clientInfo = threadToClientMap.get(threadData.threadId);
      if (clientInfo) {
        // console.log(`🧵 Processing thread ${threadData.threadId}: ${threadData.emails.length} emails (${clientInfo.pipeline})`);
      } else {
        // console.log(`🧵 Processing thread ${threadData.threadId}: ${threadData.emails.length} emails (unknown client)`);
      }
      
      totalEmails += threadData.emails.length;
      
      // Debug: Show email structure for first few threads (REDUCED LOGGING)
      // if (threadsProcessed <= 3) {
      //   console.log(`🔍 DEBUG - Thread ${threadData.threadId} email structure:`);
      //   threadData.emails.forEach((email, i) => {
      //     console.log(`   Email ${i + 1}:`, {
      //       id: email.id,
      //       type: email.type,
      //       sequence_id: email.sequence_id,
      //       sequence_name: email.sequence_name,
      //       step_order: email.step_order,
      //       subject: email.subject?.substring(0, 50) + '...',
      //       date: email.date
      //     });
      //   });
      // }
      
      // Process each email in the thread
      for (const email of threadData.emails) {
        // Categorize email types based on API structure (type + id prefix) (REDUCED LOGGING)
        if (email.type === 'me' && email.id && email.id.startsWith('sqe_')) {
          sequenceEmails++;
          // console.log(`   📧 Sequence email detected: ${email.id} (sqe_ prefix)`);
        } else if (email.type === 'me' && email.id && email.id.startsWith('mte_')) {
          manualEmails++;
          // console.log(`   📧 Manual email detected: ${email.id} (mte_ prefix)`);
        } else if (email.type === 'contact') {
          contactEmails++;
        } else {
          console.log(`   ⚠️ Unknown email structure: type=${email.type}, id=${email.id}`);
        }
        
        // Step analysis for all pipelines (sequence emails only)
        if (email.type === 'me' && email.id && email.id.startsWith('sqe_') && 
            threadData.sequence && threadData.sequence.id && clientInfo) {
          this.performStepAnalysis(email, threadData, clientInfo, stepAnalysis);
        }
        
        // Variant analysis only for New Method pipeline (sequence emails only)  
        if (email.type === 'me' && email.id && email.id.startsWith('sqe_') && 
            threadData.sequence && threadData.sequence.id && clientInfo?.analysisType === 'variant+step') {
          // Extract variant information from email content
          const variantInfo = this.extractVariantInfo(email, threadData);
          
          if (variantInfo) {
            variantEmails++;
            // console.log(`   ✅ Email ${email.id}: ${variantInfo.variant_pattern} (confidence: ${variantInfo.confidence})`);
            
            // Count variants
            if (variantCounts[variantInfo.variant_pattern]) {
              variantCounts[variantInfo.variant_pattern]++;
            } else if (variantInfo.variant_pattern.includes('Default')) {
              const baseVariant = variantInfo.variant_pattern.replace(' (Default)', '');
              if (variantCounts[baseVariant]) {
                variantCounts[baseVariant]++;
              }
            }
            
            // Find the corresponding client and add variant data
            const client = allEmailClients.find(c => 
              c.email.toLowerCase() === clientInfo.email.toLowerCase()
            );
            
            if (client) {
              if (!client.email_variants) {
                client.email_variants = [];
              }
              
              client.email_variants.push({
                thread_id: threadData.id,
                email_id: email.id,
                sequence_id: email.sequence_id,
                sequence_name: email.sequence_name,
                step_order: email.step_order,
                variant_id: variantInfo.variant_id,
                variant_pattern: variantInfo.variant_pattern,
                variant_confidence: variantInfo.confidence,
                subject: email.subject,
                content_snippet: email.content ? email.content.substring(0, 200) : null,
                date: email.date,
                type: email.type
              });
              
              // console.log(`   📧 Added variant to client ${client.email}`);
            } else {
              // console.log(`   ⚠️ No client found for thread contact ${threadData.contactEmail}`);
            }
          } else {
            // console.log(`   ❌ Email ${email.id}: No variant identified`);
          }
        }
      }
    }
    
    // Store manual emails count for use in additional_data
    this.manualEmailsCount = manualEmails;
    
    console.log(`📊 COMPREHENSIVE PROCESSING SUMMARY:`);
    console.log(`   • Threads processed: ${threadsProcessed}/${detailedThreads.length}`);
    console.log(`   • Total emails: ${totalEmails}`);
    console.log(`   • Sequence emails (sqe_): ${sequenceEmails}`);
    console.log(`   • Manual emails: ${manualEmails}`);
    console.log(`   • Contact emails: ${contactEmails}`);
    console.log(`   • Variant emails identified: ${variantEmails}`);
    console.log(`   • Variant identification rate: ${sequenceEmails > 0 ? ((variantEmails / sequenceEmails) * 100).toFixed(1) : 'N/A'}%`);
    
    console.log(`📊 STEP ANALYSIS SUMMARY:`);
    Object.entries(stepAnalysis).forEach(([pipeline, steps]) => {
      const totalSteps = Object.values(steps).reduce((sum, count) => sum + count, 0);
      if (totalSteps > 0) {
        console.log(`   • ${pipeline}: ${totalSteps} sequence emails analyzed`);
        Object.entries(steps).forEach(([step, count]) => {
          const percentage = ((count / totalSteps) * 100).toFixed(1);
          console.log(`     - Step ${step}: ${count} emails (${percentage}%)`);
        });
      }
    });
    
    console.log(`📊 VARIANT BREAKDOWN:`);
    Object.entries(variantCounts).forEach(([variant, count]) => {
      if (count > 0) {
        console.log(`   • ${variant}: ${count} emails`);
      }
    });
    
    // Log variant summary (only for New Method clients)
    const newMethodClientsOnly = allEmailClients.filter(c => c.analysisType === 'variant+step');
    const clientsWithVariants = newMethodClientsOnly.filter(c => c.email_variants && c.email_variants.length > 0);
    console.log(`📊 CLIENT VARIANT SUMMARY:`);
    console.log(`   • New Method clients: ${newMethodClientsOnly.length}`);
    console.log(`   • Clients with variants: ${clientsWithVariants.length}/${newMethodClientsOnly.length}`);
    console.log(`   • Variant coverage: ${newMethodClientsOnly.length > 0 ? ((clientsWithVariants.length / newMethodClientsOnly.length) * 100).toFixed(1) : 'N/A'}%`);
    
    // Show sample clients with variants (REDUCED LOGGING)
    // if (clientsWithVariants.length > 0) {
    //   console.log(`📋 Sample clients with variants:`);
    //   clientsWithVariants.slice(0, 3).forEach((client, i) => {
    //     console.log(`   ${i + 1}. ${client.email}: ${client.email_variants.length} variant(s)`);
    //     client.email_variants.forEach(variant => {
    //       console.log(`      - ${variant.variant_pattern} (${variant.variant_confidence})`);
    //     });
    //   });
    // }
    
    // Update invitationResults with enhanced client data containing variants  
    return this.updateInvitationResultsWithVariants(allEmailClients, this.currentResults);
    
    // Note: Conversion timing analysis moved to after updating results
  }
  
  // Update invitationResults with enhanced client data containing variants
  updateInvitationResultsWithVariants(allEmailClients, invitationResults) {
    // Create a map of email to enhanced client data
    const emailToEnhancedClient = new Map();
    allEmailClients.forEach(client => {
      emailToEnhancedClient.set(client.email, client);
    });
    
    // Update invitationResults with enhanced client data
    Object.keys(invitationResults).forEach(pipeline => {
      if (invitationResults[pipeline]) {
        invitationResults[pipeline] = invitationResults[pipeline].map(client => {
          const enhancedClient = emailToEnhancedClient.get(client.email);
          if (enhancedClient && enhancedClient.email_variants) {
            // Merge the enhanced data (particularly email_variants) with the original client
            return { ...client, email_variants: enhancedClient.email_variants };
          }
          return client;
        });
      }
    });
    
    console.log(`📊 ENHANCED CLIENT DATA MERGED:`)
    const newMethodClients = invitationResults['Email Outreach - New Method'] || [];
    const clientsWithVariants = newMethodClients.filter(c => c.email_variants && c.email_variants.length > 0);
    console.log(`   • New Method clients: ${newMethodClients.length}`);
    console.log(`   • Clients with variant data: ${clientsWithVariants.length}`);
    
    return invitationResults;
  }
  
  // Perform step analysis for all email-based pipelines
  performStepAnalysis(email, threadData, clientInfo, stepAnalysis) {
    // Extract step number from email content or structure
    let stepNumber = null;
    
    // Method 1: Extract from step_order field
    if (email.step_order && email.step_order > 0) {
      stepNumber = email.step_order;
    }
    // Method 2: Extract from email subject patterns
    else if (email.subject) {
      const stepMatches = email.subject.match(/step\s*(\d+)/i) || 
                         email.subject.match(/email\s*(\d+)/i) ||
                         email.subject.match(/follow[\s-]*up\s*(\d+)/i);
      if (stepMatches) {
        stepNumber = parseInt(stepMatches[1]);
      }
    }
    // Method 3: Extract from sequence email ID pattern (some sequences use numbered IDs)
    else if (email.id && email.id.includes('_')) {
      const idParts = email.id.split('_');
      for (const part of idParts) {
        if (/^\d+$/.test(part) && parseInt(part) <= 10) { // Reasonable step range
          stepNumber = parseInt(part);
          break;
        }
      }
    }
    
    // Default to step 1 if we can't determine the step
    if (!stepNumber || stepNumber < 1) {
      stepNumber = 1;
    }
    
    // Track the step for this pipeline
    const pipeline = clientInfo.pipeline;
    if (!stepAnalysis[pipeline]) {
      stepAnalysis[pipeline] = {};
    }
    
    if (!stepAnalysis[pipeline][stepNumber]) {
      stepAnalysis[pipeline][stepNumber] = 0;
    }
    
    stepAnalysis[pipeline][stepNumber]++;
    
    // Log detailed step information for debugging (REDUCED LOGGING)
    // console.log(`   📊 Step analysis: ${clientInfo.email} (${pipeline}) - Step ${stepNumber} detected`);
  }
  
  // Extract variant information using established methodology
  extractVariantInfo(email, threadData) {
    if (!email.content && !email.subject) {
      return null;
    }
    
    const subject = (email.subject || '').toLowerCase();
    const content = (email.content || '').toLowerCase();
    const sequenceId = threadData.sequence?.id; // Get sequence ID from thread level
    
    // Only analyze automated sequence emails (starting with sqe_)
    if (!email.id || !email.id.startsWith('sqe_')) {
      return null;
    }
    
    // console.log(`   🔍 Analyzing variant for email ${email.id} in sequence ${sequenceId}`);
    
    // First, check if this is a subsequence email based on established patterns
    const subsequencePatterns = [
      'can view your report and sign up directly via this link below',
      "we're not guessing",
      'unclaimed mechanical royalties for', // Re: subject pattern
      'glad you\'re interested' // Common subsequence opener
    ];
    
    const isSubsequence = subsequencePatterns.some(pattern => 
      content.includes(pattern.toLowerCase()) || subject.includes(pattern.toLowerCase())
    );
    
    // If it's a subsequence email, use subsequence variant logic
    if (isSubsequence) {
      // console.log(`   📧 Subsequence email detected based on content patterns`);
      return this.identifySubsequenceVariant(email, subject, content);
    }
    
    // Otherwise, identify main sequence variant (V3 main sequence)
    if (sequenceId === 'seq_wi7oitk80ujguc59z7nct') {
      // console.log(`   📧 Main sequence V3 email detected`);
      return this.identifyMainSequenceVariant(email, subject, content);
    }
    
    // For other sequences (V1, V2, Audit), return basic sequence info
    if (sequenceId) {
      console.log(`   📧 Other sequence email: ${sequenceId}`);
      return {
        variant_id: sequenceId + '_step_0',
        variant_pattern: `${threadData.sequence?.name || 'Unknown'} - Step 1`,
        confidence: 0.8,
        sequence_id: sequenceId,
        sequence_name: threadData.sequence?.name || 'Unknown'
      };
    }
    
    return null;
  }
  
  // Identify main sequence variants (seq_wi7oitk80ujguc59z7nct)
  identifyMainSequenceVariant(email, subject, content) {
    const variants = [
      {
        id: 'stpv_7y20a81xruskrm4z8emy1',
        label: 'Variant A',
        subject_pattern: 'Missing publishing royalties for',
        identifier_text: 'missing publishing royalties for',
        status: 'active',
        weight: 33.33
      },
      {
        id: 'stpv_w53yl51n7fr1ei7i5sbgh',
        label: 'Variant B',
        subject_pattern: 'your songs may be owed royalties',
        identifier_text: 'your songs may be owed royalties',
        status: 'paused',
        weight: 0
      },
      {
        id: 'stpv_qw8ebmf6o4r9u160d9x5f',
        label: 'Variant C',
        subject_pattern: 'Mechanical royalties for your music are unclaimed',
        identifier_text: 'mechanical royalties for your music are unclaimed',
        status: 'active',
        weight: 33.33
      },
      {
        id: 'stpv_sc8dfi1ev49qr7ymvt8z9',
        label: 'Variant D',
        subject_pattern: 'did you ever get paid for that song',
        identifier_text: 'did you ever get paid for that song',
        status: 'active',
        weight: 33.33
      }
    ];
    
    // Try to identify variant based on established patterns
    for (const variant of variants) {
      const identifierText = variant.identifier_text.toLowerCase();
      let confidence = 0;
      
      // Check subject line match
      if (subject.includes(identifierText)) {
        confidence = 0.9;
      }
      // Check content match
      else if (content.includes(identifierText)) {
        confidence = 0.8;
      }
      // Partial matches for edge cases
      else if (variant.label === 'Variant A' && subject.includes('missing publishing royalties')) {
        confidence = 0.7;
      }
      else if (variant.label === 'Variant B' && subject.includes('songs may be owed')) {
        confidence = 0.7;
      }
      else if (variant.label === 'Variant C' && subject.includes('mechanical royalties') && subject.includes('unclaimed')) {
        confidence = 0.7;
      }
      else if (variant.label === 'Variant D' && subject.includes('get paid for that song')) {
        confidence = 0.7;
      }
      
      if (confidence > 0) {
        return {
          variant_id: variant.id,
          variant_pattern: variant.label,
          confidence: confidence,
          sequence_name: 'UniteSync Outreach V3 (New Method)',
          actual_sequence_id: 'seq_wi7oitk80ujguc59z7nct'
        };
      }
    }
    
    // Default to Variant A if no specific match
    return {
      variant_id: 'stpv_7y20a81xruskrm4z8emy1',
      variant_pattern: 'Variant A',
      confidence: 0.3,
      sequence_name: 'UniteSync Outreach V3 (New Method)',
      actual_sequence_id: 'seq_wi7oitk80ujguc59z7nct'
    };
  }
  
  // Identify subsequence variants (seq_yq8zuesfv8h4z67pgu7po)
  identifySubsequenceVariant(email, subject, content) {
    const variants = [
      {
        id: 'stpv_oyq8xvxfu6sdtv7l6lds0',
        label: 'Subsequence Variant A',
        subject_pattern: 'Re: Unclaimed mechanical royalties for',
        identifier_text: 'can view your report and sign up directly via this link below',
        weight: 50
      },
      {
        id: 'stpv_y7hvtire97j6jtgtqyz2u',
        label: 'Subsequence Variant B',
        subject_pattern: '',
        identifier_text: "we're not guessing",
        weight: 50
      }
    ];
    
    // Check subsequence variants
    for (const variant of variants) {
      const identifierText = variant.identifier_text.toLowerCase();
      let confidence = 0;
      
      // Check content match
      if (content.includes(identifierText)) {
        confidence = 0.8;
      }
      // Check subject match for Variant A (has subject pattern)
      else if (variant.label === 'Subsequence Variant A' && subject.includes('unclaimed mechanical royalties for')) {
        confidence = 0.7;
      }
      
      if (confidence > 0) {
        return {
          variant_id: variant.id,
          variant_pattern: variant.label,
          confidence: confidence,
          sequence_name: 'Subsequence V3 Positive (New Method)',
          actual_sequence_id: 'seq_yq8zuesfv8h4z67pgu7po'
        };
      }
    }
    
    // Default to first subsequence variant
    return {
      variant_id: 'stpv_oyq8xvxfu6sdtv7l6lds0',
      variant_pattern: 'Subsequence Variant A',
      confidence: 0.3,
      sequence_name: 'Subsequence V3 Positive (New Method)',
      actual_sequence_id: 'seq_yq8zuesfv8h4z67pgu7po'
    };
  }

  // CONFIDENCE-BASED CHECKER FUNCTIONS
  // These replace the old sequential "try" methods with a collect-then-decide approach

  // Find email timing match (confidence: 0.90)
  async findEmailTimingMatch(client, clientSignupDate) {
    const matches = this.emailIndex.get(client.email);
    
    if (!matches || matches.length === 0) {
      return null;
    }

    // Find the best match with timing validation
    let bestMatch = null;
    let bestScore = -1;

    for (const match of matches) {
      // Only consider Salesforge contacts for email timing
      if (match.source === 'contact_stats') {
        const score = await this.validateTiming(match, clientSignupDate);
        if (score > bestScore) {
          bestScore = score;
          bestMatch = match;
        }
      }
    }

    if (bestMatch && bestScore > 0) {
      return {
        source: bestMatch.pipeline,
        method: 'email_timing',
        confidence: 0.90,
        details: {
          email: client.email,
          contacted_date: bestMatch.stat['Contacted date'],
          timing_score: bestScore,
          match_data: bestMatch
        }
      };
    }

    return null;
  }

  // Find invitation code match (confidence: 0.85)
  async findInvitationCodeMatch(client, clientSignupDate) {
    const invitationCode = client.invitation_code || client.invitation;
    
    if (!invitationCode) {
      return null;
    }
    
    const matches = this.invitationIndex.get(invitationCode);
    
    if (!matches || matches.length === 0) {
      return null;
    }

    // Find the best match with timing validation
    let bestMatch = null;
    let bestScore = -1;

    for (const match of matches) {
      const score = await this.validateTiming(match, clientSignupDate);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = match;
      }
    }

    if (bestMatch && bestScore > 0) {
      return {
        source: bestMatch.pipeline,
        method: 'invitation_code',
        confidence: 0.85,
        details: {
          invitation_code: invitationCode,
          source: bestMatch.source,
          timing_score: bestScore,
          match_data: bestMatch
        }
      };
    }

    return null;
  }

  // Find Spotify ID match (confidence: 0.80)
  async findSpotifyMatch(client, clientSignupDate) {
    if (!client.spotify_id) {
      return null;
    }
    
    const matches = this.spotifyIndex.get(client.spotify_id);
    
    if (!matches || matches.length === 0) {
      return null;
    }

    // Find the best match with timing validation, prioritizing non-audit sources
    let bestMatch = null;
    let bestScore = -1;

    for (const match of matches) {
      const score = await this.validateTiming(match, clientSignupDate);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = match;
      }
    }

    if (bestMatch && bestScore > 0) {
      return {
        source: bestMatch.pipeline,
        method: 'spotify_id',
        confidence: 0.80,
        details: {
          spotify_id: client.spotify_id,
          source: bestMatch.source,
          timing_score: bestScore,
          match_data: bestMatch
        }
      };
    }

    return null;
  }

  // Find audit match with audit-after-outreach logic (confidence: 0.75/0.70)
  async findAuditMatch(client, clientSignupDate) {
    // Check for audit matches by email or Spotify ID
    let auditMatches = [];

    // Check by email
    if (client.email) {
      const auditsByEmail = this.audits.filter(audit => 
        audit.email && audit.email.toLowerCase() === client.email.toLowerCase()
      );
      auditMatches.push(...auditsByEmail);
    }

    // Check by Spotify ID
    if (client.spotify_id) {
      const auditsBySpotify = this.audits.filter(audit => 
        audit.spotify_id === client.spotify_id
      );
      auditMatches.push(...auditsBySpotify);
    }

    if (auditMatches.length === 0) {
      return null;
    }

    // Find the best audit match with timing validation
    let bestAuditMatch = null;
    let bestAuditScore = -1;

    for (const audit of auditMatches) {
      const auditDate = new Date(audit.created_at || audit.request_date);
      const timingScore = await this.validateTimingForAudit(auditDate, clientSignupDate);
      
      if (timingScore > bestAuditScore) {
        bestAuditScore = timingScore;
        bestAuditMatch = audit;
      }
    }

    if (!bestAuditMatch || bestAuditScore <= 0) {
      return null;
    }

    // CRITICAL: Check for audit-after-outreach
    const auditDate = new Date(bestAuditMatch.created_at || bestAuditMatch.request_date);
    
    // Look for prior outreach touchpoints before the audit date
    const priorOutreach = await this.findPriorOutreach(client, auditDate);
    
    if (priorOutreach) {
      // This is an "audit after outreach" - attribute to original outreach channel
      return {
        source: priorOutreach.pipeline,
        method: 'audit_after_outreach',
        confidence: 0.75,
        details: {
          original_outreach: priorOutreach,
          audit_date: auditDate.toISOString(),
          timing_score: bestAuditScore,
          audit_data: bestAuditMatch
        }
      };
    } else {
      // This is an inbound audit request
      return {
        source: 'Royalty Audit',
        method: 'audit_inbound',
        confidence: 0.70,
        details: {
          audit_date: auditDate.toISOString(),
          timing_score: bestAuditScore,
          audit_data: bestAuditMatch
        }
      };
    }
  }

  // Helper method to find prior outreach before an audit date
  async findPriorOutreach(client, auditDate) {
    // Check Salesforge contacts
    const salesforgeMatches = this.emailIndex.get(client.email);
    if (salesforgeMatches) {
      for (const match of salesforgeMatches) {
        if (match.source === 'contact_stats') {
          const contactDate = AttributionUtils.parseSalesforceDate(match.stat['Contacted date']);
          if (contactDate && contactDate < auditDate) {
            return {
              pipeline: match.pipeline,
              source: 'salesforge',
              contact_date: contactDate.toISOString(),
              match_data: match
            };
          }
        }
      }
    }

    // Check Convrt (Instagram) campaigns
    if (client.spotify_id) {
      const convrtMatches = this.spotifyIndex.get(client.spotify_id);
      if (convrtMatches) {
        for (const match of convrtMatches) {
          if (match.source === 'convrt') {
            // Check Convrt campaign status for timing
            const auditStatus = this.convrtAuditStatus.find(status => 
              status.handle === match.lead.handle || status.full_name === match.lead.full_name
            );
            const reportStatus = this.convrtReportStatus.find(status => 
              status.handle === match.lead.handle || status.full_name === match.lead.full_name
            );
            
            const sentDate = auditStatus?.sent || reportStatus?.sent;
            if (sentDate) {
              const contactDate = new Date(sentDate);
              if (contactDate < auditDate) {
                return {
                  pipeline: 'Instagram Outreach',
                  source: 'convrt',
                  contact_date: contactDate.toISOString(),
                  match_data: match
                };
              }
            }
          }
        }
      }
    }

    return null;
  }

  // Select the best attribution based on highest confidence
  selectBestAttribution(potentialAttributions) {
    if (potentialAttributions.length === 0) {
      return null;
    }

    // Use Array.reduce to find the attribution with highest confidence
    return potentialAttributions.reduce((best, current) => {
      return current.confidence > best.confidence ? current : best;
    });
  }

  // Validate timing for audit matches (90-day window)
  async validateTimingForAudit(auditDate, clientSignupDate) {
    const daysDiff = AttributionUtils.daysDifference(auditDate, clientSignupDate);
    const maxDays = 90; // Audit attribution window

    // Same day attribution (highest priority)
    if (daysDiff === 0) {
      return 1.0;
    }
    
    // Valid attribution window: audit before signup, within max days
    if (daysDiff >= 1 && daysDiff <= maxDays) {
      // Score: closer to signup = higher score
      return 1.0 - (daysDiff / maxDays);
    }

    return 0; // Outside attribution window
  }

  // Try invitation code attribution
  async tryInvitationCodeAttribution(client, clientSignupDate) {
    const invitationCode = client.invitation_code || client.invitation;
    const matches = this.invitationIndex.get(invitationCode);
    
    if (!matches || matches.length === 0) {
      return null;
    }

    // Find the best match with timing validation
    let bestMatch = null;
    let bestScore = -1;

    for (const match of matches) {
      const score = await this.validateTiming(match, clientSignupDate);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = match;
      }
    }

    if (bestMatch && bestScore > 0) {
      return {
        pipeline: bestMatch.pipeline,
        method: 'invitation_code',
        confidence: 0.85,
        details: {
          invitation_code: invitationCode,
          source: bestMatch.source,
          timing_score: bestScore,
          match_data: bestMatch
        }
      };
    }

    return null;
  }

  // Try Spotify ID attribution
  async trySpotifyIdAttribution(client, clientSignupDate) {
    const spotifyId = client.spotify_id;
    const matches = this.spotifyIndex.get(spotifyId);
    
    if (!matches || matches.length === 0) {
      return null;
    }

    // Find the best match with timing validation
    let bestMatch = null;
    let bestScore = -1;

    for (const match of matches) {
      const score = await this.validateTiming(match, clientSignupDate);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = match;
      }
    }

    if (bestMatch && bestScore > 0) {
      return {
        pipeline: bestMatch.pipeline,
        method: 'spotify_id',
        confidence: 0.80,
        details: {
          spotify_id: spotifyId,
          source: bestMatch.source,
          timing_score: bestScore,
          match_data: bestMatch
        }
      };
    }

    return null;
  }

  // Try email/handle attribution
  async tryEmailHandleAttribution(client, clientSignupDate) {
    const email = client.email;
    const matches = this.emailIndex.get(email);
    
    if (!matches || matches.length === 0) {
      return null;
    }

    // Find the best match with timing validation
    let bestMatch = null;
    let bestScore = -1;

    for (const match of matches) {
      const score = await this.validateTiming(match, clientSignupDate);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = match;
      }
    }

    if (bestMatch && bestScore > 0) {
      return {
        pipeline: bestMatch.pipeline,
        method: 'email_handle',
        confidence: 0.75,
        details: {
          email: email,
          source: bestMatch.source,
          timing_score: bestScore,
          match_data: bestMatch
        }
      };
    }

    return null;
  }

  // Determine pipeline from contact data using sequence statistics
  determinePipelineFromContact(contact) {
    if (!contact.email) {
      return 'Email Outreach - Old Method'; // Default fallback
    }
    
    const contactEmail = contact.email.toLowerCase();
    
    // Check V3 sequence statistics (New Method)
    const v3Contact = this.v3ContactStats.find(stat => 
      stat['Contact email address'] && stat['Contact email address'].toLowerCase() === contactEmail
    );
    const v3SubContact = this.v3SubsequenceStats.find(stat => 
      stat['Contact email address'] && stat['Contact email address'].toLowerCase() === contactEmail
    );
    
    if (v3Contact || v3SubContact) {
      return 'Email Outreach - New Method';
    }
    
    // Check V1/V2 sequence statistics (Old Method)
    const v1Contact = this.v1ContactStats.find(stat => 
      stat['Contact email address'] && stat['Contact email address'].toLowerCase() === contactEmail
    );
    const v2Contact = this.v2ContactStats.find(stat => 
      stat['Contact email address'] && stat['Contact email address'].toLowerCase() === contactEmail
    );
    
    if (v1Contact || v2Contact) {
      return 'Email Outreach - Old Method';
    }
    
    // Fallback to timing-based detection
    if (!contact.createdAt && !contact.created_at) {
      return 'Email Outreach - Old Method'; // Default fallback
    }
    
    const contactDate = new Date(contact.createdAt || contact.created_at);
    const v3CutoffDate = new Date('2025-03-01T00:00:00Z'); // V3 started around March 2025
    
    if (contactDate >= v3CutoffDate) {
      return 'Email Outreach - New Method';
    } else {
      return 'Email Outreach - Old Method';
    }
  }

  // Normalize pipeline names to match results object keys
  normalizePipeline(pipeline) {
    if (!pipeline) return 'Unattributed';
    
    const normalizedPipeline = pipeline.trim();
    
    // Map variations to exact result keys
    const pipelineMapping = {
      'Email Outreach': 'Email Outreach - Old Method', // Default to old method
      'Email Outreach - Old Method': 'Email Outreach - Old Method',
      'Email Outreach - New Method': 'Email Outreach - New Method',
      'Instagram Outreach': 'Instagram Outreach',
      'Royalty Audit': 'Royalty Audit',
      'Unattributed': 'Unattributed'
    };
    
    return pipelineMapping[normalizedPipeline] || 'Unattributed';
  }

  // Validate timing for attribution matches
  async validateTiming(match, clientSignupDate) {
    let contactDate = null;
    let maxDays = 365; // Default attribution window for email (365 days)
    
    if (match.source === 'salesforge') {
      // For Salesforge contacts, we need to find the contact stats
      const contactStats = this.emailIndex.get(match.contact.email);
      if (contactStats && contactStats.length > 0) {
        const earliestContact = contactStats
          .map(cs => AttributionUtils.parseSalesforceDate(cs.stat['Contacted date']))
          .filter(date => date)
          .sort((a, b) => a - b)[0];
        
        contactDate = earliestContact;
      }
      maxDays = 365; // Email attribution window
    } else if (match.source === 'convrt') {
      // For Convrt leads, check campaign status
      const auditStatus = this.convrtAuditStatus.find(status => 
        status.handle === match.lead.handle || status.full_name === match.lead.full_name
      );
      const reportStatus = this.convrtReportStatus.find(status => 
        status.handle === match.lead.handle || status.full_name === match.lead.full_name
      );
      
      const sentDate = auditStatus?.sent || reportStatus?.sent;
      if (sentDate) {
        contactDate = new Date(sentDate);
        contactDate.setUTCHours(12, 0, 0, 0); // Normalize to noon
      } else {
        // No timing data available for Instagram leads - assume valid match
        // Instagram attribution is based on Spotify ID overlap only
        return 0.6; // Medium confidence for Instagram without timing
      }
      maxDays = 365; // Instagram attribution window
    } else if (match.source === 'audit') {
      // For audit requests
      contactDate = new Date(match.audit.created_at);
      contactDate.setUTCHours(12, 0, 0, 0); // Normalize to noon
      maxDays = 90; // Audit attribution window (90 days)
    } else if (match.source === 'contact_stats') {
      // For contact statistics
      contactDate = AttributionUtils.parseSalesforceDate(match.stat['Contacted date']);
      maxDays = 365; // Email attribution window
    }

    if (!contactDate) {
      return 0; // No valid timing
    }

    const daysDiff = AttributionUtils.daysDifference(contactDate, clientSignupDate);
    
    // Same day attribution for audits (highest priority)
    if (daysDiff === 0 && match.source === 'audit') {
      return 1.0;
    }
    
    // Valid attribution window: contact before signup, within max days
    if (daysDiff >= 1 && daysDiff <= maxDays) {
      // Score: closer to signup = higher score
      return 1.0 - (daysDiff / maxDays);
    }

    return 0; // Outside attribution window
  }

  // Process additional data types for comprehensive dashboard
  async processAdditionalDataTypes(data, attributionResults) {
    console.log('🔍 ADDITIONAL DATA PROCESSING - Starting comprehensive data processing');
    
    const additionalData = {
      sequenceStats: [],
      labels: [],
      convrtLeads: [],
      funnelMetrics: {},
      revenueAnalytics: {},
      manual_emails: this.manualEmailsCount || 0
    };
    
    // Process sequence statistics from CSV data
    console.log('📊 Processing sequence statistics...');
    additionalData.sequenceStats = await this.processSequenceStatistics(data);
    
    // Process labels data
    console.log('🏷️ Processing labels data...');
    additionalData.labels = await this.processLabels(data);
    
    // Process Instagram leads data
    console.log('📱 Processing Instagram leads...');
    additionalData.convrtLeads = await this.processConvrtLeads(data);
    
    // Calculate funnel metrics
    console.log('📈 Calculating funnel metrics...');
    additionalData.funnelMetrics = await this.calculateFunnelMetrics(data, attributionResults);
    
    // Process revenue analytics
    console.log('💰 Processing revenue analytics...');
    additionalData.revenueAnalytics = await this.processRevenueAnalytics(data, attributionResults);
    
    console.log('✅ ADDITIONAL DATA PROCESSING COMPLETE:');
    console.log(`   • Sequence statistics: ${additionalData.sequenceStats.length}`);
    console.log(`   • Labels: ${additionalData.labels.length}`);
    console.log(`   • Instagram leads: ${additionalData.convrtLeads.length}`);
    console.log(`   • Funnel metrics: ${Object.keys(additionalData.funnelMetrics).length} pipelines`);
    
    return additionalData;
  }

  // Process sequence statistics from V1, V2, V3, and V3-subsequence CSV files
  async processSequenceStatistics(data) {
    const sequenceStats = [];
    
    // V1 Statistics (Old Method)
    if (data.v1ContactStats && data.v1ContactStats.length > 0) {
      const v1Stats = this.parseSequenceStats(data.v1ContactStats, 'V1', 'Email Outreach - Old Method');
      sequenceStats.push(v1Stats);
    }
    
    // V2 Statistics (Old Method)  
    if (data.v2ContactStats && data.v2ContactStats.length > 0) {
      const v2Stats = this.parseSequenceStats(data.v2ContactStats, 'V2', 'Email Outreach - Old Method');
      sequenceStats.push(v2Stats);
    }
    
    // V3 Statistics (New Method - Main)
    if (data.v3ContactStats && data.v3ContactStats.length > 0) {
      const v3Stats = this.parseSequenceStats(data.v3ContactStats, 'V3', 'Email Outreach - New Method');
      sequenceStats.push(v3Stats);
    }
    
    // V3 Subsequence Statistics (New Method - Subsequence)
    if (data.v3SubsequenceStats && data.v3SubsequenceStats.length > 0) {
      const v3SubStats = this.parseSequenceStats(data.v3SubsequenceStats, 'V3-Sub', 'Email Outreach - New Method');
      sequenceStats.push(v3SubStats);
    }
    
    // Inbound Audit Statistics (Royalty Audit sequence)
    if (data.inboundAuditStats && data.inboundAuditStats.length > 0) {
      const auditStats = this.parseSequenceStats(data.inboundAuditStats, 'Audit', 'Royalty Audit');
      sequenceStats.push(auditStats);
    }
    
    return sequenceStats;
  }

  // Parse individual sequence statistics
  parseSequenceStats(statsData, version, pipeline) {
    const totalContacts = statsData.length;
    const repliedContacts = statsData.filter(row => 
      row['Replied date'] && row['Replied date'].trim() !== ''
    ).length;
    
    let positiveRate = 0;
    
    // V3 Positive Rate = Subsequence enrollment / Main sequence enrollment
    let v3MainPositiveRate = 0;
    let v3MainPositiveCount = 0;
    
    if (version === 'V3' && this.hasSubsequenceData()) {
      const subsequenceContacts = this.getSubsequenceContactCount();
      positiveRate = totalContacts > 0 ? (subsequenceContacts / totalContacts) * 100 : 0;
      
      // NEW METRIC: V3 main sequence positive replies (1331/1515)
      // This represents how many of the main sequence replies were positive
      v3MainPositiveRate = repliedContacts > 0 ? (subsequenceContacts / repliedContacts) * 100 : 0;
      v3MainPositiveCount = subsequenceContacts;
    } else {
      // For V1/V2/Audit, use traditional label-based calculation
      const positiveReplies = this.calculatePositiveRepliesFromLabels(statsData);
      positiveRate = repliedContacts > 0 ? (positiveReplies / repliedContacts) * 100 : 0;
    }
    
    const result = {
      id: `${version}_${pipeline.replace(/\s+/g, '_')}`,
      name: `${version} Sequence`,
      status: 'active',
      pipeline: pipeline,
      method: version,
      contacted_count: totalContacts,
      replied_count: repliedContacts,
      reply_rate: totalContacts > 0 ? (repliedContacts / totalContacts) * 100 : 0,
      replied_positive_count: Math.round((positiveRate / 100) * repliedContacts),
      replied_positive_percent: positiveRate,
      // Note: open_rate removed as it's unreliable
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Add V3-specific metrics
    if (version === 'V3' && this.hasSubsequenceData()) {
      result.v3_main_positive_rate = v3MainPositiveRate;
      result.v3_main_positive_count = v3MainPositiveCount;
      result.v3_subsequence_enrolled = this.getSubsequenceContactCount();
      result.calculation_note = `V3 Positive Rate: ${this.getSubsequenceContactCount()}/${totalContacts} = ${positiveRate.toFixed(2)}%, Main Sequence Positive: ${v3MainPositiveCount}/${repliedContacts} = ${v3MainPositiveRate.toFixed(2)}%`;
    }
    
    return result;
  }

  // Helper methods for sequence statistics
  hasSubsequenceData() {
    return this.v3SubsequenceStats && this.v3SubsequenceStats.length > 0;
  }

  getSubsequenceContactCount() {
    return this.v3SubsequenceStats ? this.v3SubsequenceStats.length : 0;
  }

  calculatePositiveRepliesFromLabels(statsData) {
    // This would need access to thread labels to calculate properly
    // For now, use a conservative estimate of 20% positive rate for V1/V2
    const repliedContacts = statsData.filter(row => 
      row['Replied date'] && row['Replied date'].trim() !== ''
    ).length;
    return Math.round(repliedContacts * 0.2);
  }

  // Process labels data for reply categorization
  async processLabels(data) {
    if (!data.labels) return [];
    
    return data.labels.map(label => ({
      id: label.id,
      name: label.name,
      special_label: label.specialLabel || null,
      hidden: label.hidden || false,
      workspace_id: label.workspaceId,
      created_at: label.createdAt,
      updated_at: label.updatedAt
    }));
  }

  // Process Instagram leads data for campaign tracking
  async processConvrtLeads(data) {
    const convrtLeads = [];
    
    // Process from convrtLeads array (if available)
    if (data.convrtLeads) {
      data.convrtLeads.forEach(lead => {
        convrtLeads.push({
          artist_name: lead.artist_name,
          artist_id: lead.artist_id,
          artist_spotify_url: lead.artist_spotify_url,
          email: lead.email,
          ig_username: lead.ig_username,
          ig_url: lead.ig_url,
          listeners: parseInt(lead.listeners) || 0,
          range_total: lead.range_total,
          total_deal_amount: parseFloat(lead.total_deal_amount) || 0,
          composer_1: lead.composer_1,
          range_1: lead.range_1,
          composer_2: lead.composer_2,
          range_2: lead.range_2,
          composer_3: lead.composer_3,
          range_3: lead.range_3,
          report_url: lead.report_url,
          status: lead['status?'] || 'pending',
          campaign_id: this.determineCampaignId(lead), // Link to convrt_campaigns table
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      });
    }
    
    return convrtLeads;
  }

  // Helper method to determine campaign ID
  determineCampaignId(lead) {
    // Logic to determine campaign ID based on lead data
    // This would map to existing convrt_campaigns records
    if (lead['report link campaign?'] === 'Y') {
      return 1; // Report link campaign ID
    } else if (lead['audit campaign?'] === 'Y') {
      return 2; // Audit campaign ID
    }
    return null; // No campaign association
  }

  // Calculate comprehensive funnel metrics
  calculateFunnelMetrics(data, attributionResults) {
    const funnelMetrics = {
      email_outreach_old: this.calculateEmailFunnel([...this.v1ContactStats, ...this.v2ContactStats]),
      email_outreach_new_main: this.calculateEmailFunnel(this.v3ContactStats),
      email_outreach_new_sub: this.calculateEmailFunnel(this.v3SubsequenceStats),
      instagram_outreach: this.calculateInstagramFunnel(data.convrtLeads || []),
      royalty_audits: this.calculateAuditFunnel(this.audits, attributionResults)
    };
    
    return funnelMetrics;
  }

  calculateEmailFunnel(statsArray) {
    if (!statsArray || statsArray.length === 0) {
      return {
        total_contacted: 0,
        total_replied: 0,
        reply_rate: 0
      };
    }

    const totalContacts = statsArray.length;
    const repliedContacts = statsArray.filter(row => 
      row['Replied date'] && row['Replied date'].trim() !== ''
    ).length;
    
    // Remove open rate calculations as they are unreliable
    return {
      total_contacted: totalContacts,
      total_replied: repliedContacts,
      reply_rate: totalContacts > 0 ? (repliedContacts / totalContacts * 100) : 0,
      // positive_rate calculated separately using subsequence data for V3
    };
  }

  calculateInstagramFunnel(convrtLeads) {
    // Combine data from both Convrt JSON status files for real funnel metrics
    const allStatusData = [...this.convrtReportStatus, ...this.convrtAuditStatus];
    
    if (allStatusData.length === 0) {
      console.log('⚠️ No Convrt status data available, using basic lead data');
      return this.calculateBasicInstagramFunnel(convrtLeads);
    }
    
    // Process real Instagram campaign funnel using status data
    const campaignMetrics = {
      'Report Link Campaign': {
        campaign_name: 'Outreach V2 (Report Link)',
        total_leads: 0,
        pending: 0,
        completed: 0,
        failed: 0,
        revoked: 0
      },
      'Audit Link Campaign': {
        campaign_name: 'Royalty Audit Link',
        total_leads: 0,
        pending: 0,
        completed: 0,
        failed: 0,
        revoked: 0
      }
    };
    
    // Process Report Link campaign status
    this.convrtReportStatus.forEach(item => {
      const campaign = campaignMetrics['Report Link Campaign'];
      campaign.total_leads++;
      const status = item.status || 'pending';
      if (campaign.hasOwnProperty(status)) {
        campaign[status]++;
      }
    });
    
    // Process Audit Link campaign status  
    this.convrtAuditStatus.forEach(item => {
      const campaign = campaignMetrics['Audit Link Campaign'];
      campaign.total_leads++;
      const status = item.status || 'pending';
      if (campaign.hasOwnProperty(status)) {
        campaign[status]++;
      }
    });
    
    // Calculate overall metrics
    const totalLeads = campaignMetrics['Report Link Campaign'].total_leads + 
                      campaignMetrics['Audit Link Campaign'].total_leads;
    const totalCompleted = campaignMetrics['Report Link Campaign'].completed + 
                          campaignMetrics['Audit Link Campaign'].completed;
    const totalFailed = campaignMetrics['Report Link Campaign'].failed + 
                       campaignMetrics['Audit Link Campaign'].failed;
    const totalPending = campaignMetrics['Report Link Campaign'].pending + 
                        campaignMetrics['Audit Link Campaign'].pending;
    const totalRevoked = campaignMetrics['Report Link Campaign'].revoked + 
                        campaignMetrics['Audit Link Campaign'].revoked;
    
    const completionRate = totalLeads > 0 ? (totalCompleted / totalLeads) * 100 : 0;
    const failureRate = totalLeads > 0 ? (totalFailed / totalLeads) * 100 : 0;
    
    console.log(`📱 Instagram Funnel Metrics (Real Convrt Data):`);
    console.log(`   • Total leads: ${totalLeads}`);
    console.log(`   • Completed: ${totalCompleted} (${completionRate.toFixed(1)}%)`);
    console.log(`   • Failed: ${totalFailed} (${failureRate.toFixed(1)}%)`);
    console.log(`   • Report Link: ${campaignMetrics['Report Link Campaign'].total_leads} leads`);
    console.log(`   • Audit Link: ${campaignMetrics['Audit Link Campaign'].total_leads} leads`);
    
    return {
      data_source: 'convrt_status_json',
      total_leads: totalLeads,
      completed_count: totalCompleted,
      failed_count: totalFailed,
      pending_count: totalPending,
      revoked_count: totalRevoked,
      completion_rate: completionRate,
      failure_rate: failureRate,
      campaign_breakdown: campaignMetrics,
      status_breakdown: {
        pending: totalPending,
        completed: totalCompleted,
        failed: totalFailed,
        revoked: totalRevoked
      }
    };
  }
  
  // Fallback method for when Convrt status data is not available
  calculateBasicInstagramFunnel(convrtLeads) {
    if (!convrtLeads || convrtLeads.length === 0) {
      return {
        data_source: 'convrt_leads_csv',
        total_leads: 0,
        status_breakdown: {},
        campaign_breakdown: {},
        contacted_count: 0,
        replied_count: 0,
        completed_count: 0,
        failed_count: 0
      };
    }

    const statusCounts = convrtLeads.reduce((acc, lead) => {
      const status = lead.status || 'pending';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
    
    const campaignCounts = convrtLeads.reduce((acc, lead) => {
      const campaignId = lead.campaign_id || 'unknown';
      acc[campaignId] = (acc[campaignId] || 0) + 1;
      return acc;
    }, {});
    
    return {
      data_source: 'convrt_leads_csv',
      total_leads: convrtLeads.length,
      status_breakdown: statusCounts,
      campaign_breakdown: campaignCounts,
      contacted_count: statusCounts.contacted || 0,
      replied_count: statusCounts.replied || 0,
      completed_count: statusCounts.completed || 0,
      failed_count: statusCounts.failed || 0
    };
  }

  calculateAuditFunnel(audits, attributionResults) {
    if (!audits || audits.length === 0) {
      return {
        total_audits: 0,
        converted_audits: 0,
        conversion_rate: 0,
        referral_source_breakdown: {}
      };
    }

    const totalAudits = audits.length;
    
    // Calculate converted audits based on attribution results, not raw audit.converted field
    // Count clients attributed to 'Royalty Audit' pipeline
    const royaltyAuditClients = attributionResults['Royalty Audit'] || [];
    const convertedAudits = royaltyAuditClients.length;
    
    // Enhanced referral source breakdown with counts, percentages, and descriptions
    const referralSourceBreakdown = audits.reduce((acc, audit) => {
      // Handle null, empty string, undefined, and various string representations of null
      const sourceValue = audit.referral_source;
      const sourceId = (sourceValue === null || 
                       sourceValue === undefined || 
                       sourceValue === '' || 
                       sourceValue === 'null' ||
                       sourceValue === 'NULL' ||
                       String(sourceValue).trim() === '' ||
                       String(sourceValue).toLowerCase() === 'null') ? '999' : String(sourceValue);
      
      const sourceInfo = this.referralSources.find(s => s.id == sourceId);
      const sourceName = sourceInfo ? sourceInfo.description : 
        (sourceId === '999' ? 'Unknown/No referral source' : `Unknown (${sourceId})`);
      
      if (!acc[sourceId]) {
        acc[sourceId] = { 
          id: sourceId, 
          name: sourceName, 
          count: 0, 
          percentage: 0,
          attributed_count: 0,
          attributed_percentage: 0
        };
      }
      acc[sourceId].count++;
      return acc;
    }, {});
    
    // Calculate percentages and attributed counts
    Object.values(referralSourceBreakdown).forEach(source => {
      // Total percentage (all audits from this source)
      source.percentage = totalAudits > 0 ? (source.count / totalAudits) * 100 : 0;
      
      // Count attributed audits from this source
      source.attributed_count = royaltyAuditClients.filter(client => {
        const audit = audits.find(a => a.spotify_id === client.spotify_id);
        if (!audit) return false;
        
        // Apply the same NULL handling logic as used for breakdown calculation
        const auditSourceValue = audit.referral_source;
        const auditSourceId = (auditSourceValue === null || 
                              auditSourceValue === undefined || 
                              auditSourceValue === '' || 
                              auditSourceValue === 'null' ||
                              auditSourceValue === 'NULL' ||
                              String(auditSourceValue).trim() === '' ||
                              String(auditSourceValue).toLowerCase() === 'null') ? '999' : String(auditSourceValue);
        
        return auditSourceId == source.id;
      }).length;
      
      // Attributed percentage (attributed audits from this source vs all audits)
      source.attributed_percentage = totalAudits > 0 ? 
        (source.attributed_count / totalAudits) * 100 : 0;
        
      // Conversion rate for this specific source
      source.conversion_rate = source.count > 0 ? 
        (source.attributed_count / source.count) * 100 : 0;
    });
    
    return {
      total_audits: totalAudits,
      converted_audits: convertedAudits,
      conversion_rate: totalAudits > 0 ? (convertedAudits / totalAudits * 100) : 0,
      referral_source_breakdown: referralSourceBreakdown
    };
  }

  // Process streamlined revenue analytics (attributed clients only)
  processRevenueAnalytics(data, attributionResults) {
    console.log('💰 Calculating revenue analytics...');
    
    // Get all clients and attributed clients 
    const allClients = this.clients;
    
    // Get only attributed clients (exclude Unattributed pipeline)
    const attributedClients = [];
    Object.entries(attributionResults).forEach(([pipeline, pipelineClients]) => {
      if (Array.isArray(pipelineClients) && pipeline !== 'Unattributed') {
        attributedClients.push(...pipelineClients);
      }
    });
    
    const attributedClientsData = allClients.filter(client => {
      return attributedClients.some(attributed => 
        attributed.spotify_id === client.spotify_id || attributed.email === client.email
      );
    });
    
    // Calculate total actual revenue for all clients
    const totalActualRevenue = allClients.reduce((sum, client) => 
      sum + (parseFloat(client.revenue) || 0), 0);
    
    // Calculate attributed actual revenue 
    const attributedActualRevenue = attributedClientsData.reduce((sum, client) => 
      sum + (parseFloat(client.revenue) || 0), 0);
    
    const revenueMetrics = {
      // Raw total client revenue data (for detailed analysis) - shows 447 values indicating total clients
      total_actual_revenue: this.calculateActualRevenue(attributedClientsData),
      
      // Performance analysis (attributed clients expected vs actual)
      performance_analysis: this.calculatePerformanceMetrics(data, attributionResults),
      
      // Attributed clients analysis (attributed clients with revenue > 0)
      attributed_clients_analysis: this.calculateClosedClientsPerformance(data, attributionResults),
      
      // Pipeline breakdown (attributed clients only)
      pipeline_revenue_breakdown: this.calculatePipelineRevenueBreakdown(data, attributionResults),
      
      // Clear summary with corrected naming
      summary: {
        total_clients: allClients.length,                    // All clients (447)
        revenue_attributed_clients: attributedClientsData.filter(c => c.revenue && parseFloat(c.revenue) > 0).length, // Attributed clients with revenue > 0
        total_actual_revenue: totalActualRevenue,           // All clients revenue 
        attributed_actual_revenue: attributedActualRevenue  // Only attributed clients revenue
      }
    };
    
    console.log(`✅ Revenue analytics processed:`);
    console.log(`   • Total clients: ${allClients.length}`);
    console.log(`   • Revenue attributed clients: ${revenueMetrics.summary.revenue_attributed_clients}`);
    console.log(`   • Total actual revenue: $${totalActualRevenue}`);
    console.log(`   • Attributed actual revenue: $${attributedActualRevenue}`);
    
    return revenueMetrics;
  }

  calculateConvrtLeadsRevenue(convrtLeads) {
    return convrtLeads.map(lead => {
      const totalExpected = this.parseRange(lead.range_total).average;
      const top3Expected = this.calculateTop3ComposersRevenue(lead.range_1, lead.range_2, lead.range_3);
      
      return {
        artist_name: lead.artist_name,
        spotify_id: AttributionUtils.extractSpotifyId(lead.artist_spotify_url),
        total_expected_revenue: totalExpected,
        top3_expected_revenue: top3Expected,
        campaign_id: lead.campaign_id,
        status: lead.status
      };
    });
  }

  calculateSalesforgeRevenue(contacts) {
    return contacts.map(contact => {
      const customVars = contact.customVars || {};
      
      // Extract revenue from multiple possible customVar fields
      const totalRange = customVars.estimation || customVars.estimation_range || customVars.range;
      const dealAmount = customVars.deal_amount || customVars.deal;
      const range1 = customVars.range_1 || customVars.average_1;
      const range2 = customVars.range_2;
      const range3 = customVars.range_3 || customVars.range3;
      
      const totalExpected = this.parseRange(totalRange).average;
      const top3Expected = this.calculateTop3ComposersRevenue(range1, range2, range3);
      
      return {
        email: contact.email,
        spotify_id: contact.spotify_id,
        total_expected_revenue: totalExpected,
        top3_expected_revenue: top3Expected,
        deal_amount: parseFloat(dealAmount) || 0
      };
    });
  }


  calculateActualRevenue(clients) {
    return clients.map(client => ({
      email: client.email,
      spotify_id: client.spotify_id,
      actual_revenue: parseFloat(client.revenue) || 0,
      estimated_range: client.estimated, // "$270-818" format
      status: client.status
    }));
  }

  calculatePerformanceMetrics(data, attributionResults) {
    // Calculate overall performance metrics for attributed clients only
    const attributedClients = [];
    Object.entries(attributionResults).forEach(([pipeline, clients]) => {
      if (pipeline !== 'Unattributed') {
        attributedClients.push(...clients);
      }
    });
    
    const totalExpected = attributedClients.reduce((sum, client) => {
      // Get expected revenue from convrt leads
      const convrtLead = (data.convrtLeads || []).find(lead => 
        AttributionUtils.extractSpotifyId(lead.artist_spotify_url) === client.spotify_id ||
        lead.email === client.email
      );
      if (convrtLead) {
        sum += this.parseRange(convrtLead.range_total).average;
      }
      
      // Get expected revenue from salesforge contacts
      const contact = this.contacts.find(c => 
        c.spotify_id === client.spotify_id || c.email === client.email
      );
      if (contact && contact.customVars) {
        const totalRange = contact.customVars.estimation || 
                          contact.customVars.estimation_range || 
                          contact.customVars.range;
        sum += this.parseRange(totalRange).average;
      }
      
      return sum;
    }, 0);
    
    const totalActual = attributedClients.reduce((sum, client) => 
      sum + (parseFloat(client.revenue) || 0), 0);
    
    return {
      attributed_expected_revenue: totalExpected,
      attributed_actual_revenue: totalActual,
      revenue_efficiency: totalExpected > 0 ? totalActual / totalExpected : 0
    };
  }

  // Calculate performance metrics for closed clients only
  calculateClosedClientsPerformance(data, attributionResults) {
    // Get attributed clients from attribution results
    const attributedClients = [];
    Object.entries(attributionResults).forEach(([pipeline, clients]) => {
      if (pipeline !== 'Unattributed') {
        attributedClients.push(...clients);
      }
    });
    
    // Get full client data for attributed clients (consistent with processRevenueAnalytics)
    const attributedClientsData = this.clients.filter(client => {
      return attributedClients.some(attributed => 
        attributed.spotify_id === client.spotify_id || attributed.email === client.email
      );
    });
    
    // Filter for clients with revenue > 0 using full client data
    const closedClients = attributedClientsData.filter(client => 
      parseFloat(client.revenue || 0) > 0
    );
    
    // Calculate expected revenue for these closed clients
    const closedClientsExpected = {
      total_expected: 0,
      top3_expected: 0,
      actual_revenue: 0,
      count: closedClients.length
    };
    
    closedClients.forEach(client => {
      // Find expected revenue from convrt leads
      const convrtLead = (data.convrtLeads || []).find(lead => 
        AttributionUtils.extractSpotifyId(lead.artist_spotify_url) === client.spotify_id ||
        lead.email === client.email
      );
      
      if (convrtLead) {
        closedClientsExpected.total_expected += this.parseRange(convrtLead.range_total).average;
        closedClientsExpected.top3_expected += this.calculateTop3ComposersRevenue(
          convrtLead.range_1, convrtLead.range_2, convrtLead.range_3
        );
      }
      
      // Find expected revenue from salesforge contacts
      const contact = this.contacts.find(c => 
        c.spotify_id === client.spotify_id || c.email === client.email
      );
      
      if (contact && contact.customVars) {
        const totalRange = contact.customVars.estimation || 
                          contact.customVars.estimation_range || 
                          contact.customVars.range;
        const range1 = contact.customVars.range_1 || contact.customVars.average_1;
        const range2 = contact.customVars.range_2;
        const range3 = contact.customVars.range_3 || contact.customVars.range3;
        
        closedClientsExpected.total_expected += this.parseRange(totalRange).average;
        closedClientsExpected.top3_expected += this.calculateTop3ComposersRevenue(range1, range2, range3);
      }
      
      closedClientsExpected.actual_revenue += parseFloat(client.revenue || 0);
    });
    
    return {
      revenue_attributed_clients_count: closedClients.length,
      total_expected_revenue: closedClientsExpected.total_expected,
      top3_expected_revenue: closedClientsExpected.top3_expected,
      actual_revenue: closedClientsExpected.actual_revenue,
      performance_vs_total: closedClientsExpected.total_expected > 0 ? 
        (closedClientsExpected.actual_revenue / closedClientsExpected.total_expected) * 100 : 0,
      performance_vs_top3: closedClientsExpected.top3_expected > 0 ? 
        (closedClientsExpected.actual_revenue / closedClientsExpected.top3_expected) * 100 : 0,
      revenue_efficiency_total: closedClientsExpected.total_expected > 0 ? 
        closedClientsExpected.actual_revenue / closedClientsExpected.total_expected : 0,
      revenue_efficiency_top3: closedClientsExpected.top3_expected > 0 ? 
        closedClientsExpected.actual_revenue / closedClientsExpected.top3_expected : 0
    };
  }

  // Calculate revenue breakdown by pipeline (attributed clients only)
  calculatePipelineRevenueBreakdown(data, attributionResults) {
    const pipelineBreakdown = {
      'Email Outreach - Old Method': { count: 0, total_expected: 0, top3_expected: 0, actual_revenue: 0 },
      'Email Outreach - New Method': { count: 0, total_expected: 0, top3_expected: 0, actual_revenue: 0 },
      'Instagram Outreach': { count: 0, total_expected: 0, top3_expected: 0, actual_revenue: 0 },
      'Royalty Audit': { count: 0, total_expected: 0, top3_expected: 0, actual_revenue: 0 },
      'Unattributed': { count: 0, total_expected: 0, top3_expected: 0, actual_revenue: 0 }
    };
    
    // Process ATTRIBUTED clients only (since expected vs actual only applies to attributed clients)
    Object.entries(attributionResults).forEach(([pipeline, clients]) => {
      // Skip Unattributed pipeline for expected revenue calculations
      if (pipeline === 'Unattributed') {
        // Only count clients and actual revenue for unattributed
        clients.forEach(client => {
          const revenue = parseFloat(client.revenue || 0);
          pipelineBreakdown[pipeline].count++;
          pipelineBreakdown[pipeline].actual_revenue += revenue;
        });
        return;
      }
      
      clients.forEach(client => {
        const revenue = parseFloat(client.revenue || 0);
        
        if (pipelineBreakdown[pipeline]) {
          pipelineBreakdown[pipeline].count++;
          pipelineBreakdown[pipeline].actual_revenue += revenue;
        
          // Add expected revenue calculations
          const convrtLead = (data.convrtLeads || []).find(lead => 
            AttributionUtils.extractSpotifyId(lead.artist_spotify_url) === client.spotify_id ||
            lead.email === client.email
          );
          
          if (convrtLead) {
            pipelineBreakdown[pipeline].total_expected += this.parseRange(convrtLead.range_total).average;
            pipelineBreakdown[pipeline].top3_expected += this.calculateTop3ComposersRevenue(
              convrtLead.range_1, convrtLead.range_2, convrtLead.range_3
            );
          }
          
          const contact = this.contacts.find(c => 
            c.spotify_id === client.spotify_id || c.email === client.email
          );
          
          if (contact && contact.customVars) {
            const totalRange = contact.customVars.estimation || 
                              contact.customVars.estimation_range || 
                              contact.customVars.range;
            const range1 = contact.customVars.range_1 || contact.customVars.average_1;
            const range2 = contact.customVars.range_2;
            const range3 = contact.customVars.range_3 || contact.customVars.range3;
            
            pipelineBreakdown[pipeline].total_expected += this.parseRange(totalRange).average;
            pipelineBreakdown[pipeline].top3_expected += this.calculateTop3ComposersRevenue(range1, range2, range3);
          }
        }
      });
    });
    
    // Calculate performance ratios for each pipeline
    Object.keys(pipelineBreakdown).forEach(pipeline => {
      const data = pipelineBreakdown[pipeline];
      data.performance_vs_total = data.total_expected > 0 ? 
        (data.actual_revenue / data.total_expected) * 100 : 0;
      data.performance_vs_top3 = data.top3_expected > 0 ? 
        (data.actual_revenue / data.top3_expected) * 100 : 0;
      data.avg_revenue_per_client = data.count > 0 ? data.actual_revenue / data.count : 0;
    });
    
    return pipelineBreakdown;
  }

  // Revenue calculation helper methods
  parseRange(rangeStr) {
    if (!rangeStr || rangeStr === "0 - 0") return { min: 0, max: 0, average: 0 };
    const match = rangeStr.match(/(\d+)\s*-\s*(\d+)/);
    if (!match) return { min: 0, max: 0, average: 0 };
    const min = parseInt(match[1]);
    const max = parseInt(match[2]);
    return { min, max, average: (min + max) / 2 };
  }

  calculateTop3ComposersRevenue(range_1, range_2, range_3) {
    // Parse each range and get the average
    // Example: range_1: "30 - 146" (avg: 88), range_2: "0 - 0" (avg: 0), range_3: "71 - 71" (avg: 71)
    // Since only 1 composer per artist report is possible, use average instead of sum
    const ranges = [range_1, range_2, range_3]
      .filter(r => r && r !== "0 - 0")
      .map(r => this.parseRange(r).average)
      .filter(avg => avg > 0);
    
    // Average the top 3 composer ranges since only 1 composer per artist report is possible
    return ranges.length > 0 ? ranges.reduce((sum, avg) => sum + avg, 0) / ranges.length : 0;
  }

  // Enhanced audit processing with referral source
  processAudits(auditsData) {
    return auditsData.map(audit => ({
      // ... existing fields
      id: audit.id,
      spotify_id: audit.spotify_id,
      email: audit.email,
      first_name: audit.first_name,
      last_name: audit.last_name,
      request_date: audit.request_date,
      source: audit.source,
      client_id: audit.client_id,
      converted: audit.converted,
      conversion_date: audit.conversion_date,
      was_contacted_first: audit.was_contacted_first,
      contact_id: audit.contact_id,
      referral_source: audit.referral_source || 'unknown',
      created_at: audit.created_at
    }));
  }

  // Generate final report
  async generateFinalReport(invitationResults, additionalData) {
    const attributionCounts = {};
    const revenueCounts = {};
    const allAttributedClients = [];

    // Process results from invitation-first attribution
    for (const [pipeline, clients] of Object.entries(invitationResults)) {
      attributionCounts[pipeline] = clients.length;
      revenueCounts[pipeline] = clients.reduce((sum, client) => sum + (parseFloat(client.revenue) || 0), 0);
      allAttributedClients.push(...clients);
    }

    const totalClients = this.clients.length;
    
    // Calculate attributed count by actually counting clients in attribution results (excluding Unattributed)
    const attributedClients = [];
    Object.entries(invitationResults).forEach(([pipeline, pipelineClients]) => {
      if (Array.isArray(pipelineClients) && pipeline !== 'Unattributed') {
        attributedClients.push(...pipelineClients);
      }
    });
    const attributedCount = attributedClients.length;
    const attributionRate = totalClients > 0 ? ((attributedCount / totalClients) * 100).toFixed(1) : '0.0';

    // Generate sequence variants summary
    const sequenceVariantsSummary = this.generateSequenceVariantsSummary(invitationResults);

    console.log('📊 FINAL ATTRIBUTION REPORT:');
    console.log(`   Total clients: ${totalClients}`);
    console.log(`   Attributed clients: ${attributedCount}`);
    console.log(`   Attribution rate: ${attributionRate}%`);
    console.log('   Pipeline breakdown:', attributionCounts);
    console.log('   Revenue breakdown:', revenueCounts);
    
    console.log('📊 SEQUENCE VARIANTS SUMMARY:');
    console.log(`   • Total emails analyzed: ${sequenceVariantsSummary.total_emails_analyzed}`);
    console.log(`   • Variants identified: ${sequenceVariantsSummary.total_variants_identified}`);
    console.log(`   • Main sequence variants:`);
    Object.entries(sequenceVariantsSummary.main_sequence).forEach(([id, data]) => {
      if (data.count > 0) {
        console.log(`     - ${data.label}: ${data.count} emails (${data.clients.length} clients)`);
      }
    });
    console.log(`   • Subsequence variants:`);
    Object.entries(sequenceVariantsSummary.subsequence).forEach(([id, data]) => {
      if (data.count > 0) {
        console.log(`     - ${data.label}: ${data.count} emails (${data.clients.length} clients)`);
      }
    });
    
    // Log additional data processing results
    if (additionalData) {
      console.log('📊 ADDITIONAL DATA PROCESSING RESULTS:');
      console.log(`   • Sequence statistics processed: ${additionalData.sequenceStats?.length || 0}`);
      console.log(`   • Labels processed: ${additionalData.labels?.length || 0}`);
      console.log(`   • Instagram leads processed: ${additionalData.convrtLeads?.length || 0}`);
      console.log(`   • Funnel metrics calculated: ${Object.keys(additionalData.funnelMetrics || {}).length} pipelines`);
      console.log(`   • Revenue analytics processed: ✓`);
    }
    
    console.log('📊 ENHANCED FUNCTIONALITY SUMMARY:');
    const newMethodClients = invitationResults['Email Outreach - New Method'] || [];
    const clientsWithVariants = newMethodClients.filter(c => c.email_variants && c.email_variants.length > 0);
    console.log(`   • Confidence-based waterfall attribution: All clients evaluated against all methods`);
    console.log(`   • Audit-after-outreach logic: Prevents misattribution to Royalty Audit`);
    console.log(`   • Enhanced thread fetching: ${newMethodClients.length} clients processed`);
    console.log(`   • Variant analysis: ${clientsWithVariants.length} clients with variant data`);
    console.log(`   • Comprehensive data processing: Sequence stats, labels, Instagram leads, funnel metrics`);
    console.log(`   • Database ready: All data structures aligned with schema`);

    return {
      processing_date: new Date().toISOString(),
      total_clients: totalClients,
      attributed_clients: attributedCount,
      attribution_rate: `${attributionRate}%`,
      attribution_breakdown: attributionCounts,
      revenue_breakdown: revenueCounts,
      attributed_clients_data: allAttributedClients,
      sequence_variants_summary: sequenceVariantsSummary,
      conversion_timing_analysis: this.conversionTimingResults || {},
      // Include additional processed data for upload
      additional_data: additionalData || {},
      data_sources_summary: {
        contacts: this.contacts.length,
        v1_contact_stats: this.v1ContactStats.length,
        v2_contact_stats: this.v2ContactStats.length,
        v3_contact_stats: this.v3ContactStats.length,
        v3_subsequence_stats: this.v3SubsequenceStats.length,
        convrt_leads: this.convrtLeads.length,
        audits: this.audits.length,
        invitation_codes: this.invitationIndex.size,
        spotify_ids: this.spotifyIndex.size,
        email_addresses: this.emailIndex.size
      },
      methodology: [
        'Confidence-based waterfall attribution with timing validation',
        'Email timing match (0.90 confidence) - highest priority',
        'Invitation code matching (0.85 confidence)',
        'Spotify ID matching (0.80 confidence)',
        'Audit after outreach detection (0.75 confidence)',
        'Inbound audit requests (0.70 confidence)',
        'Enhanced thread fetching for Email Outreach - New Method',
        'Variant analysis using established methodology',
        'Conversion timing analysis identifies last email before signup',
        'Cross-platform invitation code extraction',
        'Audit-after-outreach business logic prevents misattribution',
        'Collect-then-decide model ensures highest confidence wins',
        'Comprehensive data processing: sequence statistics, labels, Instagram leads',
        'Revenue analytics with expected vs actual performance tracking',
        'Funnel metrics calculation for all pipelines'
      ]
    };
  }

  // Generate sequence variants summary for database population
  generateSequenceVariantsSummary(invitationResults) {
    const newMethodClients = invitationResults['Email Outreach - New Method'] || [];
    const variantsSummary = {
      main_sequence: {
        'stpv_7y20a81xruskrm4z8emy1': { label: 'Variant A', count: 0, clients: [] },
        'stpv_w53yl51n7fr1ei7i5sbgh': { label: 'Variant B', count: 0, clients: [] },
        'stpv_qw8ebmf6o4r9u160d9x5f': { label: 'Variant C', count: 0, clients: [] },
        'stpv_sc8dfi1ev49qr7ymvt8z9': { label: 'Variant D', count: 0, clients: [] }
      },
      subsequence: {
        'stpv_oyq8xvxfu6sdtv7l6lds0': { label: 'Subsequence Variant A', count: 0, clients: [] },
        'stpv_y7hvtire97j6jtgtqyz2u': { label: 'Subsequence Variant B', count: 0, clients: [] }
      },
      total_emails_analyzed: 0,
      total_variants_identified: 0
    };

    // Process clients with email variants
    for (const client of newMethodClients) {
      if (client.email_variants && client.email_variants.length > 0) {
        for (const variant of client.email_variants) {
          variantsSummary.total_emails_analyzed++;
          
          if (variant.variant_id) {
            variantsSummary.total_variants_identified++;
            
            // Main sequence variants
            if (variantsSummary.main_sequence[variant.variant_id]) {
              variantsSummary.main_sequence[variant.variant_id].count++;
              if (!variantsSummary.main_sequence[variant.variant_id].clients.includes(client.email)) {
                variantsSummary.main_sequence[variant.variant_id].clients.push(client.email);
              }
            }
            
            // Subsequence variants
            if (variantsSummary.subsequence[variant.variant_id]) {
              variantsSummary.subsequence[variant.variant_id].count++;
              if (!variantsSummary.subsequence[variant.variant_id].clients.includes(client.email)) {
                variantsSummary.subsequence[variant.variant_id].clients.push(client.email);
              }
            }
          }
        }
      }
    }

    return variantsSummary;
  }
  
  // Perform conversion timing analysis to identify which variant/step caused conversion
  performConversionTimingAnalysis(allEmailClients) {
    console.log(`📅 CONVERSION TIMING ANALYSIS:`);
    
    let clientsAnalyzed = 0;
    let conversionVariantsIdentified = 0;
    const conversionVariantStats = {};
    const conversionStepStats = {};
    
    // Only analyze clients that have both email variants and signup dates
    const clientsWithVariants = allEmailClients.filter(client => 
      client.email_variants && client.email_variants.length > 0 && 
      (client.signup_date || client.created_at)
    );
    
    console.log(`   • Clients with variants: ${clientsWithVariants.length}`);
    
    clientsWithVariants.forEach(client => {
      clientsAnalyzed++;
      
      // Parse client signup date
      const signupDate = AttributionUtils.parseClientDate(client.signup_date || client.created_at);
      if (!signupDate) {
        // console.log(`   ⚠️ Invalid signup date for client ${client.email}`);
        return;
      }
      
      // Find emails sent before signup date (within 90-day attribution window)
      const emailsBeforeSignup = client.email_variants.filter(variant => {
        const emailDate = AttributionUtils.parseSalesforceDate(variant.date);
        if (!emailDate) return false;
        
        const daysDiff = AttributionUtils.daysDifference(emailDate, signupDate);
        return daysDiff >= 0 && daysDiff <= 90; // Email sent 0-90 days before signup
      });
      
      if (emailsBeforeSignup.length === 0) {
        // console.log(`   ⚠️ No emails found before signup for client ${client.email}`);
        return;
      }
      
      // Sort emails by date (most recent first) to find the last email before signup
      emailsBeforeSignup.sort((a, b) => {
        const dateA = AttributionUtils.parseSalesforceDate(a.date);
        const dateB = AttributionUtils.parseSalesforceDate(b.date);
        return dateB - dateA; // Descending order (most recent first)
      });
      
      // The first email in sorted array is the last email sent before signup
      const lastEmailBeforeSignup = emailsBeforeSignup[0];
      const emailDate = AttributionUtils.parseSalesforceDate(lastEmailBeforeSignup.date);
      const daysDiff = AttributionUtils.daysDifference(emailDate, signupDate);
      
      // Mark this variant as the conversion-causing variant
      client.conversion_variant = {
        variant_id: lastEmailBeforeSignup.variant_id,
        variant_pattern: lastEmailBeforeSignup.variant_pattern,
        email_id: lastEmailBeforeSignup.email_id,
        thread_id: lastEmailBeforeSignup.thread_id,
        email_date: lastEmailBeforeSignup.date,
        signup_date: client.signup_date || client.created_at,
        days_to_conversion: daysDiff,
        conversion_confidence: daysDiff === 0 ? 1.0 : Math.max(0.1, 1.0 - (daysDiff / 90))
      };
      
      conversionVariantsIdentified++;
      
      // Track conversion variant statistics
      const variantKey = lastEmailBeforeSignup.variant_pattern;
      if (!conversionVariantStats[variantKey]) {
        conversionVariantStats[variantKey] = 0;
      }
      conversionVariantStats[variantKey]++;
      
      // Track conversion step statistics (if step info available)
      if (lastEmailBeforeSignup.step_order) {
        const stepKey = `Step ${lastEmailBeforeSignup.step_order}`;
        if (!conversionStepStats[stepKey]) {
          conversionStepStats[stepKey] = 0;
        }
        conversionStepStats[stepKey]++;
      } else {
        // Track emails without step order for debugging
        if (!conversionStepStats['No Step Info']) {
          conversionStepStats['No Step Info'] = 0;
        }
        conversionStepStats['No Step Info']++;
      }
      
      // console.log(`   ✅ Client ${client.email}: Converted ${daysDiff} days after ${variantKey}`);
    });
    
    console.log(`📊 CONVERSION TIMING RESULTS:`);
    console.log(`   • Clients analyzed: ${clientsAnalyzed}`);
    console.log(`   • Conversion variants identified: ${conversionVariantsIdentified}`);
    
    if (Object.keys(conversionVariantStats).length > 0) {
      console.log(`📊 CONVERSION BY VARIANT:`);
      Object.entries(conversionVariantStats)
        .sort((a, b) => b[1] - a[1])
        .forEach(([variant, count]) => {
          const percentage = ((count / conversionVariantsIdentified) * 100).toFixed(1);
          console.log(`   • ${variant}: ${count} conversions (${percentage}%)`);
        });
    }
    
    if (Object.keys(conversionStepStats).length > 0) {
      console.log(`📊 CONVERSION BY STEP:`);
      Object.entries(conversionStepStats)
        .sort((a, b) => b[1] - a[1])
        .forEach(([step, count]) => {
          const percentage = ((count / conversionVariantsIdentified) * 100).toFixed(1);
          console.log(`   • ${step}: ${count} conversions (${percentage}%)`);
        });
      
      console.log(`🔢 CONVERSION STEP STATISTICS:`);
      console.log(`   Total emails with step conversion data: ${Object.values(conversionStepStats).reduce((sum, count) => sum + count, 0)}`);
      Object.entries(conversionStepStats)
        .sort((a, b) => b[1] - a[1])
        .forEach(([step, count]) => {
          const percentage = ((count / conversionVariantsIdentified) * 100).toFixed(1);
          console.log(`   • ${step}: ${count} conversions (${percentage}%)`);
        });
    }
    
    return {
      clients_analyzed: clientsAnalyzed,
      conversion_variants_identified: conversionVariantsIdentified,
      conversion_variant_stats: conversionVariantStats,
      conversion_step_stats: conversionStepStats
    };
  }
}

// Worker message handler
self.onmessage = async function(e) {
  const { type, data, supabaseConfig } = e.data;
  
  console.log('Worker received message:', { type, dataKeys: Object.keys(data || {}), hasSupabaseConfig: !!supabaseConfig });
  
  try {
    // Initialize Supabase if config is provided
    if (supabaseConfig) {
      try {
        const initSuccess = SupabaseUtils.initializeClient(supabaseConfig);
        if (!initSuccess) {
          console.warn('⚠️ Supabase initialization returned false - will continue without database saving');
        }
      } catch (supabaseError) {
        console.warn('⚠️ Failed to initialize Supabase in worker:', supabaseError.message);
      }
    } else {
      console.log('ℹ️ No Supabase config provided - worker will save locally only');
    }

    switch (type) {
      case 'PROCESS_ATTRIBUTION':
        console.log('Starting confidence-based attribution processing...');
        const processor = new ConfidenceBasedAttributionProcessor();
        
        // Set up progress reporting
        processor.setProgressCallback((progress) => {
          console.log('Worker progress:', progress);
          self.postMessage({
            type: 'PROGRESS',
            data: progress
          });
        });
        
        // Process attribution with confidence-based approach
        console.log('Processing attribution with confidence-based approach');
        const result = await processor.processAttribution(data);
        
        // Save to Supabase if client is initialized
        if (supabaseClient) {
          try {
            self.postMessage({
              type: 'PROGRESS',
              data: { message: 'Saving to Supabase...', progress: 95 }
            });
            
            const supabaseReportId = await SupabaseUtils.saveAttributionReport(result);
            
            // Add Supabase report ID to result
            result.supabase_report_id = supabaseReportId;
            
            console.log('✅ Successfully saved to Supabase with ID:', supabaseReportId);
          } catch (supabaseError) {
            console.error('❌ Failed to save to Supabase:', supabaseError.message);
            // Continue without failing - local file will still be saved
            result.supabase_error = supabaseError.message;
          }
        } else {
          console.log('ℹ️ Supabase not configured, skipping database save');
        }
        
        console.log('Attribution complete, sending result');
        self.postMessage({
          type: 'ATTRIBUTION_COMPLETE',
          data: result
        });
        break;
        
      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  } catch (error) {
    console.error('Worker error:', error);
    self.postMessage({
      type: 'ERROR',
      data: {
        message: error.message,
        stack: error.stack
      }
    });
  }
};