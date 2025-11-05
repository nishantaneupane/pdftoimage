# PDF to Image Converter

A Next.js web application that allows users to upload PDF files and download the converted pages as PNG images in a ZIP file.

## Features

- **Drag & Drop Upload**: Simply drag and drop your PDF file or click to select
- **High-Quality Conversion**: Converts PDF pages to PNG images at 300 DPI resolution
- **Batch Processing**: Handles multi-page PDFs automatically
- **ZIP Download**: All converted images are packaged into a convenient ZIP file
- **Auto Cleanup**: Temporary files are automatically cleaned up after 1 hour
- **Responsive Design**: Works on desktop and mobile devices

## How to Use

1. Open the application in your browser at `http://localhost:3000`
2. Drag and drop a PDF file onto the upload area, or click to select a file
3. Wait for the PDF to be processed and converted to images
4. Once conversion is complete, click the "Download ZIP" button to get your images

## Installation & Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## Technical Details

- **Frontend**: Next.js 16 with TypeScript and Tailwind CSS
- **PDF Processing**: Custom implementation using browser APIs (no external dependencies)
- **File Handling**: React Dropzone for drag-and-drop functionality
- **Image Format**: PNG files rendered on HTML5 Canvas
- **ZIP Creation**: Custom ZIP file implementation without external libraries

## Dependencies

- **react-dropzone**: File upload handling (only UI dependency)
- **Custom PDF Processor**: Built-in PDF parsing and canvas rendering
- **Custom ZIP Creator**: Native ZIP file creation using browser APIs

## File Structure

```
src/
├── app/
│   ├── api/
│   │   ├── upload/route.ts      # PDF upload and conversion
│   │   └── download/[sessionId]/route.ts  # ZIP download
│   └── page.tsx                 # Main upload interface
├── lib/
│   └── cleanup.ts               # Temporary file cleanup
uploads/                         # Uploaded PDF files
temp/                           # Temporary conversion files
```

## Notes

- Maximum file upload size depends on your server configuration
- PDF files are temporarily stored and automatically cleaned up
- The application processes files locally - no external services are used
- Supported input: PDF files only
- Output: PNG images packaged in ZIP format

## Security

- Only PDF files are accepted for upload
- Temporary files are cleaned up automatically
- Session-based file isolation prevents access to other users' files
