import crypto from 'crypto';
import prisma from '@/lib/prisma';

const isProd = process.env.NODE_ENV === 'production';
const DEFAULT_DEV_PASSWORD = process.env.DEV_ADMIN_PASSWORD || (isProd ? '' : '1234');
const DEV_SESSION_SECRET = process.env.DEV_SESSION_SECRET || process.env.CLERK_SECRET_KEY || (isProd ? crypto.randomBytes(32).toString('hex') : 'theologica-dev-secret-key-2026');
export const DEV_COOKIE_NAME = 'theologica_dev_session';

// In-memory fallback in case database is offline or during cold start
let memoryAdminConfig: {
  passwordHash: string;
  salt: string;
  adminUserId?: string;
  adminEmail?: string;
  allowedEmails: string[];
  allowedUserIds: string[];
} | null = null;

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
}

/**
 * Get the current admin configuration from DB, falling back to memory or defaults.
 */
export async function getAdminConfig() {
  try {
    const config = await prisma.devAdminConfig.findUnique({
      where: { id: 'default' },
    });
    if (config) {
      return config;
    }
  } catch (err) {
    console.warn('DevAdminConfig DB query error, using memory fallback:', err);
  }

  return memoryAdminConfig;
}

/**
 * Verify whether the given password matches the current dev password.
 */
export async function verifyDevPassword(password: string): Promise<boolean> {
  const config = await getAdminConfig();

  // 1. If password hash is stored in the database, verify with PBKDF2
  if (config && config.passwordHash && config.salt) {
    const hash = hashPassword(password, config.salt);
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(config.passwordHash, 'hex'));
  }

  // 2. Check DEV_ADMIN_PASSWORD environment variable
  const envPassword = process.env.DEV_ADMIN_PASSWORD;
  if (envPassword) {
    return password === envPassword;
  }

  // 3. Fallback in development mode
  if (!isProd) {
    return password === '1234';
  }

  // 4. Initial claim in production if no password has ever been set:
  // The first entered password will be accepted and saved permanently.
  return true;
}

/**
 * Change the developer dashboard password.
 */
export async function updateDevPassword(newPassword: string, adminUserId?: string, adminEmail?: string) {
  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = hashPassword(newPassword, salt);

  const dataToSave = {
    passwordHash,
    salt,
    ...(adminUserId ? { adminUserId } : {}),
    ...(adminEmail ? { adminEmail } : {}),
  };

  try {
    const updated = await prisma.devAdminConfig.upsert({
      where: { id: 'default' },
      create: {
        id: 'default',
        passwordHash,
        salt,
        adminUserId: adminUserId || null,
        adminEmail: adminEmail || null,
        allowedEmails: adminEmail ? [adminEmail.toLowerCase()] : [],
        allowedUserIds: adminUserId ? [adminUserId] : [],
      },
      update: dataToSave,
    });
    memoryAdminConfig = {
      passwordHash,
      salt,
      adminUserId: updated.adminUserId || adminUserId,
      adminEmail: updated.adminEmail || adminEmail,
      allowedEmails: updated.allowedEmails || [],
      allowedUserIds: updated.allowedUserIds || [],
    };
    return true;
  } catch (err) {
    console.warn('Failed to persist DevAdminConfig to DB, saving to memory fallback:', err);
    memoryAdminConfig = {
      passwordHash,
      salt,
      adminUserId,
      adminEmail,
      allowedEmails: adminEmail ? [adminEmail.toLowerCase()] : [],
      allowedUserIds: adminUserId ? [adminUserId] : [],
    };
    return true;
  }
}

/**
 * Check if the given Clerk user ID or email is authorized as the Developer Admin.
 */
