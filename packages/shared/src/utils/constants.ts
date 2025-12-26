/**
 * Shared constants across the platform
 */

// ============================================================================
// API
// ============================================================================

export const API_VERSION = 'v1';
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// ============================================================================
// Authentication
// ============================================================================

export const ACCESS_TOKEN_EXPIRY = 3600; // 1 hour in seconds
export const REFRESH_TOKEN_EXPIRY = 2592000; // 30 days in seconds

// ============================================================================
// RAG
// ============================================================================

export const DEFAULT_CONFIDENCE_THRESHOLD = 0.7;
export const MIN_CONFIDENCE_FOR_AUTO_RESPONSE = 0.75;
export const DEFAULT_TOP_K_RESULTS = 5;
export const CHUNK_SIZE = 500; // Characters
export const CHUNK_OVERLAP = 50; // Characters

// ============================================================================
// Telephony
// ============================================================================

export const MAX_CALL_DURATION_SECONDS = 1800; // 30 minutes
export const SMS_MAX_LENGTH = 1600; // For concatenated messages
export const PHONE_REGEX = /^\+[1-9]\d{1,14}$/; // E.164 format

// ============================================================================
// Business Rules
// ============================================================================

export const TRIAL_DURATION_DAYS = 14;
export const MAX_KNOWLEDGE_ITEMS_PER_COMPANY = 500; // For trial/basic tier
export const MAX_CALLS_PER_MONTH_TRIAL = 100;

// ============================================================================
// File Storage
// ============================================================================

export const MAX_RECORDING_SIZE_MB = 50;
export const ALLOWED_AUDIO_FORMATS = ['mp3', 'wav', 'ogg'];
export const RECORDING_RETENTION_DAYS = 90;

// ============================================================================
// Error Codes
// ============================================================================

export const ERROR_CODES = {
  // Auth
  INVALID_CREDENTIALS: 'AUTH001',
  TOKEN_EXPIRED: 'AUTH002',
  INSUFFICIENT_PERMISSIONS: 'AUTH003',

  // Validation
  INVALID_INPUT: 'VAL001',
  MISSING_REQUIRED_FIELD: 'VAL002',

  // Business Logic
  RESOURCE_NOT_FOUND: 'BIZ001',
  DUPLICATE_RESOURCE: 'BIZ002',
  OPERATION_NOT_ALLOWED: 'BIZ003',
  QUOTA_EXCEEDED: 'BIZ004',

  // External Services
  TELEPHONY_ERROR: 'EXT001',
  LLM_ERROR: 'EXT002',
  STORAGE_ERROR: 'EXT003',

  // System
  INTERNAL_ERROR: 'SYS001',
  DATABASE_ERROR: 'SYS002',
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];
