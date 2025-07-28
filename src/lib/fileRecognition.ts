// Flexible File Recognition System
// Pattern-based file matching with guided instructions

export interface FilePattern {
  key: string;
  patterns: RegExp[];
  type: 'json' | 'csv';
  required: boolean;
  source: 'api' | 'manual_download' | 'network_console';
  url?: string;
  networkInstructions?: string;
  description: string;
}

export const filePatterns: FilePattern[] = [
  {
    key: 'contacts',
    patterns: [
      /^all_contacts\.json$/i,
      /^contacts\.json$/i
    ],
    type: 'json',
    required: true,
    source: 'api',
    description: 'Salesforce contacts from API'
  },
  {
    key: 'clients', 
    patterns: [
      /^export_clients.*\.csv$/i,
      /^clients.*\.csv$/i,
      /^export-client.*\.csv$/i
    ],
    type: 'csv',
    required: true,
    source: 'manual_download',
    url: 'https://pubcontrol.unitesync.com/admin/export-client-new',
    description: 'Client data export from admin panel'
  },
  {
    key: 'threads',
    patterns: [
      /^threads\.json$/i,
      /^all_threads\.json$/i
    ],
    type: 'json',
    required: true,
    source: 'api',
    description: 'Email threads from Salesforce API'
  },
  {
    key: 'v1ContactStats',
    patterns: [
      /^V1_contacts_statistics.*\.csv$/i,
      /^V1.*statistics.*\.csv$/i,
      /^v1.*contact.*stats.*\.csv$/i
    ],
    type: 'csv', 
    required: true,
    source: 'manual_download',
    description: 'V1 sequence contact statistics'
  },
  {
    key: 'v2ContactStats',
    patterns: [
      /^V2_contacts_statistics.*\.csv$/i,
      /^V2.*statistics.*\.csv$/i,
      /^v2.*contact.*stats.*\.csv$/i
    ],
    type: 'csv',
    required: true,
    source: 'manual_download', 
    description: 'V2 sequence contact statistics'
  },
  {
    key: 'v3ContactStats',
    patterns: [
      /^V3_contacts_statistics.*\.csv$/i,
      /^V3.*statistics.*\.csv$/i,
      /^v3.*contact.*stats.*\.csv$/i
    ],
    type: 'csv',
    required: true,
    source: 'manual_download',
    description: 'V3 sequence contact statistics'
  },
  {
    key: 'v3SubsequenceStats',
    patterns: [
      /^V3_Positive_Subsequence_contacts_statistics.*\.csv$/i,
      /^V3.*subsequence.*statistics.*\.csv$/i,
      /^v3.*positive.*subsequence.*\.csv$/i,
      /^V3.*Positive.*Subsequence.*\.csv$/i
    ],
    type: 'csv',
    required: true,
    source: 'manual_download',
    description: 'V3 Positive Subsequence contact statistics'
  },
  {
    key: 'v1Emails',
    patterns: [
      /^V1_all_emails.*\.csv$/i,
      /^V1.*emails.*\.csv$/i,
      /^v1.*email.*\.csv$/i
    ],
    type: 'csv',
    required: false,
    source: 'manual_download',
    description: 'V1 sequence email exports (~30MB)'
  },
  {
    key: 'v2Emails',
    patterns: [
      /^V2_all_emails.*\.csv$/i,
      /^V2.*emails.*\.csv$/i,
      /^v2.*email.*\.csv$/i
    ],
    type: 'csv',
    required: false,
    source: 'manual_download',
    description: 'V2 sequence email exports (~30MB)'
  },
  {
    key: 'v3Emails',
    patterns: [
      /^V3_all_emails.*\.csv$/i,
      /^V3.*emails.*\.csv$/i,
      /^v3.*email.*\.csv$/i
    ],
    type: 'csv',
    required: false,
    source: 'manual_download',
    description: 'V3 sequence email exports (~30MB)'
  },
  {
    key: 'inboundAuditStats',
    patterns: [
      /^Inbound_audits_contacts_statistics.*\.csv$/i,
      /^Inbound.*audits.*statistics.*\.csv$/i,
      /^inbound.*audit.*stats.*\.csv$/i
    ],
    type: 'csv',
    required: true,
    source: 'manual_download',
    description: 'Inbound audit sequence statistics'
  },
  {
    key: 'audits',
    patterns: [
      /^audits\.json$/i,
      /^audit.*requests\.json$/i
    ],
    type: 'json',
    required: true,
    source: 'network_console',
    networkInstructions: 'Open UniteSync dashboard, inspect network tab, find audit requests endpoint',
    description: 'Audit requests from platform'
  },
  {
    key: 'convrtAuditStatus',
    patterns: [
      /^convrt_audit_link_status\.json$/i,
      /^audit.*status\.json$/i,
      /^convrt.*audit.*\.json$/i
    ],
    type: 'json',
    required: true,
    source: 'network_console',
    networkInstructions: 'Open Convrt dashboard, inspect network tab, find audit campaign status endpoint',
    description: 'Convrt audit campaign status'
  },
  {
    key: 'convrtReportStatus',
    patterns: [
      /^convrt_report_link_status\.json$/i,
      /^report.*status\.json$/i,
      /^convrt.*report.*\.json$/i
    ],
    type: 'json',
    required: true,
    source: 'network_console',
    networkInstructions: 'Open Convrt dashboard, inspect network tab, find report campaign status endpoint',
    description: 'Convrt report campaign status'
  },
  {
    key: 'convrtLeads',
    patterns: [
      /^convrt_leads\.csv$/i,
      /^convrt.*leads.*\.csv$/i,
      /^instagram.*leads.*\.csv$/i
    ],
    type: 'csv',
    required: true,
    source: 'manual_download',
    description: 'Instagram outreach leads data'
  },
  {
    key: 'auditEmails',
    patterns: [
      /^Audits_all_emails\.csv$/i,
      /^audit.*emails.*\.csv$/i,
      /^audits.*email.*\.csv$/i
    ],
    type: 'csv',
    required: false,
    source: 'manual_download',
    description: 'Audit sequence email exports'
  },
  {
    key: 'labels',
    patterns: [
      /^all_labels\.json$/i,
      /^labels\.json$/i,
      /^salesforce.*labels.*\.json$/i
    ],
    type: 'json',
    required: false,
    source: 'api',
    description: 'Salesforce labels from API'
  },
  {
    key: 'mailboxes',
    patterns: [
      /^all_mailboxes\.json$/i,
      /^mailboxes\.json$/i,
      /^salesforce.*mailboxes.*\.json$/i
    ],
    type: 'json',
    required: false,
    source: 'api',
    description: 'Salesforce mailboxes from API'
  },
  {
    key: 'sequences',
    patterns: [
      /^all_sequences\.json$/i,
      /^sequences\.json$/i,
      /^salesforce.*sequences.*\.json$/i
    ],
    type: 'json',
    required: false,
    source: 'api',
    description: 'Salesforce sequences from API'
  },
  {
    key: 'customVars',
    patterns: [
      /^customVars\.json$/i,
      /^custom.*vars.*\.json$/i,
      /^salesforce.*customvars.*\.json$/i
    ],
    type: 'json',
    required: false,
    source: 'api',
    description: 'Salesforce custom variables from API'
  }
];

