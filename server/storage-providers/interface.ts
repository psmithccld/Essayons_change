// Abstract interface for storage providers
export interface StorageProvider {
  // Get a signed URL for uploading an object
  getSignedUploadUrl(params: {
    bucketName: string;
    objectName: string;
    ttlSec: number;
  }): Promise<string>;

  // Get a signed URL for downloading an object
  getSignedDownloadUrl(params: {
    bucketName: string;
    objectName: string;
    ttlSec: number;
  }): Promise<string>;

  // Check if an object exists
  objectExists(params: {
    bucketName: string;
    objectName: string;
  }): Promise<boolean>;

  // Get object metadata
  getObjectMetadata(params: {
    bucketName: string;
    objectName: string;
  }): Promise<{
    contentType?: string;
    size?: number;
  }>;

  // Create a read stream for an object
  createReadStream(params: {
    bucketName: string;
    objectName: string;
  }): Promise<NodeJS.ReadableStream>;

  // Set object metadata
  setObjectMetadata(params: {
    bucketName: string;
    objectName: string;
    metadata: Record<string, string>;
  }): Promise<void>;

  // Get object metadata (custom fields)
  getCustomMetadata(params: {
    bucketName: string;
    objectName: string;
  }): Promise<Record<string, string>>;
}
