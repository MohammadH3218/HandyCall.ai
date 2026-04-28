"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SMSStatus = exports.SMSDirection = exports.AppointmentStatus = exports.LeadStatus = exports.ContactSource = exports.UserRole = exports.SubscriptionStatus = exports.SubscriptionPlan = exports.ServiceType = exports.CompanyStatus = void 0;
var CompanyStatus;
(function (CompanyStatus) {
    CompanyStatus["ACTIVE"] = "ACTIVE";
    CompanyStatus["INACTIVE"] = "INACTIVE";
    CompanyStatus["SUSPENDED"] = "SUSPENDED";
    CompanyStatus["TRIAL"] = "TRIAL";
    CompanyStatus["CANCELLED"] = "CANCELLED";
})(CompanyStatus || (exports.CompanyStatus = CompanyStatus = {}));
var ServiceType;
(function (ServiceType) {
    ServiceType["HANDYMAN"] = "HANDYMAN";
    ServiceType["PEST_CONTROL"] = "PEST_CONTROL";
    ServiceType["ELECTRICIAN"] = "ELECTRICIAN";
    ServiceType["PLUMBING"] = "PLUMBING";
    ServiceType["HVAC"] = "HVAC";
    ServiceType["LANDSCAPING"] = "LANDSCAPING";
    ServiceType["LAWN_CARE"] = "LAWN_CARE";
    ServiceType["CLEANING"] = "CLEANING";
    ServiceType["CARPET_CLEANING"] = "CARPET_CLEANING";
    ServiceType["WINDOW_CLEANING"] = "WINDOW_CLEANING";
    ServiceType["PRESSURE_WASHING"] = "PRESSURE_WASHING";
    ServiceType["POOL_SERVICE"] = "POOL_SERVICE";
    ServiceType["TREE_SERVICE"] = "TREE_SERVICE";
    ServiceType["ROOFING"] = "ROOFING";
    ServiceType["PAINTING"] = "PAINTING";
    ServiceType["FLOORING"] = "FLOORING";
    ServiceType["REMODELING"] = "REMODELING";
    ServiceType["GARAGE_DOOR"] = "GARAGE_DOOR";
    ServiceType["APPLIANCE_REPAIR"] = "APPLIANCE_REPAIR";
    ServiceType["AUTO_MECHANIC"] = "AUTO_MECHANIC";
    ServiceType["LOCKSMITH"] = "LOCKSMITH";
    ServiceType["MOVING"] = "MOVING";
    ServiceType["JUNK_REMOVAL"] = "JUNK_REMOVAL";
    ServiceType["IRRIGATION"] = "IRRIGATION";
    ServiceType["SNOW_REMOVAL"] = "SNOW_REMOVAL";
    ServiceType["FENCING"] = "FENCING";
    ServiceType["CONCRETE"] = "CONCRETE";
    ServiceType["SOLAR"] = "SOLAR";
    ServiceType["SECURITY"] = "SECURITY";
    ServiceType["OTHER"] = "OTHER";
})(ServiceType || (exports.ServiceType = ServiceType = {}));
var SubscriptionPlan;
(function (SubscriptionPlan) {
    SubscriptionPlan["STARTER"] = "STARTER";
    SubscriptionPlan["PRO"] = "PRO";
    SubscriptionPlan["MAX"] = "MAX";
})(SubscriptionPlan || (exports.SubscriptionPlan = SubscriptionPlan = {}));
var SubscriptionStatus;
(function (SubscriptionStatus) {
    SubscriptionStatus["TRIALING"] = "TRIALING";
    SubscriptionStatus["ACTIVE"] = "ACTIVE";
    SubscriptionStatus["PAST_DUE"] = "PAST_DUE";
    SubscriptionStatus["CANCELED"] = "CANCELED";
    SubscriptionStatus["UNPAID"] = "UNPAID";
    SubscriptionStatus["INCOMPLETE"] = "INCOMPLETE";
})(SubscriptionStatus || (exports.SubscriptionStatus = SubscriptionStatus = {}));
var UserRole;
(function (UserRole) {
    UserRole["OWNER"] = "OWNER";
    UserRole["ADMIN"] = "ADMIN";
    UserRole["STAFF"] = "STAFF";
})(UserRole || (exports.UserRole = UserRole = {}));
var ContactSource;
(function (ContactSource) {
    ContactSource["INBOUND_CALL"] = "INBOUND_CALL";
    ContactSource["INBOUND_SMS"] = "INBOUND_SMS";
    ContactSource["MANUAL"] = "MANUAL";
    ContactSource["IMPORT"] = "IMPORT";
})(ContactSource || (exports.ContactSource = ContactSource = {}));
var LeadStatus;
(function (LeadStatus) {
    LeadStatus["NEW"] = "NEW";
    LeadStatus["CONTACTED"] = "CONTACTED";
    LeadStatus["QUALIFIED"] = "QUALIFIED";
    LeadStatus["CONVERTED"] = "CONVERTED";
    LeadStatus["LOST"] = "LOST";
})(LeadStatus || (exports.LeadStatus = LeadStatus = {}));
var AppointmentStatus;
(function (AppointmentStatus) {
    AppointmentStatus["PENDING_ACCEPTANCE"] = "PENDING_ACCEPTANCE";
    AppointmentStatus["SCHEDULED"] = "SCHEDULED";
    AppointmentStatus["CONFIRMED"] = "CONFIRMED";
    AppointmentStatus["IN_PROGRESS"] = "IN_PROGRESS";
    AppointmentStatus["COMPLETED"] = "COMPLETED";
    AppointmentStatus["CANCELLED"] = "CANCELLED";
    AppointmentStatus["NO_SHOW"] = "NO_SHOW";
})(AppointmentStatus || (exports.AppointmentStatus = AppointmentStatus = {}));
var SMSDirection;
(function (SMSDirection) {
    SMSDirection["INBOUND"] = "INBOUND";
    SMSDirection["OUTBOUND"] = "OUTBOUND";
})(SMSDirection || (exports.SMSDirection = SMSDirection = {}));
var SMSStatus;
(function (SMSStatus) {
    SMSStatus["QUEUED"] = "QUEUED";
    SMSStatus["SENT"] = "SENT";
    SMSStatus["DELIVERED"] = "DELIVERED";
    SMSStatus["FAILED"] = "FAILED";
})(SMSStatus || (exports.SMSStatus = SMSStatus = {}));
//# sourceMappingURL=domain.js.map