import { readdir, unlink, rmdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export async function cleanupTempFiles() {
  const tempDir = path.join(process.cwd(), 'temp');
  
  if (!existsSync(tempDir)) {
    return;
  }

  try {
    const sessions = await readdir(tempDir);
    const now = Date.now();
    const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds

    for (const session of sessions) {
      const sessionTime = parseInt(session);
      if (now - sessionTime > oneHour) {
        const sessionPath = path.join(tempDir, session);
        try {
          const files = await readdir(sessionPath);
          for (const file of files) {
            await unlink(path.join(sessionPath, file));
          }
          await rmdir(sessionPath);
        } catch (error) {
          console.error(`Failed to cleanup session ${session}:`, error);
        }
      }
    }
  } catch (error) {
    console.error('Failed to cleanup temp files:', error);
  }
}