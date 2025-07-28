// Waterfall Attribution Worker - Correct Implementation
// Implements proper pipeline-based attribution with timing analysis

// Core attribution utility functions
const AttributionUtils = {
  // Extract invitation code from report links (both UUID and non-UUID formats)
  extractInvitationCode(reportLink) {
    if (!reportLink) return null;
    
    // UUID format (invite.unitesync.com)
    const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    const uuidMatch = reportLink.match(uuidPattern);
    if (uuidMatch) return uuidMatch[0];
    
    // Non-UUID format (pub.unitesync.com)
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

  // Determine email variant from subject line patterns
  determineEmailVariant(emailData) {
    const { subject, content } = emailData;
    
    // Check if this is a subsequence email
    if (this.isSubsequenceEmail(content)) {
      if (content.includes('can view your report and sign up directly via this link below')) {
        return {
          sequence: 'V3_Positive_Subsequence',
          variant: 'A',
          confidence: 0.9,
          type: 'subsequence'
        };
      }
    }
    
    // V3 New Method patterns
    const v3Patterns = [
      { pattern: /Mechanical royalties for your music are unclaimed/i, variant: 'A' },
      { pattern: /Missing publishing royalties/i, variant: 'B' },
      { pattern: /Unclaimed mechanical royalties/i, variant: 'C' },
      { pattern: /Your music royalties are waiting/i, variant: 'D' }
    ];
    
    for (const { pattern, variant } of v3Patterns) {
      if (pattern.test(subject)) {
        return {
          sequence: 'V3_New_Method',
          variant: variant,
          confidence: 0.9,
          type: 'main'
        };
      }
    }
    
    // Old method patterns
    if (/mechanical royalties tied to your music/i.test(subject)) {
      return {
        sequence: 'Old_Method',
        variant: 'A',
        confidence: 0.9,
        type: 'main'
      };
    }
    
    return {
      sequence: 'Unknown',
      variant: 'Unknown',
      confidence: 0.3,
      type: 'unknown'
    };
  },

  // Check if email is a subsequence email
  isSubsequenceEmail(content) {
    const subsequenceIndicators = [
      'following up',
      'follow up',
      'wanted to circle back',
      'checking back',
      'hope you had a chance',
      'did you get a chance'
    ];
    
    return subsequenceIndicators.some(indicator => 
      content.toLowerCase().includes(indicator.toLowerCase())
    );
  }
};

// Waterfall Attribution Processor
class WaterfallAttributionProcessor {
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
    console.log('🔍 Starting Waterfall Attribution Processing');
    
    // Step 1: Load all data sources
    this.reportProgress('Loading all data sources...', 0);
    await this.loadAllDataSources(data);
    
    // Step 2: Process waterfall attribution
    this.reportProgress('Processing waterfall attribution...', 20);
    const results = await this.processWaterfallAttribution();
    
    // Step 3: Generate comprehensive final report
    this.reportProgress('Generating final report...', 80);
    const finalReport = await this.generateFinalReport(results);
    
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
    this.convrtAuditStatus = data.convrtAuditStatus || [];
    this.convrtReportStatus = data.convrtReportStatus || [];
    
    // Load statistics
    this.v1ContactStats = data.v1ContactStats || [];
    this.v2ContactStats = data.v2ContactStats || [];
    this.v3ContactStats = data.v3ContactStats || [];
    this.v3SubsequenceStats = data.v3SubsequenceStats || [];
    this.inboundAuditStats = data.inboundAuditStats || [];
    
    console.log('📊 Loaded data sources:');
    console.log(`   Contacts: ${this.contacts.length}`);
    console.log(`   Clients: ${this.clients.length}`);
    console.log(`   V1 Stats: ${this.v1ContactStats.length}`);
    console.log(`   V2 Stats: ${this.v2ContactStats.length}`);
    console.log(`   V3 Stats: ${this.v3ContactStats.length}`);
    console.log(`   Audit Stats: ${this.inboundAuditStats.length}`);
    console.log(`   Convrt Leads: ${this.convrtLeads.length}`);
    console.log(`   Audits: ${this.audits.length}`);
    
    // Debug: Show sample data structures
    if (this.convrtLeads.length > 0) {
      console.log('🔍 Sample Convrt Lead keys:', Object.keys(this.convrtLeads[0]));
    }
    
    // Debug: Count clients with Spotify IDs
    const clientsWithSpotifyId = this.clients.filter(c => c.spotify_id).length;
    console.log(`   Clients with Spotify ID: ${clientsWithSpotifyId}`);
  }

  // Main waterfall attribution logic
  async processWaterfallAttribution() {
    const results = {
      'Email Outreach - Old Method': [],
      'Email Outreach - New Method': [],
      'Instagram Outreach': [],
      'Royalty Audit': [],
      'Unattributed': []
    };

    console.log('🔍 Starting Waterfall Attribution');
    console.log('📊 Total clients to process:', this.clients.length);

    for (const client of this.clients) {
      const clientSignupDate = AttributionUtils.parseClientDate(client.signup_date || client.created_at);
      if (!clientSignupDate) {
        results['Unattributed'].push(client);
        continue;
      }

      let attributed = false;
      
      // Step 1: Try V1/V2 Email Outreach (Old Method)
      if (!attributed) {
        const oldMethodMatch = await this.tryEmailAttribution(client, clientSignupDate, 'old');
        if (oldMethodMatch) {
          results['Email Outreach - Old Method'].push({
            ...client,
            attribution_source: 'Email Outreach - Old Method',
            attribution_method: 'timing_analysis',
            attribution_confidence: 0.90,
            attribution_details: oldMethodMatch
          });
          attributed = true;
          console.log(`✅ Old Method: ${client.email}`);
        }
      }

      // Step 2: Try V3 Email Outreach (New Method)
      if (!attributed) {
        const newMethodMatch = await this.tryEmailAttribution(client, clientSignupDate, 'new');
        if (newMethodMatch) {
          results['Email Outreach - New Method'].push({
            ...client,
            attribution_source: 'Email Outreach - New Method',
            attribution_method: 'timing_analysis',
            attribution_confidence: 0.90,
            attribution_details: newMethodMatch
          });
          attributed = true;
          console.log(`✅ New Method: ${client.email}`);
        }
      }

      // Step 3: Try Instagram Outreach (with cross-pipeline timing check)
      if (!attributed) {
        const instagramMatch = await this.tryInstagramAttribution(client, clientSignupDate);
        if (instagramMatch) {
          console.log(`🎯 Instagram match found: ${client.email} -> ${instagramMatch.handle}`);
          // Check if this client was contacted via email BEFORE Instagram
          const emailContactDate = await this.getEarliestEmailContactDate(client);
          const instagramContactDate = instagramMatch.contacted_date;
          
          if (emailContactDate && instagramContactDate && emailContactDate < instagramContactDate) {
            // Email contact came first, try email attribution instead
            const emailMatch = await this.tryEmailAttribution(client, clientSignupDate, 'any');
            if (emailMatch) {
              const pipeline = emailMatch.version === 'V3' ? 'Email Outreach - New Method' : 'Email Outreach - Old Method';
              results[pipeline].push({
                ...client,
                attribution_source: pipeline,
                attribution_method: 'cross_pipeline_timing',
                attribution_confidence: 0.90,
                attribution_details: emailMatch,
                cross_pipeline_note: 'Email contact preceded Instagram contact'
              });
              attributed = true;
              console.log(`✅ Cross-pipeline (Email before Instagram): ${client.email}`);
            }
          } else {
            // Instagram contact came first or no email contact
            results['Instagram Outreach'].push({
              ...client,
              attribution_source: 'Instagram Outreach',
              attribution_method: 'spotify_id_matching',
              attribution_confidence: 0.75,
              attribution_details: instagramMatch
            });
            attributed = true;
            console.log(`✅ Instagram: ${client.email}`);
          }
        }
      }

      // Step 4: Try Royalty Audit (with cross-pipeline timing check)
      if (!attributed) {
        const auditMatch = await this.tryAuditAttribution(client, clientSignupDate);
        if (auditMatch) {
          // Check if this client was contacted via email or Instagram BEFORE audit
          const emailContactDate = await this.getEarliestEmailContactDate(client);
          const instagramContactDate = await this.getInstagramContactDate(client);
          const auditRequestDate = auditMatch.audit_date;
          
          let earlierContactDate = null;
          let earlierSource = null;
          
          if (emailContactDate && (!instagramContactDate || emailContactDate < instagramContactDate)) {
            earlierContactDate = emailContactDate;
            earlierSource = 'email';
          } else if (instagramContactDate) {
            earlierContactDate = instagramContactDate;
            earlierSource = 'instagram';
          }
          
          if (earlierContactDate && earlierContactDate < auditRequestDate) {
            // Earlier contact found, attribute to that source
            if (earlierSource === 'email') {
              const emailMatch = await this.tryEmailAttribution(client, clientSignupDate, 'any');
              if (emailMatch) {
                const pipeline = emailMatch.version === 'V3' ? 'Email Outreach - New Method' : 'Email Outreach - Old Method';
                results[pipeline].push({
                  ...client,
                  attribution_source: pipeline,
                  attribution_method: 'cross_pipeline_timing',
                  attribution_confidence: 0.90,
                  attribution_details: emailMatch,
                  cross_pipeline_note: 'Email contact preceded audit request'
                });
                attributed = true;
                console.log(`✅ Cross-pipeline (Email before Audit): ${client.email}`);
              }
            } else if (earlierSource === 'instagram') {
              const instagramMatch = await this.tryInstagramAttribution(client, clientSignupDate);
              if (instagramMatch) {
                results['Instagram Outreach'].push({
                  ...client,
                  attribution_source: 'Instagram Outreach',
                  attribution_method: 'cross_pipeline_timing',
                  attribution_confidence: 0.75,
                  attribution_details: instagramMatch,
                  cross_pipeline_note: 'Instagram contact preceded audit request'
                });
                attributed = true;
                console.log(`✅ Cross-pipeline (Instagram before Audit): ${client.email}`);
              }
            }
          } else {
            // No earlier contact or audit came first
            results['Royalty Audit'].push({
              ...client,
              attribution_source: 'Royalty Audit',
              attribution_method: 'audit_timing',
              attribution_confidence: 0.70,
              attribution_details: auditMatch
            });
            attributed = true;
            console.log(`✅ Audit: ${client.email}`);
          }
        }
      }

      // Step 5: Try invitation code fallback for email outreach
      if (!attributed) {
        const invitationMatch = await this.tryInvitationCodeFallback(client);
        if (invitationMatch) {
          const pipeline = invitationMatch.isV3 ? 'Email Outreach - New Method' : 'Email Outreach - Old Method';
          results[pipeline].push({
            ...client,
            attribution_source: pipeline,
            attribution_method: 'invitation_code',
            attribution_confidence: 0.85,
            attribution_details: invitationMatch
          });
          attributed = true;
          console.log(`✅ Invitation (${pipeline}): ${client.email}`);
        }
      }

      // Step 6: Unattributed
      if (!attributed) {
        results['Unattributed'].push(client);
      }
    }

    console.log('📊 Waterfall Attribution Results:');
    console.log(`   Old Method: ${results['Email Outreach - Old Method'].length}`);
    console.log(`   New Method: ${results['Email Outreach - New Method'].length}`);
    console.log(`   Instagram: ${results['Instagram Outreach'].length}`);
    console.log(`   Audit: ${results['Royalty Audit'].length}`);
    console.log(`   Unattributed: ${results['Unattributed'].length}`);

    return results;
  }

  // Try email attribution for specific version
  async tryEmailAttribution(client, clientSignupDate, version) {
    let statsToCheck = [];
    
    if (version === 'old') {
      statsToCheck = [...this.v1ContactStats, ...this.v2ContactStats];
    } else if (version === 'new') {
      statsToCheck = [...this.v3ContactStats, ...this.v3SubsequenceStats];
    } else if (version === 'any') {
      statsToCheck = [...this.v1ContactStats, ...this.v2ContactStats, ...this.v3ContactStats, ...this.v3SubsequenceStats];
    }

    for (const stat of statsToCheck) {
      if (stat['Contact email address'] === client.email) {
        const contactedDate = AttributionUtils.parseSalesforceDate(stat['Contacted date']);
        if (!contactedDate) continue;

        const daysDiff = AttributionUtils.daysDifference(contactedDate, clientSignupDate);
        
        // Attribution window: email sent 1-90 days before signup
        if (daysDiff >= 1 && daysDiff <= 90) {
          const variantData = AttributionUtils.determineEmailVariant({ 
            subject: stat['From email'] || '', 
            content: stat['Email content'] || '' 
          });
          
          return {
            days_difference: daysDiff,
            contacted_date: contactedDate,
            variant: variantData,
            version: this.determineStatVersion(stat),
            from_email: stat['From email'],
            opened_date: stat['Opened date'],
            replied_date: stat['Replied date']
          };
        }
      }
    }
    
    return null;
  }

  // Try Instagram attribution
  async tryInstagramAttribution(client, clientSignupDate) {
    if (!client.spotify_id) return null;

    // Debug: Check first few Convrt leads structure
    if (this.convrtLeads.length > 0 && Math.random() < 0.1) {
      console.log('🔍 DEBUG: Sample Convrt lead structure:', this.convrtLeads[0]);
      console.log('🔍 DEBUG: Client Spotify ID:', client.spotify_id);
    }

    // Find matching Convrt lead by Spotify ID
    const matchingLead = this.convrtLeads.find(lead => 
      lead.spotify_id === client.spotify_id
    );

    if (!matchingLead) return null;

    // Get campaign status data
    const auditStatus = this.convrtAuditStatus.find(status => 
      status.handle === matchingLead.handle || status.full_name === matchingLead.full_name
    );
    
    const reportStatus = this.convrtReportStatus.find(status => 
      status.handle === matchingLead.handle || status.full_name === matchingLead.full_name
    );

    return {
      spotify_id: client.spotify_id,
      handle: matchingLead.handle,
      method: matchingLead.method,
      campaign_id: auditStatus?.campaign_id || reportStatus?.campaign_id,
      contacted_date: auditStatus?.sent || reportStatus?.sent,
      replied_date: auditStatus?.replied || reportStatus?.replied,
      blocked: auditStatus?.blocked || reportStatus?.blocked
    };
  }

  // Try audit attribution
  async tryAuditAttribution(client, clientSignupDate) {
    if (!client.spotify_id) return null;

    // Find matching audit request
    const matchingAudit = this.audits.find(audit => 
      audit.spotify_id === client.spotify_id
    );

    if (!matchingAudit) return null;

    const auditDate = new Date(matchingAudit.created_at);
    const daysDiff = AttributionUtils.daysDifference(auditDate, clientSignupDate);
    
    // Audit should be within 30 days of signup
    if (daysDiff >= -30 && daysDiff <= 30) {
      return {
        audit_date: auditDate,
        days_difference: daysDiff,
        referral_source: matchingAudit.referral_source,
        artist_name: matchingAudit.artist_name,
        has_sent_webhook: matchingAudit.has_sent_webhook
      };
    }
    
    return null;
  }

  // Try invitation code fallback
  async tryInvitationCodeFallback(client) {
    if (!client.invitation_code) return null;

    // Find matching contact with same invitation code
    const matchingContact = this.contacts.find(contact => {
      const extractedCode = AttributionUtils.extractInvitationCode(contact.customVars?.report_link);
      return extractedCode === client.invitation_code;
    });

    if (!matchingContact) return null;

    // Determine if this is V3 or older based on contact data
    const isV3 = this.determineIfV3Contact(matchingContact);

    return {
      invitation_code: client.invitation_code,
      contact_email: matchingContact.email,
      isV3: isV3,
      report_link: matchingContact.customVars?.report_link
    };
  }

  // Helper functions
  async getEarliestEmailContactDate(client) {
    const allStats = [...this.v1ContactStats, ...this.v2ContactStats, ...this.v3ContactStats, ...this.v3SubsequenceStats];
    let earliestDate = null;
    
    for (const stat of allStats) {
      if (stat['Contact email address'] === client.email) {
        const contactedDate = AttributionUtils.parseSalesforceDate(stat['Contacted date']);
        if (contactedDate && (!earliestDate || contactedDate < earliestDate)) {
          earliestDate = contactedDate;
        }
      }
    }
    
    return earliestDate;
  }

  async getInstagramContactDate(client) {
    if (!client.spotify_id) return null;

    const matchingLead = this.convrtLeads.find(lead => 
      lead.spotify_id === client.spotify_id
    );

    if (!matchingLead) return null;

    const auditStatus = this.convrtAuditStatus.find(status => 
      status.handle === matchingLead.handle || status.full_name === matchingLead.full_name
    );
    
    const reportStatus = this.convrtReportStatus.find(status => 
      status.handle === matchingLead.handle || status.full_name === matchingLead.full_name
    );

    const contactDate = auditStatus?.sent || reportStatus?.sent;
    return contactDate ? new Date(contactDate) : null;
  }

  determineStatVersion(stat) {
    // Determine version based on which stats array it came from
    if (this.v1ContactStats.includes(stat)) return 'V1';
    if (this.v2ContactStats.includes(stat)) return 'V2';
    if (this.v3ContactStats.includes(stat)) return 'V3';
    if (this.v3SubsequenceStats.includes(stat)) return 'V3_Subsequence';
    return 'Unknown';
  }

  determineIfV3Contact(contact) {
    // Simple heuristic - V3 contacts typically have more recent created_at dates
    const contactDate = new Date(contact.created_at || contact.createdAt);
    const cutoffDate = new Date('2025-03-01'); // V3 started in March 2025
    return contactDate >= cutoffDate;
  }

  // Generate final report
  async generateFinalReport(waterfallResults) {
    const attributionCounts = {};
    const revenueCounts = {};
    const allAttributedClients = [];

    // Process results from waterfall
    for (const [pipeline, clients] of Object.entries(waterfallResults)) {
      attributionCounts[pipeline] = clients.length;
      revenueCounts[pipeline] = clients.reduce((sum, client) => sum + (parseFloat(client.revenue) || 0), 0);
      allAttributedClients.push(...clients);
    }

    const totalClients = this.clients.length;
    const attributedCount = totalClients - attributionCounts['Unattributed'];
    const attributionRate = totalClients > 0 ? ((attributedCount / totalClients) * 100).toFixed(1) : '0.0';

    console.log('📊 Final Attribution Report:');
    console.log(`   Total clients: ${totalClients}`);
    console.log(`   Attributed clients: ${attributedCount}`);
    console.log(`   Attribution rate: ${attributionRate}%`);
    console.log('   Pipeline breakdown:', attributionCounts);

    return {
      processing_date: new Date().toISOString(),
      total_clients: totalClients,
      attributed_clients: attributedCount,
      attribution_rate: `${attributionRate}%`,
      attribution_breakdown: attributionCounts,
      revenue_breakdown: revenueCounts,
      attributed_clients_data: allAttributedClients,
      data_sources_summary: {
        contacts: this.contacts.length,
        v1_contact_stats: this.v1ContactStats.length,
        v2_contact_stats: this.v2ContactStats.length,
        v3_contact_stats: this.v3ContactStats.length,
        v3_subsequence_stats: this.v3SubsequenceStats.length,
        convrt_leads: this.convrtLeads.length,
        audits: this.audits.length
      },
      methodology: [
        'Waterfall attribution with pipeline-specific timing analysis',
        'Cross-pipeline timing checks prevent double attribution',
        'V1/V2 statistics → Email Outreach - Old Method',
        'V3 statistics → Email Outreach - New Method',
        'Instagram attribution with Spotify ID matching',
        'Audit attribution with timing validation',
        'Invitation code matching as fallback for email outreach'
      ]
    };
  }
}

// Worker message handler
self.onmessage = async function(e) {
  const { type, data } = e.data;
  
  console.log('Worker received message:', { type, dataKeys: Object.keys(data || {}) });
  
  try {
    switch (type) {
      case 'PROCESS_ATTRIBUTION':
        console.log('Starting waterfall attribution processing...');
        const processor = new WaterfallAttributionProcessor();
        
        // Set up progress reporting
        processor.setProgressCallback((progress) => {
          console.log('Worker progress:', progress);
          self.postMessage({
            type: 'PROGRESS',
            data: progress
          });
        });
        
        // Process attribution with waterfall logic
        console.log('Processing attribution with waterfall approach');
        const result = await processor.processAttribution(data);
        
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