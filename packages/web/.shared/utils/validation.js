"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidPhoneNumber = isValidPhoneNumber;
exports.formatPhoneNumber = formatPhoneNumber;
exports.isValidEmail = isValidEmail;
exports.isValidUUID = isValidUUID;
exports.isValidTimeFormat = isValidTimeFormat;
exports.isValidTimeRange = isValidTimeRange;
exports.isValidTimezone = isValidTimezone;
exports.sanitizeString = sanitizeString;
exports.validatePaginationParams = validatePaginationParams;
const constants_1 = require("./constants");
function isValidPhoneNumber(phone) {
    return constants_1.PHONE_REGEX.test(phone);
}
function formatPhoneNumber(phone) {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
        return `+${cleaned}`;
    }
    if (cleaned.length === 10) {
        return `+1${cleaned}`;
    }
    return `+${cleaned}`;
}
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function isValidEmail(email) {
    return EMAIL_REGEX.test(email);
}
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isValidUUID(uuid) {
    return UUID_REGEX.test(uuid);
}
const TIME_REGEX = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
function isValidTimeFormat(time) {
    return TIME_REGEX.test(time);
}
function isValidTimeRange(open, close) {
    if (!isValidTimeFormat(open) || !isValidTimeFormat(close)) {
        return false;
    }
    const [openHour, openMin] = open.split(':').map(Number);
    const [closeHour, closeMin] = close.split(':').map(Number);
    const openMinutes = openHour * 60 + openMin;
    const closeMinutes = closeHour * 60 + closeMin;
    return closeMinutes > openMinutes;
}
function isValidTimezone(timezone) {
    try {
        Intl.DateTimeFormat(undefined, { timeZone: timezone });
        return true;
    }
    catch {
        return false;
    }
}
function sanitizeString(input, maxLength) {
    let sanitized = input.trim();
    if (maxLength && sanitized.length > maxLength) {
        sanitized = sanitized.substring(0, maxLength);
    }
    return sanitized;
}
function validatePaginationParams(page, pageSize) {
    const validPage = Math.max(1, page || 1);
    const validPageSize = Math.min(100, Math.max(1, pageSize || 20));
    return { page: validPage, pageSize: validPageSize };
}
//# sourceMappingURL=validation.js.map