'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

// PDF to image conversion using react-pdf's PDF.js setup
const convertPdfToImages = async (file: File): Promise<string[]> => {
  try {
    console.log('Starting PDF conversion with react-pdf...');
    
    // Dynamic import to avoid SSR issues
    const { pdfjs } = await import('react-pdf');
    
    // Use local worker file that we copied to public directory
    if (typeof window !== 'undefined') {
      pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.js';
      console.log('PDF.js worker configured to use local worker');
    }
    
    console.log('Loading PDF file...');
    
    // Read file as array buffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Load PDF document with compatibility settings
    const loadingTask = pdfjs.getDocument({ 
      data: arrayBuffer,
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
      disableAutoFetch: true,
      disableStream: true,
    });
    
    const pdf = await loadingTask.promise;
    
    console.log(`PDF loaded with ${pdf.numPages} pages`);
    
    const images: string[] = [];
    
    // Process each page
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      console.log(`Rendering page ${pageNumber}...`);
      
      const page = await pdf.getPage(pageNumber);
      
      // Set scale for high quality
      const viewport = page.getViewport({ scale: 2.0 });
      
      // Create canvas
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      if (!context) {
        throw new Error('Failed to get canvas context');
      }
      
      // Set canvas dimensions
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      // Render page to canvas - this captures the actual PDF content
      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      } as any; // Bypass TypeScript strict checking for PDF.js parameters
      
      const renderTask = page.render(renderContext);
      await renderTask.promise;
      
      // Convert canvas to image data URL
      const imageDataUrl = canvas.toDataURL('image/png', 0.95);
      images.push(imageDataUrl);
      
      console.log(`Page ${pageNumber} rendered successfully`);
    }
    
    console.log(`All ${images.length} pages converted successfully`);
    return images;
    
  } catch (error) {
    console.error('PDF conversion failed:', error);
    throw new Error(`PDF conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Helper function to create and download ZIP using JSZip
const downloadImagesAsZip = async (images: string[], filename: string) => {
  console.log('Creating ZIP file with JSZip...');
  
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  
  images.forEach((imageData, index) => {
    const base64Data = imageData.split(',')[1];
    zip.file(`page_${index + 1}.png`, base64Data, { base64: true });
  });
  
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  
  // Download the ZIP file
  const url = URL.createObjectURL(zipBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  console.log('ZIP file created and downloaded successfully');
};

export default function Home() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<string>('');
  const [images, setImages] = useState<string[]>([]);
  const [error, setError] = useState<string>('');

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF file only');
      return;
    }

    setIsProcessing(true);
    setError('');
    setProgress('Processing PDF...');
    setImages([]);

    try {
      const convertedImages = await convertPdfToImages(file);
      setImages(convertedImages);
      setProgress(`Successfully converted ${convertedImages.length} pages!`);
    } catch (error) {
      console.error('Conversion error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(`Failed to convert PDF: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    multiple: false,
    disabled: isProcessing
  });

  const handleDownload = async () => {
    if (images.length === 0) return;

    try {
      await downloadImagesAsZip(images, 'pdf-images.zip');
    } catch (error) {
      console.error('Download error:', error);
      setError('Download failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">
            PDF to Images
          </h1>
          <p className="text-sm text-gray-600 mb-8">
            Upload a PDF file and download converted images as a ZIP file
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          {/* Upload Area */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              isDragActive
                ? 'border-blue-400 bg-blue-50'
                : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
            } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <input {...getInputProps()} />
            <svg
              className="mx-auto h-12 w-12 text-gray-400 mb-4"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            
            {isProcessing ? (
              <div>
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-sm text-gray-600">{progress}</p>
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-600">
                  {isDragActive
                    ? 'Drop the PDF file here...'
                    : 'Drag & drop a PDF file here, or click to select'}
                </p>
                <p className="text-xs text-gray-500 mt-2">PDF files only</p>
              </div>
            )}
          </div>

          {/* Status Messages */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {images.length > 0 && !error && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-600">{progress}</p>
              <button
                onClick={handleDownload}
                className="mt-3 w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
              >
                Download ZIP ({images.length} images)
              </button>
            </div>
          )}
        </div>

        <div className="mt-8 text-center text-xs text-gray-500">
          <p>Your files are processed in your browser and not sent to any server</p>
        </div>
      </div>
    </div>
  );
}
