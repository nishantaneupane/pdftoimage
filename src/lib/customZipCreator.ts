// Custom ZIP file creator without external dependencies
// Implements proper ZIP format with CRC-32 calculation

export interface ZipEntry {
  filename: string;
  data: Uint8Array;
  crc32: number;
}

export class CustomZipCreator {
  private entries: ZipEntry[] = [];

  // CRC-32 lookup table
  private static crcTable: number[] = (() => {
    const table: number[] = [];
    for (let i = 0; i < 256; i++) {
      let crc = i;
      for (let j = 0; j < 8; j++) {
        crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
      }
      table[i] = crc;
    }
    return table;
  })();

  // Calculate CRC-32 checksum
  private calculateCRC32(data: Uint8Array): number {
    let crc = 0xffffffff;
    for (let i = 0; i < data.length; i++) {
      const byte = data[i];
      crc = CustomZipCreator.crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  // Add a file to the ZIP
  addFile(
    filename: string,
    data: string | Uint8Array,
    isBase64?: boolean
  ): void {
    let fileData: Uint8Array;

    if (typeof data === "string") {
      if (isBase64) {
        fileData = this.base64ToUint8Array(data);
      } else {
        fileData = new TextEncoder().encode(data);
      }
    } else {
      fileData = data;
    }

    const crc32 = this.calculateCRC32(fileData);

    this.entries.push({
      filename,
      data: fileData,
      crc32,
    });
  }

  // Add an image from base64 data URL
  addImageFromDataURL(filename: string, dataURL: string): void {
    // Remove the data URL prefix (data:image/png;base64,)
    const base64Data = dataURL.split(",")[1];
    this.addFile(filename, base64Data, true);
  }

  // Create and return the ZIP file as a Blob
  async createZip(): Promise<Blob> {
    const zipParts: Uint8Array[] = [];
    const centralDirectory: Uint8Array[] = [];
    let offset = 0;

    for (let i = 0; i < this.entries.length; i++) {
      const entry = this.entries[i];
      const fileData = entry.data;

      // Create local file header
      const localHeader = this.createLocalFileHeader(
        entry.filename,
        fileData.length,
        entry.crc32
      );
      zipParts.push(localHeader);
      zipParts.push(fileData);

      // Create central directory entry
      const centralEntry = this.createCentralDirectoryEntry(
        entry.filename,
        fileData.length,
        entry.crc32,
        offset
      );
      centralDirectory.push(centralEntry);

      offset += localHeader.length + fileData.length;
    }

    // Add central directory
    const centralDirectoryStart = offset;
    let centralDirectorySize = 0;

    for (const entry of centralDirectory) {
      zipParts.push(entry);
      centralDirectorySize += entry.length;
    }

    // Add end of central directory record
    const endRecord = this.createEndOfCentralDirectory(
      this.entries.length,
      centralDirectorySize,
      centralDirectoryStart
    );
    zipParts.push(endRecord);

    // Combine all parts
    const totalSize = zipParts.reduce((sum, part) => sum + part.length, 0);
    const zipArray = new Uint8Array(totalSize);
    let pos = 0;

    for (const part of zipParts) {
      zipArray.set(part, pos);
      pos += part.length;
    }

    return new Blob([zipArray], { type: "application/zip" });
  }

  // Convert base64 string to Uint8Array
  private base64ToUint8Array(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  // Create local file header for ZIP format
  private createLocalFileHeader(
    filename: string,
    fileSize: number,
    crc32: number
  ): Uint8Array {
    const filenameBytes = new TextEncoder().encode(filename);
    const header = new Uint8Array(30 + filenameBytes.length);
    const view = new DataView(header.buffer);

    // Local file header signature
    view.setUint32(0, 0x04034b50, true);
    // Version needed to extract
    view.setUint16(4, 20, true);
    // General purpose bit flag
    view.setUint16(6, 0, true);
    // Compression method (0 = no compression)
    view.setUint16(8, 0, true);
    // Last mod file time/date (dummy values)
    view.setUint16(10, 0, true);
    view.setUint16(12, 0, true);
    // CRC-32
    view.setUint32(14, crc32, true);
    // Compressed size
    view.setUint32(18, fileSize, true);
    // Uncompressed size
    view.setUint32(22, fileSize, true);
    // Filename length
    view.setUint16(26, filenameBytes.length, true);
    // Extra field length
    view.setUint16(28, 0, true);

    // Add filename
    header.set(filenameBytes, 30);

    return header;
  }

  // Create central directory entry
  private createCentralDirectoryEntry(
    filename: string,
    fileSize: number,
    crc32: number,
    offset: number
  ): Uint8Array {
    const filenameBytes = new TextEncoder().encode(filename);
    const entry = new Uint8Array(46 + filenameBytes.length);
    const view = new DataView(entry.buffer);

    // Central directory signature
    view.setUint32(0, 0x02014b50, true);
    // Version made by
    view.setUint16(4, 20, true);
    // Version needed to extract
    view.setUint16(6, 20, true);
    // General purpose bit flag
    view.setUint16(8, 0, true);
    // Compression method
    view.setUint16(10, 0, true);
    // Last mod file time/date
    view.setUint16(12, 0, true);
    view.setUint16(14, 0, true);
    // CRC-32
    view.setUint32(16, crc32, true);
    // Compressed size
    view.setUint32(20, fileSize, true);
    // Uncompressed size
    view.setUint32(24, fileSize, true);
    // Filename length
    view.setUint16(28, filenameBytes.length, true);
    // Extra field length
    view.setUint16(30, 0, true);
    // File comment length
    view.setUint16(32, 0, true);
    // Disk number start
    view.setUint16(34, 0, true);
    // Internal file attributes
    view.setUint16(36, 0, true);
    // External file attributes
    view.setUint32(38, 0, true);
    // Relative offset of local header
    view.setUint32(42, offset, true);

    // Add filename
    entry.set(filenameBytes, 46);

    return entry;
  }

  // Create end of central directory record
  private createEndOfCentralDirectory(
    totalEntries: number,
    centralDirectorySize: number,
    centralDirectoryOffset: number
  ): Uint8Array {
    const record = new Uint8Array(22);
    const view = new DataView(record.buffer);

    // End of central directory signature
    view.setUint32(0, 0x06054b50, true);
    // Number of this disk
    view.setUint16(4, 0, true);
    // Disk where central directory starts
    view.setUint16(6, 0, true);
    // Number of central directory records on this disk
    view.setUint16(8, totalEntries, true);
    // Total number of central directory records
    view.setUint16(10, totalEntries, true);
    // Size of central directory
    view.setUint32(12, centralDirectorySize, true);
    // Offset of start of central directory
    view.setUint32(16, centralDirectoryOffset, true);
    // Comment length
    view.setUint16(20, 0, true);

    return record;
  }
}
