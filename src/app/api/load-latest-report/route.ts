import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

export async function GET() {
  try {
    const reportsDir = path.join(process.cwd(), 'attribution_reports')
    const latestFilepath = path.join(reportsDir, 'attribution_report_latest.json')
    const metadataFilepath = path.join(reportsDir, 'latest_metadata.json')
    
    // Check if latest report exists
    try {
      await fs.access(latestFilepath)
    } catch {
      return NextResponse.json(
        { error: 'No saved attribution report found' },
        { status: 404 }
      )
    }
    
    // Load the report data
    const reportData = await fs.readFile(latestFilepath, 'utf8')
    const parsedReport = JSON.parse(reportData)
    
    // Load metadata if available
    let metadata = null
    try {
      const metadataContent = await fs.readFile(metadataFilepath, 'utf8')
      metadata = JSON.parse(metadataContent)
    } catch {
      // Metadata file doesn't exist, create basic metadata
      metadata = {
        timestamp: new Date().toISOString(),
        processing_date: parsedReport.processing_date,
        total_clients: parsedReport.total_clients,
        attributed_clients: parsedReport.attributed_clients,
        attribution_rate: parsedReport.attribution_rate
      }
    }
    
    console.log(`✅ Loaded latest attribution report from: ${latestFilepath}`)
    console.log(`📊 Report contains ${parsedReport.total_clients} clients with ${parsedReport.attribution_rate} attribution rate`)
    
    return NextResponse.json({
      success: true,
      report: parsedReport,
      metadata,
      source: 'filesystem'
    })
    
  } catch (error) {
    console.error('❌ Failed to load latest attribution report:', error)
    return NextResponse.json(
      { error: 'Failed to load attribution report', details: error.message },
      { status: 500 }
    )
  }
}