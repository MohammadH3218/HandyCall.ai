"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ERROR_CODES = exports.PLAN_FEATURES = exports.PLAN_LIMITS = exports.RECORDING_RETENTION_DAYS = exports.ALLOWED_AUDIO_FORMATS = exports.MAX_RECORDING_SIZE_MB = exports.MAX_CALLS_PER_MONTH_TRIAL = exports.MAX_KNOWLEDGE_ITEMS_PER_COMPANY = exports.TRIAL_DURATION_DAYS = exports.PHONE_REGEX = exports.SMS_MAX_LENGTH = exports.MAX_CALL_DURATION_SECONDS = exports.CHUNK_OVERLAP = exports.CHUNK_SIZE = exports.DEFAULT_TOP_K_RESULTS = exports.MIN_CONFIDENCE_FOR_AUTO_RESPONSE = exports.DEFAULT_CONFIDENCE_THRESHOLD = exports.REFRESH_TOKEN_EXPIRY = exports.ACCESS_TOKEN_EXPIRY = exports.MAX_PAGE_SIZE = exports.DEFAULT_PAGE_SIZE = exports.API_VERSION = void 0;
const domain_1 = require("../types/domain");
exports.API_VERSION = 'v1';
exports.DEFAULT_PAGE_SIZE = 20;
exports.MAX_PAGE_SIZE = 100;
exports.ACCESS_TOKEN_EXPIRY = 3600;
exports.REFRESH_TOKEN_EXPIRY = 2592000;
exports.DEFAULT_CONFIDENCE_THRESHOLD = 0.7;
exports.MIN_CONFIDENCE_FOR_AUTO_RESPONSE = 0.75;
exports.DEFAULT_TOP_K_RESULTS = 5;
exports.CHUNK_SIZE = 500;
exports.CHUNK_OVERLAP = 50;
exports.MAX_CALL_DURATION_SECONDS = 1800;
exports.SMS_MAX_LENGTH = 1600;
exports.PHONE_REGEX = /^\+[1-9]\d{1,14}$/;
exports.TRIAL_DURATION_DAYS = 14;
exports.MAX_KNOWLEDGE_ITEMS_PER_COMPANY = 500;
exports.MAX_CALLS_PER_MONTH_TRIAL = 100;
exports.MAX_RECORDING_SIZE_MB = 50;
exports.ALLOWED_AUDIO_FORMATS = ['mp3', 'wav', 'ogg'];
exports.RECORDING_RETENTION_DAYS = 90;
exports.PLAN_LIMITS = {
    [domain_1.SubscriptionPlan.STARTER]: {
        monthly_minutes: 0,
        sms_limit: 0,
        contacts_limit: 300,
    },
    [domain_1.SubscriptionPlan.PRO]: {
        monthly_minutes: 300,
        sms_limit: 600,
        contacts_limit: 1000,
    },
    [domain_1.SubscriptionPlan.MAX]: {
        monthly_minutes: 750,
        sms_limit: 1500,
        contacts_limit: 3000,
    },
};
exports.PLAN_FEATURES = {
    [domain_1.SubscriptionPlan.STARTER]: {
        transcripts: false,
        call_summaries: false,
        after_hours_routing: false,
        crm_integrations: false,
        advanced_routing: false,
        human_transfer: false,
        sms_reminders: false,
        follow_up_sequences: false,
        recording_retention_days: 0,
        priority_support: false,
        website_widget: false,
    },
    [domain_1.SubscriptionPlan.PRO]: {
        transcripts: true,
        call_summaries: true,
        after_hours_routing: true,
        crm_integrations: false,
        advanced_routing: false,
        human_transfer: true,
        sms_reminders: true,
        follow_up_sequences: true,
        recording_retention_days: 30,
        priority_support: true,
        website_widget: false,
    },
    [domain_1.SubscriptionPlan.MAX]: {
        transcripts: true,
        call_summaries: true,
        after_hours_routing: true,
        crm_integrations: true,
        advanced_routing: true,
        human_transfer: true,
        sms_reminders: true,
        follow_up_sequences: true,
        recording_retention_days: 90,
        priority_support: true,
        website_widget: true,
    },
};
exports.ERROR_CODES = {
    INVALID_CREDENTIALS: 'AUTH001',
    TOKEN_EXPIRED: 'AUTH002',
    INSUFFICIENT_PERMISSIONS: 'AUTH003',
    INVALID_INPUT: 'VAL001',
    MISSING_REQUIRED_FIELD: 'VAL002',
    RESOURCE_NOT_FOUND: 'BIZ001',
    DUPLICATE_RESOURCE: 'BIZ002',
    OPERATION_NOT_ALLOWED: 'BIZ003',
    QUOTA_EXCEEDED: 'BIZ004',
    TELEPHONY_ERROR: 'EXT001',
    LLM_ERROR: 'EXT002',
    STORAGE_ERROR: 'EXT003',
    INTERNAL_ERROR: 'SYS001',
    DATABASE_ERROR: 'SYS002',
};
//# sourceMappingURL=constants.js.map