import { createHmac, timingSafeEqual } from 'crypto';

export interface ImpersonationTokenPayload {
  sessionId: string;
  organizationId: string;
  mode: 'read' | 'write';
  iat: number;
  exp: number;
}

/**
 * Generates a secure impersonation token with HMAC signature
 * @param secret The IMPERSONATION_SECRET used for signing
 * @param payload Token payload (sessionId, organizationId, mode)
 * @returns Signed token string
 */
export function generateImpersonationToken(
  secret: string,
  payload: Omit<ImpersonationTokenPayload, 'exp' | 'iat'>
): string {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: ImpersonationTokenPayload = {
    ...payload,
    iat: now,
    exp: now + (5 * 60) // 5 minutes expiration
  };
  
  const payloadJson = JSON.stringify(fullPayload);
  const payloadBase64 = Buffer.from(payloadJson).toString('base64url');
  
  const signature = createHmac('sha256', secret)
    .update(payloadBase64)
    .digest('base64url');
  
  return `${payloadBase64}.${signature}`;
}

/**
 * Validates and decodes an impersonation token
 * @param secret The IMPERSONATION_SECRET used for verification
 * @param token The token to validate
 * @returns Decoded payload if valid, null otherwise
 */
export function validateImpersonationToken(
  secret: string,
  token: string
): ImpersonationTokenPayload | null {
  try {
    const [payloadBase64, signature] = token.split('.');
    if (!payloadBase64 || !signature) return null;
    
    // Verify signature using timing-safe comparison
    const expectedSignature = createHmac('sha256', secret)
      .update(payloadBase64)
      .digest('base64url');
    
    const signatureBuffer = Buffer.from(signature, 'base64url');
    const expectedBuffer = Buffer.from(expectedSignature, 'base64url');
    
    // Check buffer lengths match before calling timingSafeEqual
    if (signatureBuffer.length !== expectedBuffer.length) {
      return null;
    }
    
    if (!timingSafeEqual(signatureBuffer, expectedBuffer)) {
      return null;
    }
    
    // Parse and validate payload
    const payloadJson = Buffer.from(payloadBase64, 'base64url').toString('utf8');
    let payload: any;
    
    try {
      payload = JSON.parse(payloadJson);
    } catch (parseError) {
      return null;
    }
    
    // Explicit type checks for required fields
    if (!payload || typeof payload !== 'object') {
      return null;
    }
    
    if (typeof payload.sessionId !== 'string' || !payload.sessionId) {
      return null;
    }
    
    if (typeof payload.organizationId !== 'string' || !payload.organizationId) {
      return null;
    }
    
    if (typeof payload.mode !== 'string' || (payload.mode !== 'read' && payload.mode !== 'write')) {
      return null;
    }
    
    if (typeof payload.exp !== 'number' || typeof payload.iat !== 'number') {
      return null;
    }
    
    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      return null;
    }
    
    return payload as ImpersonationTokenPayload;
  } catch (error) {
    return null;
  }
}
