// Referenced from javascript_object_storage integration
import { File } from "@google-cloud/storage";
import { Response } from "express";
import { randomUUID } from "crypto";
import {
  ObjectAclPolicy,
  ObjectPermission,
  canAccessObject,
  getObjectAclPolicy,
  setObjectAclPolicy,
} from "./objectAcl";
import { getStorageProvider, parseObjectPath } from "./storage-providers/factory";
import { gcsStorageClient } from "./storage-providers/gcs";

// Export GCS client for backward compatibility with objectAcl.ts
export const objectStorageClient = gcsStorageClient;

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

// The object storage service is used to interact with the object storage service.
export class ObjectStorageService {
  constructor() {}

  // Gets the public object search paths.
  getPublicObjectSearchPaths(): Array<string> {
    const pathsStr = process.env.PUBLIC_OBJECT_SEARCH_PATHS || "";
    const paths = Array.from(
      new Set(
        pathsStr
          .split(",")
          .map((path) => path.trim())
          .filter((path) => path.length > 0)
      )
    );
    if (paths.length === 0) {
      throw new Error(
        "PUBLIC_OBJECT_SEARCH_PATHS not set. Create a bucket in 'Object Storage' " +
          "tool and set PUBLIC_OBJECT_SEARCH_PATHS env var (comma-separated paths)."
      );
    }
    return paths;
  }

  // Gets the private object directory.
  getPrivateObjectDir(): string {
    const dir = process.env.PRIVATE_OBJECT_DIR || "";
    if (!dir) {
      throw new Error(
        "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' " +
          "tool and set PRIVATE_OBJECT_DIR env var."
      );
    }
    return dir;
  }

  // Search for a public object from the search paths.
  async searchPublicObject(filePath: string): Promise<File | null> {
    const provider = getStorageProvider();
    
    for (const searchPath of this.getPublicObjectSearchPaths()) {
      const fullPath = `${searchPath}/${filePath}`;

      // Full path format: /<bucket_name>/<object_name>
      const { bucketName, objectName } = parseObjectPath(fullPath);
      
      // Check if file exists using provider
      const exists = await provider.objectExists({ bucketName, objectName });
      if (exists) {
        // For backward compatibility with ACL system, return GCS File object
        // This will only work with GCS provider
        const bucket = objectStorageClient.bucket(bucketName);
        return bucket.file(objectName);
      }
    }

    return null;
  }

