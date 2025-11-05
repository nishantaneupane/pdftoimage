import { NextRequest, NextResponse } from 'next/server';
import { readFile, stat } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params;
    
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    const zipPath = path.join(process.cwd(), 'temp', sessionId, 'images.zip');

    if (!existsSync(zipPath)) {
      return NextResponse.json({ error: 'ZIP file not found' }, { status: 404 });
    }

    // Read the ZIP file
    const buffer = await readFile(zipPath);
    const stats = await stat(zipPath);

    // Return the ZIP file as a download
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="pdf-images-${sessionId}.zip"`,
        'Content-Length': stats.size.toString(),
      },
    });

  } catch (error) {
    console.error('Error downloading ZIP:', error);
    return NextResponse.json({ error: 'Failed to download ZIP file' }, { status: 500 });
  }
}