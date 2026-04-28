export declare function isValidPhoneNumber(phone: string): boolean;
export declare function formatPhoneNumber(phone: string): string;
export declare function isValidEmail(email: string): boolean;
export declare function isValidUUID(uuid: string): boolean;
export declare function isValidTimeFormat(time: string): boolean;
export declare function isValidTimeRange(open: string, close: string): boolean;
export declare function isValidTimezone(timezone: string): boolean;
export declare function sanitizeString(input: string, maxLength?: number): string;
export declare function validatePaginationParams(page?: number, pageSize?: number): {
    page: number;
    pageSize: number;
};
//# sourceMappingURL=validation.d.ts.map