  // Downloads an object to the response (GCS File object - backward compatible).
  async downloadObject(file: File, res: Response, cacheTtlSec: number = 3600) {
    try {
      let contentType: string | undefined;
      let size: number | undefined;
      let isPublic = false;

      // Get ACL policy if using GCS (for backward compatibility)
      try {
        const aclPolicy = await getObjectAclPolicy(file);
        isPublic = aclPolicy?.visibility === "public";
      } catch (error) {
        // ACL not supported, default to private
        console.log("[Storage] ACL not available, defaulting to private");
      }

      // Get metadata using GCS File object
      const [metadata] = await file.getMetadata();
      contentType = metadata.contentType || "application/octet-stream";
      size = metadata.size ? parseInt(metadata.size as string) : undefined;

      // Set appropriate headers
      res.set({
        "Content-Type": contentType,
        ...(size && { "Content-Length": size }),
        "Cache-Control": `${isPublic ? "public" : "private"}, max-age=${cacheTtlSec}`,
      });

      // Stream the file to the response
      const stream = file.createReadStream();

      stream.on("error", (err: Error) => {
        console.error("Stream error:", err);
        if (!res.headersSent) {
          res.status(500).json({ error: "Error streaming file" });
        }
      });

      stream.pipe(res);
    } catch (error) {
      console.error("Error downloading file:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Error downloading file" });
      }
    }
  }

  // Downloads an object using provider abstraction (works with both GCS and R2).
  async downloadObjectViaProvider(params: {
    bucketName: string;
    objectName: string;
    res: Response;
    cacheTtlSec?: number;
  }) {
    const { bucketName, objectName, res, cacheTtlSec = 3600 } = params;
    const provider = getStorageProvider();

    try {
      // Check if object exists first (returns 404 instead of 500 for missing objects)
      const exists = await provider.objectExists({ bucketName, objectName });
      if (!exists) {
        throw new ObjectNotFoundError();
      }

      // Get metadata
      const metadata = await provider.getObjectMetadata({ bucketName, objectName });
      
      // Set response headers
      res.set({
        "Content-Type": metadata.contentType || "application/octet-stream",
        ...(metadata.size && { "Content-Length": metadata.size }),
        "Cache-Control": `private, max-age=${cacheTtlSec}`, // Default to private
      });

      // Stream the file to the response
      const stream = await provider.createReadStream({ bucketName, objectName });

      stream.on("error", (err: any) => {
        console.error("[Storage] Stream error:", err);
        
        // Detect NotFound errors even in stream
        const isNotFoundError = 
          err.name === "NoSuchKey" || 
          err.name === "NotFound" ||
          err.$metadata?.httpStatusCode === 404;
        
        if (!res.headersSent) {
          if (isNotFoundError) {
            res.status(404).json({ error: "Object not found" });
          } else {
            res.status(500).json({ error: "Error streaming file" });
          }
        }
      });

      stream.pipe(res);
    } catch (error: any) {
      // Re-throw ObjectNotFoundError so the route handler can return 404
      if (error instanceof ObjectNotFoundError) {
        throw error;
      }
      
      // Detect "NotFound" errors from S3/R2 providers
      // These can occur if object is deleted between existence check and read
      const isNotFoundError = 
        error.name === "NoSuchKey" || 
        error.name === "NotFound" ||
        error.$metadata?.httpStatusCode === 404;
      
      if (isNotFoundError) {
        throw new ObjectNotFoundError();
      }
      
      console.error("[Storage] Error downloading file:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Error downloading file" });
      }
    }
  }

  // Gets the upload URL for an object entity.
  async getObjectEntityUploadURL(): Promise<{ uploadURL: string; filePath: string; objectPath: string }> {
    const privateObjectDir = this.getPrivateObjectDir();
    if (!privateObjectDir) {
      throw new Error(
        "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' " +
          "tool and set PRIVATE_OBJECT_DIR env var."
      );
    }

    const objectId = randomUUID();
    const fullPath = `${privateObjectDir}/uploads/${objectId}`;

    const { bucketName, objectName } = parseObjectPath(fullPath);

    // Get storage provider and sign URL for PUT method with TTL
    const provider = getStorageProvider();
    const uploadURL = await provider.getSignedUploadUrl({
      bucketName,
      objectName,
      ttlSec: 900,
    });
    
    // Return both the upload URL and the storage path
    // filePath is used for database storage
    // objectPath is the URL path for downloading
    return {
      uploadURL,
      filePath: fullPath,
      objectPath: `/objects/uploads/${objectId}`
    };
  }

  // Gets the object entity file from the object path.
  // Note: Returns GCS File object for ACL compatibility. Only works with GCS provider.
  async getObjectEntityFile(objectPath: string): Promise<File> {
    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }

    const parts = objectPath.slice(1).split("/");
    if (parts.length < 2) {
      throw new ObjectNotFoundError();
    }

    const entityId = parts.slice(1).join("/");
    let entityDir = this.getPrivateObjectDir();
    if (!entityDir.endsWith("/")) {
      entityDir = `${entityDir}/`;
    }
    const objectEntityPath = `${entityDir}${entityId}`;
    const { bucketName, objectName } = parseObjectPath(objectEntityPath);
    
    const provider = getStorageProvider();
    
    // Check existence using provider abstraction
    const exists = await provider.objectExists({ bucketName, objectName });
    if (!exists) {
      throw new ObjectNotFoundError();
    }
    
    // Return GCS File object (only works with GCS provider)
    // For R2, this File object won't be usable for actual operations
    const bucket = objectStorageClient.bucket(bucketName);
    return bucket.file(objectName);
  }

  // Gets the bucket and object name from an object path (provider-agnostic).
  getObjectLocation(objectPath: string): { bucketName: string; objectName: string } {
    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }

    const parts = objectPath.slice(1).split("/");
    if (parts.length < 2) {
      throw new ObjectNotFoundError();
    }

    const entityId = parts.slice(1).join("/");
    let entityDir = this.getPrivateObjectDir();
    if (!entityDir.endsWith("/")) {
      entityDir = `${entityDir}/`;
    }
    const objectEntityPath = `${entityDir}${entityId}`;
    return parseObjectPath(objectEntityPath);
  }

  normalizeObjectEntityPath(
    rawPath: string,
  ): string {
    if (!rawPath.startsWith("https://storage.googleapis.com/")) {
      return rawPath;
    }
  
    // Extract the path from the URL by removing query parameters and domain
    const url = new URL(rawPath);
    const rawObjectPath = url.pathname;
  
    let objectEntityDir = this.getPrivateObjectDir();
    if (!objectEntityDir.endsWith("/")) {
      objectEntityDir = `${objectEntityDir}/`;
    }
  
    if (!rawObjectPath.startsWith(objectEntityDir)) {
      return rawObjectPath;
    }
  
    // Extract the entity ID from the path
    const entityId = rawObjectPath.slice(objectEntityDir.length);
    return `/objects/${entityId}`;
  }

  // Tries to set the ACL policy for the object entity and return the normalized path.
  async trySetObjectEntityAclPolicy(
    rawPath: string,
    aclPolicy: ObjectAclPolicy
  ): Promise<string> {
    const provider = getStorageProvider();
    const normalizedPath = this.normalizeObjectEntityPath(rawPath);
    
    if (!normalizedPath.startsWith("/")) {
      return normalizedPath;
    }

    // ACL is only supported with GCS provider
    if (!provider.supportsAcl) {
      console.log(`[Storage] ACL not supported by ${provider.name}, skipping ACL policy set`);
      return normalizedPath;
    }

    const objectFile = await this.getObjectEntityFile(normalizedPath);
    await setObjectAclPolicy(objectFile, aclPolicy);
    return normalizedPath;
  }

  // Checks if the user can access the object entity.
  async canAccessObjectEntity({
    userId,
    objectFile,
    requestedPermission,
  }: {
    userId?: string;
    objectFile: File;
    requestedPermission?: ObjectPermission;
  }): Promise<boolean> {
    const provider = getStorageProvider();
    
    // If ACL not supported, allow access (fallback to application-level auth)
    if (!provider.supportsAcl) {
      console.log(`[Storage] ACL not supported by ${provider.name}, allowing access`);
      return true;
    }
    
    return canAccessObject({
      userId,
      objectFile,
      requestedPermission: requestedPermission ?? ObjectPermission.READ,
    });
  }
}