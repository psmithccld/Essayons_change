// Factory to create the appropriate storage provider
import { StorageProvider } from "./interface";
import { GCSProvider } from "./gcs";
import { R2Provider } from "./r2";

let cachedProvider: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  // Return cached provider if available
  if (cachedProvider) {
    return cachedProvider;
  }

  // Determine which provider to use based on environment
  const storageType = process.env.STORAGE_PROVIDER?.toLowerCase() || "auto";

  let provider: StorageProvider;

  if (storageType === "r2") {
    // Explicitly use Cloudflare R2
    console.log("[Storage] Using Cloudflare R2 provider");
    provider = new R2Provider();
  } else if (storageType === "gcs") {
    // Explicitly use Google Cloud Storage
    console.log("[Storage] Using Google Cloud Storage provider");
    provider = new GCSProvider();
  } else {
    // Auto-detect based on available environment variables
    const hasR2Credentials =
      process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY;

    if (hasR2Credentials) {
      console.log("[Storage] Auto-detected Cloudflare R2 credentials, using R2 provider");
      provider = new R2Provider();
    } else {
      console.log("[Storage] Using default Google Cloud Storage provider");
      provider = new GCSProvider();
    }
  }

  // Cache the provider
  cachedProvider = provider;
  return provider;
}

// Helper function to parse object paths
export function parseObjectPath(path: string): {
  bucketName: string;
  objectName: string;
} {
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }
  const pathParts = path.split("/");
  if (pathParts.length < 3) {
    throw new Error("Invalid path: must contain at least a bucket name");
  }

  const bucketName = pathParts[1];
  const objectName = pathParts.slice(2).join("/");

  return {
    bucketName,
    objectName,
  };
}
