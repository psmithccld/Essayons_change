// Cloudflare R2 provider (S3-compatible)
import { S3Client, HeadObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { StorageProvider } from "./interface";
import { Readable } from "stream";

// Create R2 client
function createR2Client() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "R2 credentials not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY environment variables."
    );
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

export class R2Provider implements StorageProvider {
  readonly name = "Cloudflare R2";
  readonly supportsAcl = false; // ACL not supported in R2 (yet)
  
  private client: S3Client;

  constructor() {
    this.client = createR2Client();
  }

  async getSignedUploadUrl(params: {
    bucketName: string;
    objectName: string;
    ttlSec: number;
  }): Promise<string> {
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    const command = new PutObjectCommand({
      Bucket: params.bucketName,
      Key: params.objectName,
    });

    return getSignedUrl(this.client, command, { expiresIn: params.ttlSec });
  }

  async getSignedDownloadUrl(params: {
    bucketName: string;
    objectName: string;
    ttlSec: number;
  }): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: params.bucketName,
      Key: params.objectName,
    });

    return getSignedUrl(this.client, command, { expiresIn: params.ttlSec });
  }

  async objectExists(params: {
    bucketName: string;
    objectName: string;
  }): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: params.bucketName,
        Key: params.objectName,
      });
      await this.client.send(command);
      return true;
    } catch (error: any) {
      if (error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw error;
    }
  }

  async getObjectMetadata(params: {
    bucketName: string;
    objectName: string;
  }): Promise<{
    contentType?: string;
    size?: number;
  }> {
    const command = new HeadObjectCommand({
      Bucket: params.bucketName,
      Key: params.objectName,
    });
    const response = await this.client.send(command);
    return {
      contentType: response.ContentType,
      size: response.ContentLength,
    };
  }

  async createReadStream(params: {
    bucketName: string;
    objectName: string;
  }): Promise<NodeJS.ReadableStream> {
    const command = new GetObjectCommand({
      Bucket: params.bucketName,
      Key: params.objectName,
    });
    const response = await this.client.send(command);
    
    if (!response.Body) {
      throw new Error("No body in response");
    }

    // Convert AWS SDK stream to Node.js stream
    return response.Body as unknown as NodeJS.ReadableStream;
  }

  async setObjectMetadata(params: {
    bucketName: string;
    objectName: string;
    metadata: Record<string, string>;
  }): Promise<void> {
    const { CopyObjectCommand } = await import("@aws-sdk/client-s3");
    
    // Get current metadata first to preserve other fields
    const currentMetadata = await this.getCustomMetadata(params);
    
    // Merge new metadata with existing
    const mergedMetadata = { ...currentMetadata, ...params.metadata };
    
    // R2 doesn't support updating metadata directly
    // We need to copy the object to itself with new metadata
    const command = new CopyObjectCommand({
      Bucket: params.bucketName,
      CopySource: `${params.bucketName}/${params.objectName}`,
      Key: params.objectName,
      Metadata: mergedMetadata,
      MetadataDirective: "REPLACE",
    });
    
    await this.client.send(command);
  }

  async getCustomMetadata(params: {
    bucketName: string;
    objectName: string;
  }): Promise<Record<string, string>> {
    const command = new HeadObjectCommand({
      Bucket: params.bucketName,
      Key: params.objectName,
    });
    const response = await this.client.send(command);
    // S3/R2 metadata keys are lowercase by default, normalize them
    return response.Metadata || {};
  }
}
