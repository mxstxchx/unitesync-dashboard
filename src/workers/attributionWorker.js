// Attribution Worker - Implements proven attribution logic for client-side processing
// Based on the successful attribution system that achieved 71.7% attribution rate

// Core attribution utility functions
const AttributionUtils = {
  // Extract invitation code from report links (both UUID and non-UUID formats)
  extractInvitationCode(reportLink) {
    if (!reportLink) return null;
    
    // UUID format (invite.unitesync.com)
    const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    const uuidMatch = reportLink.match(uuidPattern);
    if (uuidMatch) return uuidMatch[0];
    
    // Non-UUID format (pub.unitesync.com) - THE CRITICAL FIX
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
      /\/album\/([a-zA-Z0-9]+)/
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
    return new Date(dateStr);
  },

  // Calculate days difference between two dates
  daysDifference(date1, date2) {
    if (!date1 || !date2) return null;
    const timeDiff = date2.getTime() - date1.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  },

  // Determine email variant from subject line patterns
  determineEmailVariant(subject) {
    if (!subject) return null;
    
    // V3 New Method patterns
    const v3Patterns = [
      { pattern: /Mechanical royalties for your music are unclaimed/i, variant: 'A (Default)' },
      { pattern: /Missing publishing royalties/i, variant: 'B' },
      { pattern: /Unclaimed mechanical royalties/i, variant: 'C' },
      { pattern: /Your music royalties are waiting/i, variant: 'D' }
    ];
    
    for (const { pattern, variant } of v3Patterns) {
      if (pattern.test(subject)) {
        return `V3_${variant}`;
      }
    }
    
    // Old method patterns
    if (/mechanical royalties tied to your music/i.test(subject)) {
      return 'Old_Method';
    }
    
    return null;
  },

  // Important sequence IDs for attribution
  SEQUENCE_IDS: {
    OLD_METHOD: ['seq_quao1gj12nqsypj99outg', 'seq_haajawk44uxpgttihmeuz'],
    NEW_METHOD_MAIN: 'seq_wi7oitk80ujguc59z7nct',
    NEW_METHOD_SUBSEQUENCE: 'seq_yq8zuesfv8h4z67pgu7po'
  }
};

// Main attribution processor
class AttributionProcessor {
  constructor() {
    this.contacts = [];
    this.clients = [];
    this.audits = [];
    this.convrtLeads = [];
    this.threads = [];
    this.progressCallback = null;
  }

  // Set progress callback for UI updates
  setProgressCallback(callback) {
    this.progressCallback = callback;
  }

  // Report progress to main thread
  reportProgress(message, progress) {
    if (this.progressCallback) {
      this.progressCallback({ message, progress });
    }
  }

  // Process all attribution data
  async processAttribution(data) {
    this.reportProgress('Loading data files...', 0);
    
    // Load and validate all data sources
    this.contacts = data.contacts || [];
    this.clients = data.clients || [];
    this.audits = data.audits || [];
    this.convrtLeads = data.convrtLeads || [];
    this.threads = data.threads || [];

    this.reportProgress('Starting attribution analysis...', 10);

    // Step 1: Direct Salesforce timing analysis (highest confidence)
    const directSalesforceMatches = await this.processDirectSalesforceAttribution();
    this.reportProgress('Direct Salesforce attribution complete', 30);

    // Step 2: Invitation code matching for additional Salesforce attribution
    const invitationMatches = await this.processInvitationCodeAttribution();
    this.reportProgress('Invitation code attribution complete', 50);

    // Step 3: Instagram outreach attribution via Convrt
    const instagramMatches = await this.processInstagramAttribution();
    this.reportProgress('Instagram attribution complete', 70);

    // Step 4: Royalty audit attribution
    const auditMatches = await this.processAuditAttribution();
    this.reportProgress('Audit attribution complete', 85);

    // Step 5: Generate final attribution report
    const finalReport = await this.generateFinalReport();
    this.reportProgress('Attribution processing complete', 100);

    return finalReport;
  }

  // Direct Salesforce attribution using timing analysis (0.90 confidence)
  async processDirectSalesforceAttribution() {
    const matches = [];
    
    for (const client of this.clients) {
      const clientSignupDate = AttributionUtils.parseClientDate(client.signup_date);
      if (!clientSignupDate) continue;

      // Find matching contact by email or Spotify ID
      const matchingContact = this.contacts.find(contact => 
        contact.email === client.email || 
        (client.spotify_id && AttributionUtils.extractSpotifyId(contact.customVars?.spotify_artist_url) === client.spotify_id)
      );

      if (matchingContact) {
        // Find outreach emails for this contact
        const outreachEmails = this.getOutreachEmailsForContact(matchingContact.email);
        
        for (const email of outreachEmails) {
          const emailDate = AttributionUtils.parseSalesforceDate(email.date);
          if (!emailDate) continue;

          const daysDiff = AttributionUtils.daysDifference(emailDate, clientSignupDate);
          
          // Attribution window: email sent 1-90 days before signup
          if (daysDiff >= 1 && daysDiff <= 90) {
            matches.push({
              client_id: client.id,
              attribution_source: 'Email Outreach',
              attribution_method: 'timing_analysis',
              attribution_confidence: 0.90,
              sequence_id: email.sequence_id,
              days_difference: daysDiff,
              email_variant: AttributionUtils.determineEmailVariant(email.subject)
            });
            break; // One match per client
          }
        }
      }
    }

    return matches;
  }