export interface RecognizedFile {
  file: File;
  pattern: FilePattern;
  confidence: number;
}

export interface FileRecognitionResult {
  recognized: Record<string, RecognizedFile>;
  unrecognized: File[];
  missing: FilePattern[];
  isValid: boolean;
}

// Calculate match confidence based on pattern matching
function calculateMatchConfidence(fileName: string, patterns: RegExp[]): number {
  for (const pattern of patterns) {
    if (pattern.test(fileName)) {
      // Higher confidence for more specific patterns
      const patternStr = pattern.source;
      if (patternStr.includes('\\d') || patternStr.includes('.*')) {
        return 0.8; // Good match with wildcards
      }
      return 0.95; // Exact match
    }
  }
  return 0;
}

// Main file recognition function
export function recognizeUploadedFiles(uploadedFiles: File[]): FileRecognitionResult {
  const recognizedFiles: Record<string, RecognizedFile> = {};
  const unrecognizedFiles: File[] = [];
  const missingFiles: FilePattern[] = [];
  
  // Try to match each uploaded file
  uploadedFiles.forEach(file => {
    let matched = false;
    
    for (const pattern of filePatterns) {
      const confidence = calculateMatchConfidence(file.name, pattern.patterns);
      
      if (confidence > 0.7) {
        if (recognizedFiles[pattern.key]) {
          // Handle duplicate file types - keep the one with higher confidence
          if (confidence > recognizedFiles[pattern.key].confidence) {
            console.warn(`Replacing ${pattern.key} with higher confidence match: ${file.name}`);
            recognizedFiles[pattern.key] = {
              file,
              pattern,
              confidence
            };
          } else {
            console.warn(`Ignoring duplicate file for ${pattern.key}: ${file.name}`);
          }
        } else {
          recognizedFiles[pattern.key] = {
            file,
            pattern,
            confidence
          };
        }
        matched = true;
        break;
      }
    }
    
    if (!matched) {
      unrecognizedFiles.push(file);
    }
  });
  
  // Check for missing required files
  filePatterns.forEach(pattern => {
    if (pattern.required && !recognizedFiles[pattern.key]) {
      missingFiles.push(pattern);
    }
  });
  
  return {
    recognized: recognizedFiles,
    unrecognized: unrecognizedFiles,
    missing: missingFiles,
    isValid: missingFiles.length === 0
  };
}

// Get download instructions for a file pattern
export function getDownloadInstructions(pattern: FilePattern): string {
  switch (pattern.source) {
    case 'api':
      return `This file can be automatically fetched from the API. Use the "Auto-fetch" button or upload a manually downloaded version.`;
    
    case 'manual_download':
      return pattern.url 
        ? `Download from: ${pattern.url}\n\nExpected file patterns: ${pattern.patterns.map(p => p.source).join(', ')}`
        : `Manual download required from Salesforce UI.\n\nExpected file patterns: ${pattern.patterns.map(p => p.source).join(', ')}`;
    
    case 'network_console':
      return `${pattern.networkInstructions}\n\nSave the response as a JSON file with one of these names: ${pattern.patterns.map(p => p.source).join(', ')}`;
    
    default:
      return `Upload a file matching one of these patterns: ${pattern.patterns.map(p => p.source).join(', ')}`;
  }
}

// Check if file recognition is complete
export function isRecognitionComplete(result: FileRecognitionResult): boolean {
  return result.isValid && result.unrecognized.length === 0;
}

// Get file statistics
export function getFileStats(result: FileRecognitionResult) {
  const totalFiles = Object.keys(result.recognized).length + result.unrecognized.length;
  const recognizedCount = Object.keys(result.recognized).length;
  const missingCount = result.missing.length;
  const unrecognizedCount = result.unrecognized.length;
  
  return {
    totalFiles,
    recognizedCount,
    missingCount,
    unrecognizedCount,
    recognitionRate: totalFiles > 0 ? (recognizedCount / totalFiles) * 100 : 0
  };
}