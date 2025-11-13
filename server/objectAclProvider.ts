// Provider-aware ACL operations
import { File } from "@google-cloud/storage";
import { getStorageProvider, parseObjectPath } from "./storage-providers/factory";
import { ObjectAclPolicy } from "./objectAcl";

const ACL_POLICY_METADATA_KEY = "custom:aclPolicy";

// Set ACL policy using storage provider
export async function setAclPolicyViaProvider(params: {
  bucketName: string;
  objectName: string;
  aclPolicy: ObjectAclPolicy;
}): Promise<void> {
  const provider = getStorageProvider();
  
  // Check if object exists
  const exists = await provider.objectExists({
    bucketName: params.bucketName,
    objectName: params.objectName,
  });
  
  if (!exists) {
    throw new Error(`Object not found: ${params.objectName}`);
  }

  // Set metadata with ACL policy
  await provider.setObjectMetadata({
    bucketName: params.bucketName,
    objectName: params.objectName,
    metadata: {
      [ACL_POLICY_METADATA_KEY]: JSON.stringify(params.aclPolicy),
    },
  });
}

// Get ACL policy using storage provider
export async function getAclPolicyViaProvider(params: {
  bucketName: string;
  objectName: string;
}): Promise<ObjectAclPolicy | null> {
  const provider = getStorageProvider();
  
  try {
    const metadata = await provider.getCustomMetadata({
      bucketName: params.bucketName,
      objectName: params.objectName,
    });
    
    const aclPolicyStr = metadata[ACL_POLICY_METADATA_KEY] || metadata['custom:aclpolicy']; // R2 lowercase
    if (!aclPolicyStr) {
      return null;
    }
    
    return JSON.parse(aclPolicyStr);
  } catch (error) {
    console.error("Error getting ACL policy:", error);
    return null;
  }
}

// Check if user can access object using provider
export async function canAccessObjectViaProvider(params: {
  userId?: string;
  bucketName: string;
  objectName: string;
  requestedPermission: "read" | "write";
}): Promise<boolean> {
  const aclPolicy = await getAclPolicyViaProvider({
    bucketName: params.bucketName,
    objectName: params.objectName,
  });
  
  if (!aclPolicy) {
    return false;
  }

  // Public objects are always accessible for read
  if (aclPolicy.visibility === "public" && params.requestedPermission === "read") {
    return true;
  }

  // Access control requires the user id
  if (!params.userId) {
    return false;
  }

  // The owner of the object can always access it
  if (aclPolicy.owner === params.userId) {
    return true;
  }

  // For now, simplified ACL check (can be expanded later)
  return false;
}