  // Invitation code attribution for additional Salesforce matches (0.85 confidence)
  async processInvitationCodeAttribution() {
    const matches = [];
    
    for (const client of this.clients) {
      if (!client.invitation_code) continue;

      // Find matching contact with same invitation code in report_link
      const matchingContact = this.contacts.find(contact => {
        const extractedCode = AttributionUtils.extractInvitationCode(contact.customVars?.report_link);
        return extractedCode === client.invitation_code;
      });

      if (matchingContact) {
        matches.push({
          client_id: client.id,
          attribution_source: 'Email Outreach',
          attribution_method: 'invitation_code',
          attribution_confidence: 0.85,
          invitation_code: client.invitation_code
        });
      }
    }

    return matches;
  }

  // Instagram outreach attribution via Convrt (0.80 confidence)
  async processInstagramAttribution() {
    const matches = [];
    
    for (const client of this.clients) {
      if (!client.spotify_id) continue;

      // Find matching Convrt lead
      const matchingLead = this.convrtLeads.find(lead => 
        lead.spotify_id === client.spotify_id
      );

      if (matchingLead) {
        matches.push({
          client_id: client.id,
          attribution_source: 'Instagram Outreach',
          attribution_method: 'convrt_matching',
          attribution_confidence: 0.80,
          convrt_method: matchingLead.method // report_link or audit_link
        });
      }
    }

    return matches;
  }

  // Audit attribution for inbound requests (0.70 confidence)
  async processAuditAttribution() {
    const matches = [];
    
    for (const client of this.clients) {
      if (!client.spotify_id) continue;

      // Find matching audit request
      const matchingAudit = this.audits.find(audit => 
        audit.spotify_id === client.spotify_id
      );

      if (matchingAudit) {
        const auditDate = new Date(matchingAudit.created_at);
        const clientDate = AttributionUtils.parseClientDate(client.signup_date);
        
        if (clientDate && auditDate) {
          const daysDiff = AttributionUtils.daysDifference(auditDate, clientDate);
          
          // Audit should be within 30 days of signup
          if (daysDiff >= -30 && daysDiff <= 30) {
            matches.push({
              client_id: client.id,
              attribution_source: 'Royalty Audit',
              attribution_method: 'audit_matching',
              attribution_confidence: 0.70,
              audit_referral_source: matchingAudit.referral_source,
              days_difference: daysDiff
            });
          }
        }
      }
    }

    return matches;
  }

  // Get outreach emails for a specific contact
  getOutreachEmailsForContact(contactEmail) {
    const emails = [];
    
    for (const thread of this.threads) {
      const threadEmails = thread.emails || [];
      
      for (const email of threadEmails) {
        if (email.toAddress === contactEmail && email.type === 'me') {
          // Extract sequence ID from automated emails
          const sequenceId = this.extractSequenceIdFromEmail(email);
          
          emails.push({
            ...email,
            sequence_id: sequenceId
          });
        }
      }
    }
    
    return emails;
  }

  // Extract sequence ID from email ID pattern
  extractSequenceIdFromEmail(email) {
    // Automated sequence emails start with 'sqe_'
    if (email.id && email.id.startsWith('sqe_')) {
      // Try to match against known sequence IDs
      const { SEQUENCE_IDS } = AttributionUtils;
      
      // Check if this is from V3 new method
      if (email.subject && /Mechanical royalties for your music are unclaimed|Missing publishing royalties|Unclaimed mechanical royalties|Your music royalties are waiting/i.test(email.subject)) {
        return SEQUENCE_IDS.NEW_METHOD_MAIN;
      }
      
      // Check for subsequence patterns
      if (email.subject && /follow.up|reminder|checking.back/i.test(email.subject)) {
        return SEQUENCE_IDS.NEW_METHOD_SUBSEQUENCE;
      }
      
      // Default to old method if pattern matches
      if (email.subject && /mechanical royalties tied to your music/i.test(email.subject)) {
        return SEQUENCE_IDS.OLD_METHOD[0];
      }
    }
    
    return null;
  }

