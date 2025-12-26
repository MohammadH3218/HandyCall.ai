/**
 * JWT token decoding utilities
 */

interface JWTPayload {
  sub?: string;
  email?: string;
  'custom:role'?: string;
  'custom:company_id'?: string;
  'cognito:groups'?: string[];
  [key: string]: any;
}

/**
 * Decode a JWT token without verification (client-side only)
 * Note: This does NOT verify the signature. Verification should be done server-side.
 */
export function decodeJWT(token: string): JWTPayload | null {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;

    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Failed to decode JWT:', error);
    return null;
  }
}

/**
 * Extract user role from JWT token
 * Checks for role in custom:role attribute or cognito:groups
 */
export function extractUserRole(token: string): 'admin' | 'customer' | null {
  const payload = decodeJWT(token);
  if (!payload) return null;

  // Check custom:role attribute
  if (payload['custom:role']) {
    return payload['custom:role'].toLowerCase() === 'admin' ? 'admin' : 'customer';
  }

  // Check cognito:groups
  if (payload['cognito:groups'] && Array.isArray(payload['cognito:groups'])) {
    if (payload['cognito:groups'].some((group: string) => group.toLowerCase().includes('admin'))) {
      return 'admin';
    }
  }

  // Default to customer if no admin indicators found
  return 'customer';
}

