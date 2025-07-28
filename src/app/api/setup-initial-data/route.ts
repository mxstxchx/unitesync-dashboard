import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

export async function POST() {
  try {
    // Check if we already have saved reports
    const reportsDir = path.join(process.cwd(), 'attribution_reports')
    const latestFilepath = path.join(reportsDir, 'attribution_report_latest.json')
    
    // If latest report exists, no need to setup
    try {
      await fs.access(latestFilepath)
      return NextResponse.json({ 
        success: true,
        message: 'Attribution reports already exist',
        action: 'skipped' 
      })
    } catch {
      // File doesn't exist, proceed with setup
    }
    
    // Load the initial attribution report from the data directory
    const initialReportPath = path.join(process.cwd(), 'data', 'initial_attribution_report.json')
    
    try {
      const reportData = await fs.readFile(initialReportPath, 'utf8')
      const parsedReport = JSON.parse(reportData)
      
      // Create reports directory if it doesn't exist
      try {
        await fs.access(reportsDir)
      } catch {
        await fs.mkdir(reportsDir, { recursive: true })
      }
      
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const filename = `attribution_report_${timestamp}.json`
      const filepath = path.join(reportsDir, filename)
      
      // Save the report
      await fs.writeFile(filepath, JSON.stringify(parsedReport, null, 2))
      
      // Save as "latest" for easy loading
      await fs.writeFile(latestFilepath, JSON.stringify(parsedReport, null, 2))
      
      // Create metadata file
      const metadataFilepath = path.join(reportsDir, 'latest_metadata.json')
      const metadata = {
        filename,
        timestamp: new Date().toISOString(),
        processing_date: parsedReport.processing_date,
        total_clients: parsedReport.total_clients,
        attributed_clients: parsedReport.attributed_clients,
        attribution_rate: parsedReport.attribution_rate,
        source: 'initial_setup'
      }
      await fs.writeFile(metadataFilepath, JSON.stringify(metadata, null, 2))
      
      console.log('✅ Initial attribution report setup complete')
      console.log(`📁 Saved to: ${filepath}`)
      console.log(`📊 Report contains ${parsedReport.total_clients} clients`)
      
      return NextResponse.json({
        success: true,
        message: 'Initial attribution report setup complete',
        action: 'created',
        filename,
        metadata
      })
      
    } catch (fileError) {
      return NextResponse.json({
        success: false,
        message: 'No initial attribution report found in data directory',
        action: 'no_initial_data',
        details: 'Run the attribution worker to generate your first report'
      })
    }
    
  } catch (error) {
    console.error('❌ Failed to setup initial attribution report:', error)
    return NextResponse.json(
      { 
        error: 'Failed to setup initial attribution report', 
        details: error.message 
      },
      { status: 500 }
    )
  }
}