import { storage } from "../storage";
import { sendLicenseExpirationNotification } from "./emailService";

const NOTIFICATION_DAYS_BEFORE_EXPIRATION = 7;
const GRACE_PERIOD_DAYS = 7;
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // Run once per day

// Track which organizations have been notified to avoid duplicate emails
const notifiedOrganizations = new Set<string>();

export async function checkLicenseExpirations(): Promise<void> {
  try {
    console.log("[License Checker] Running license expiration check...");
    
    const now = new Date();
    
    // Step 1: Check for organizations nearing license expiration (within 7 days)
    const nearingExpiration = await storage.getOrganizationsNearingLicenseExpiration(NOTIFICATION_DAYS_BEFORE_EXPIRATION);
    
    for (const org of nearingExpiration) {
      if (!org.licenseExpiresAt) continue;
      
      const expirationDate = new Date(org.licenseExpiresAt);
      const daysUntilExpiration = Math.ceil((expirationDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
      const notificationKey = `${org.id}-${expirationDate.toISOString().split('T')[0]}`;
      
      // Send notification if not already notified today
      if (!notifiedOrganizations.has(notificationKey)) {
        console.log(`[License Checker] Sending expiration notification for ${org.name} (expires in ${daysUntilExpiration} days)`);
        
        const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || undefined;
        
        // Send to primary contact if available
        if (org.primaryContactEmail) {
          const sent = await sendLicenseExpirationNotification(
            org.primaryContactEmail,
            org.name,
            expirationDate,
            daysUntilExpiration,
            superAdminEmail
          );
          
          if (sent) {
            notifiedOrganizations.add(notificationKey);
            console.log(`[License Checker] Notification sent successfully to ${org.primaryContactEmail}`);
          }
        } else if (superAdminEmail) {
          // If no primary contact, send only to super admin
          const sent = await sendLicenseExpirationNotification(
            superAdminEmail,
            org.name,
            expirationDate,
            daysUntilExpiration
          );
          
          if (sent) {
            notifiedOrganizations.add(notificationKey);
            console.log(`[License Checker] Notification sent to super admin for ${org.name}`);
          }
        } else {
          console.warn(`[License Checker] No contact email configured for ${org.name}, skipping notification`);
        }
      }
    }
    
    // Step 2: Check for expired licenses and enforce read-only mode
    const expiredOrganizations = await storage.getOrganizationsWithExpiredLicenses();
    
    for (const org of expiredOrganizations) {
      if (!org.licenseExpiresAt) continue;
      
      const expirationDate = new Date(org.licenseExpiresAt);
      const gracePeriodEnd = new Date(expirationDate.getTime() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);
      
      // Check if organization should be set to read-only (beyond grace period)
      if (now > gracePeriodEnd && !org.isReadOnly) {
        console.log(`[License Checker] Setting organization ${org.name} to read-only (license expired on ${expirationDate.toISOString()})`);
        await storage.updateOrganizationLicense(org.id, {
          isReadOnly: true
        });
      }
    }
    
    console.log(`[License Checker] Check complete. Processed ${nearingExpiration.length} nearing expiration, ${expiredOrganizations.length} expired.`);
  } catch (error) {
    console.error("[License Checker] Error during license check:", error);
  }
}

// Start the license checker with periodic execution
export function startLicenseChecker(): void {
  console.log("[License Checker] Starting license expiration checker...");
  
  // Run immediately on startup
  checkLicenseExpirations().catch(error => {
    console.error("[License Checker] Initial check failed:", error);
  });
  
  // Schedule periodic checks
  setInterval(() => {
    checkLicenseExpirations().catch(error => {
      console.error("[License Checker] Scheduled check failed:", error);
    });
  }, CHECK_INTERVAL_MS);
  
  console.log(`[License Checker] Scheduled to run every ${CHECK_INTERVAL_MS / (60 * 60 * 1000)} hours`);
  
  // Clear notification cache daily to allow re-notifications
  setInterval(() => {
    notifiedOrganizations.clear();
    console.log("[License Checker] Notification cache cleared");
  }, CHECK_INTERVAL_MS);
}