export async function isAuthorizedAdmin(userId: string, userEmail?: string | null): Promise<boolean> {
  if (!userId) return false;

  const normalizedEmail = (userEmail || '').trim().toLowerCase();

  // 1. Check environment variables
  const envAdminIds = (process.env.ADMIN_USER_IDS || process.env.ADMIN_USER_ID || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  const envAdminEmails = (process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || '')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);

  if (envAdminIds.length > 0 && envAdminIds.includes(userId)) {
    return true;
  }
  if (normalizedEmail && envAdminEmails.length > 0 && envAdminEmails.includes(normalizedEmail)) {
    return true;
  }

  // 2. Check Database configuration
  const config = await getAdminConfig();
  if (config) {
    if (config.adminUserId && config.adminUserId === userId) {
      return true;
    }
    if (normalizedEmail && config.adminEmail && config.adminEmail.toLowerCase() === normalizedEmail) {
      return true;
    }
    if (normalizedEmail && config.allowedEmails && config.allowedEmails.map(e => e.toLowerCase()).includes(normalizedEmail)) {
      return true;
    }
    if (config.allowedUserIds && config.allowedUserIds.includes(userId)) {
      return true;
    }
  }

  // 3. If explicit environment variables are set and neither matched, deny
  if (envAdminIds.length > 0 || envAdminEmails.length > 0) {
    return false;
  }

  // 4. Default: If no explicit env restriction, allow authenticated Clerk user to see the passcode prompt.
  // The secret developer passcode is the definitive gate.
  return true;
}

/**
 * Bind admin role to a user upon password unlock.
 */
export async function claimAdminRoleIfNeeded(userId: string, email?: string | null, passwordUsed?: string) {
  const normEmail = (email || '').toLowerCase().trim();
  const config = await getAdminConfig();

  const currentAllowedIds = new Set(config?.allowedUserIds || []);
  currentAllowedIds.add(userId);

  const currentAllowedEmails = new Set((config?.allowedEmails || []).map(e => e.toLowerCase()));
  if (normEmail) currentAllowedEmails.add(normEmail);

  let salt = config?.salt;
  let passwordHash = config?.passwordHash;
  if ((!passwordHash || !salt) && passwordUsed) {
    salt = crypto.randomBytes(16).toString('hex');
    passwordHash = hashPassword(passwordUsed, salt);
  }

  try {
    await prisma.devAdminConfig.upsert({
      where: { id: 'default' },
      create: {
        id: 'default',
        passwordHash: passwordHash || '',
        salt: salt || '',
        adminUserId: config?.adminUserId || userId,
        adminEmail: config?.adminEmail || normEmail || null,
        allowedEmails: Array.from(currentAllowedEmails),
        allowedUserIds: Array.from(currentAllowedIds),
      },
      update: {
        ...(passwordHash && salt ? { passwordHash, salt } : {}),
        adminUserId: config?.adminUserId || userId,
        adminEmail: config?.adminEmail || normEmail || null,
        allowedEmails: Array.from(currentAllowedEmails),
        allowedUserIds: Array.from(currentAllowedIds),
      },
    });
  } catch (err) {
    console.warn('Could not persist claimed admin role in DB:', err);
  }

  memoryAdminConfig = {
    passwordHash: passwordHash || '',
    salt: salt || '',
    adminUserId: config?.adminUserId || userId,
    adminEmail: config?.adminEmail || normEmail || undefined,
    allowedEmails: Array.from(currentAllowedEmails),
    allowedUserIds: Array.from(currentAllowedIds),
  };
}

/**
 * Create a signed session token.
 */
export function createDevSessionToken(userId: string): string {
  const payload = {
    userId,
    exp: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
  };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', DEV_SESSION_SECRET)
    .update(body)
    .digest('base64url');
  return `${body}.${signature}`;
}

/**
 * Verify a signed session token against the expected user ID.
 */
export function verifyDevSessionToken(token: string, expectedUserId?: string): { valid: boolean; userId?: string } {
  if (!token || !token.includes('.')) return { valid: false };

  const [body, signature] = token.split('.');
  const expectedSig = crypto
    .createHmac('sha256', DEV_SESSION_SECRET)
    .update(body)
    .digest('base64url');

  if (signature !== expectedSig) {
    return { valid: false };
  }

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!payload.exp || payload.exp < Date.now()) {
      return { valid: false };
    }
    if (expectedUserId && payload.userId !== expectedUserId) {
      return { valid: false };
    }
    return { valid: true, userId: payload.userId };
  } catch {
    return { valid: false };
  }
}