  // Generate final attribution report
  async generateFinalReport() {
    const attributionCounts = {
      'Email Outreach': 0,
      'Instagram Outreach': 0,
      'Royalty Audit': 0,
      'Unattributed': 0
    };

    const revenueCounts = {
      'Email Outreach': 0,
      'Instagram Outreach': 0,
      'Royalty Audit': 0,
      'Unattributed': 0
    };

    const attributedClients = [];

    // Process all clients and apply attribution
    for (const client of this.clients) {
      let bestAttribution = null;
      let highestConfidence = 0;

      // Apply attribution priority (highest confidence wins)
      // Priority: Direct Salesforce > Invitation Code > Instagram > Audit

      // Check all attribution methods and pick the highest confidence
      const allAttributions = [
        ...this.directSalesforceMatches || [],
        ...this.invitationMatches || [],
        ...this.instagramMatches || [],
        ...this.auditMatches || []
      ];

      for (const attribution of allAttributions) {
        if (attribution.client_id === client.id && attribution.attribution_confidence > highestConfidence) {
          bestAttribution = attribution;
          highestConfidence = attribution.attribution_confidence;
        }
      }

      // Apply attribution or mark as unattributed
      if (bestAttribution) {
        attributionCounts[bestAttribution.attribution_source]++;
        revenueCounts[bestAttribution.attribution_source] += client.revenue || 0;
        
        attributedClients.push({
          ...client,
          attribution_source: bestAttribution.attribution_source,
          attribution_confidence: bestAttribution.attribution_confidence,
          attribution_method: bestAttribution.attribution_method,
          attribution_sequence: bestAttribution.sequence_id || null,
          attribution_days_diff: bestAttribution.days_difference || null,
          attribution_invitation_code: bestAttribution.invitation_code || null
        });
      } else {
        attributionCounts['Unattributed']++;
        revenueCounts['Unattributed'] += client.revenue || 0;
        
        attributedClients.push({
          ...client,
          attribution_source: 'Unattributed',
          attribution_confidence: 0,
          attribution_method: 'none',
          attribution_sequence: null,
          attribution_days_diff: null,
          attribution_invitation_code: null
        });
      }
    }

    const totalClients = this.clients.length;
    const attributedCount = totalClients - attributionCounts['Unattributed'];
    const attributionRate = totalClients > 0 ? ((attributedCount / totalClients) * 100).toFixed(1) : '0.0';

    return {
      processing_date: new Date().toISOString(),
      total_clients: totalClients,
      attributed_clients: attributedCount,
      attribution_rate: `${attributionRate}%`,
      attribution_breakdown: attributionCounts,
      revenue_breakdown: revenueCounts,
      attributed_clients_data: attributedClients,
      methodology: [
        'Direct Salesforce timing analysis (0.90 confidence)',
        'Invitation code matching for additional Salesforce attribution (0.85 confidence)',
        'Instagram outreach attribution via Convrt (0.80 confidence)',
        'Royalty audit attribution for inbound requests (0.70 confidence)',
        'Priority-based attribution with highest confidence winning'
      ]
    };
  }
}

// Worker message handler
self.onmessage = async function(e) {
  const { type, data } = e.data;
  
  try {
    switch (type) {
      case 'PROCESS_ATTRIBUTION':
        const processor = new AttributionProcessor();
        
        // Set up progress reporting
        processor.setProgressCallback((progress) => {
          self.postMessage({
            type: 'PROGRESS',
            data: progress
          });
        });
        
        // Process attribution
        const result = await processor.processAttribution(data);
        
        self.postMessage({
          type: 'ATTRIBUTION_COMPLETE',
          data: result
        });
        break;
        
      case 'VALIDATE_DATA':
        // Validate data structure before processing
        const validation = validateDataStructure(data);
        
        self.postMessage({
          type: 'VALIDATION_COMPLETE',
          data: validation
        });
        break;
        
      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  } catch (error) {
    self.postMessage({
      type: 'ERROR',
      data: {
        message: error.message,
        stack: error.stack
      }
    });
  }
};

// Data validation function
function validateDataStructure(data) {
  const validation = {
    isValid: true,
    errors: [],
    warnings: [],
    summary: {}
  };

  // Check required data sources
  const requiredSources = ['contacts', 'clients', 'audits', 'convrtLeads', 'threads'];
  
  for (const source of requiredSources) {
    if (!data[source]) {
      validation.errors.push(`Missing required data source: ${source}`);
      validation.isValid = false;
    } else if (!Array.isArray(data[source])) {
      validation.errors.push(`Data source ${source} must be an array`);
      validation.isValid = false;
    } else {
      validation.summary[source] = data[source].length;
    }
  }

  // Validate data structure for each source
  if (data.contacts && data.contacts.length > 0) {
    const sample = data.contacts[0];
    if (!sample.email || !sample.customVars) {
      validation.warnings.push('Contacts data may be missing required fields (email, customVars)');
    }
  }

  if (data.clients && data.clients.length > 0) {
    const sample = data.clients[0];
    if (!sample.email || !sample.signup_date) {
      validation.warnings.push('Clients data may be missing required fields (email, signup_date)');
    }
  }

  return validation;
}

// Export for testing (not used in worker context)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AttributionUtils, AttributionProcessor };
}