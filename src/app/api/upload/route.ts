import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir, readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import archiver from "archiver";
import { createWriteStream } from "fs";
import { cleanupTempFiles } from "@/lib/cleanup";

// Configure for larger file uploads
export const runtime = "nodejs";
export const maxDuration = 60; // 60 seconds timeout

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Clean up old temp files
    cleanupTempFiles().catch(console.error);

    const data = await request.formData();
    const file: File | null = data.get("file") as unknown as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Only PDF files are allowed" },
        { status: 400 }
      );
    }

    // Create unique session ID
    const sessionId = Date.now().toString();
    const sessionDir = path.join(process.cwd(), "temp", sessionId);
    const uploadsDir = path.join(process.cwd(), "uploads");

    // Ensure directories exist
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }
    if (!existsSync(sessionDir)) {
      await mkdir(sessionDir, { recursive: true });
    }

    // Save uploaded PDF
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const pdfPath = path.join(uploadsDir, `${sessionId}.pdf`);
    await writeFile(pdfPath, buffer);

    // For now, let's create a simple response that indicates the PDF was received
    // We'll use a client-side solution for PDF rendering

    // Create a placeholder ZIP with the original PDF for now
    const zipPath = path.join(sessionDir, "images.zip");
    const output = createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    return new Promise<NextResponse>((resolve, reject) => {
      output.on("close", () => {
        resolve(
          NextResponse.json({
            success: true,
            sessionId: sessionId,
            pageCount: 1, // We'll update this when we implement proper PDF processing
            message:
              "PDF uploaded successfully. Please use the browser-based conversion.",
          })
        );
      });

      output.on("error", (err) => {
        console.error("ZIP creation error:", err);
        reject(
          NextResponse.json(
            { error: "Failed to create ZIP file" },
            { status: 500 }
          )
        );
      });

      archive.on("error", (err) => {
        console.error("Archive error:", err);
        reject(
          NextResponse.json(
            { error: "Failed to create ZIP archive" },
            { status: 500 }
          )
        );
      });

      archive.pipe(output);

      // Add the PDF to the ZIP as a placeholder
      archive.append(buffer, { name: "original.pdf" });

      archive.finalize();
    });
  } catch (error) {
    console.error("Error processing PDF:", error);
    return NextResponse.json(
      {
        error: "Internal server error: " + (error as Error).message,
      },
      { status: 500 }
    );
  }
}
