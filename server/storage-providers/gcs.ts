// Google Cloud Storage provider (Replit Object Storage)
import { Storage } from "@google-cloud/storage";
import { StorageProvider } from "./interface";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

// Create GCS client with Replit credentials
const gcsClient = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
    type: "external_account",
    credential_source: {
      url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
      format: {
        type: "json",
        subject_token_field_name: "access_token",
      },
    },
    universe_domain: "googleapis.com",
  },
  projectId: "",
});

async function signObjectURL({
  bucketName,
  objectName,
  method,
  ttlSec,
}: {
  bucketName: string;
  objectName: string;
  method: "GET" | "PUT" | "DELETE" | "HEAD";
  ttlSec: number;
}): Promise<string> {
  const request = {
    bucket_name: bucketName,
    object_name: objectName,
    method,
    expires_at: new Date(Date.now() + ttlSec * 1000).toISOString(),
  };
  const response = await fetch(
    `${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    }
  );
  if (!response.ok) {
    throw new Error(
      `Failed to sign object URL, errorcode: ${response.status}, ` +
        `make sure you're running on Replit`
    );
  }

  const { signed_url: signedURL } = await response.json();
  return signedURL;
}

export class GCSProvider implements StorageProvider {
  async getSignedUploadUrl(params: {
    bucketName: string;
    objectName: string;
    ttlSec: number;
  }): Promise<string> {
    return signObjectURL({
      bucketName: params.bucketName,
      objectName: params.objectName,
      method: "PUT",
      ttlSec: params.ttlSec,
    });
  }

  async getSignedDownloadUrl(params: {
    bucketName: string;
    objectName: string;
    ttlSec: number;
  }): Promise<string> {
    return signObjectURL({
      bucketName: params.bucketName,
      objectName: params.objectName,
      method: "GET",
      ttlSec: params.ttlSec,
    });
  }

  async objectExists(params: {
    bucketName: string;
    objectName: string;
  }): Promise<boolean> {
    const bucket = gcsClient.bucket(params.bucketName);
    const file = bucket.file(params.objectName);
    const [exists] = await file.exists();
    return exists;
  }

  async getObjectMetadata(params: {
    bucketName: string;
    objectName: string;
  }): Promise<{
    contentType?: string;
    size?: number;
  }> {
    const bucket = gcsClient.bucket(params.bucketName);
    const file = bucket.file(params.objectName);
    const [metadata] = await file.getMetadata();
    return {
      contentType: metadata.contentType,
      size: metadata.size ? parseInt(metadata.size as string) : undefined,
    };
  }

  async createReadStream(params: {
    bucketName: string;
    objectName: string;
  }): Promise<NodeJS.ReadableStream> {
    const bucket = gcsClient.bucket(params.bucketName);
    const file = bucket.file(params.objectName);
    return file.createReadStream();
  }

  async setObjectMetadata(params: {
    bucketName: string;
    objectName: string;
    metadata: Record<string, string>;
  }): Promise<void> {
    const bucket = gcsClient.bucket(params.bucketName);
    const file = bucket.file(params.objectName);
    await file.setMetadata({ metadata: params.metadata });
  }

  async getCustomMetadata(params: {
    bucketName: string;
    objectName: string;
  }): Promise<Record<string, string>> {
    const bucket = gcsClient.bucket(params.bucketName);
    const file = bucket.file(params.objectName);
    const [metadata] = await file.getMetadata();
    return (metadata.metadata as Record<string, string>) || {};
  }
}

// Export the GCS client for backward compatibility
export const gcsStorageClient = gcsClient;
