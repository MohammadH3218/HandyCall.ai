"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RIYADH_DISTRICTS = exports.PASSWORD_REGEX = exports.IBAN_REGEX = exports.NATIONAL_ID_REGEX = exports.SAUDI_PHONE_REGEX = void 0;
exports.sarToHalalas = sarToHalalas;
exports.halalaToSar = halalaToSar;
exports.calculateBookingFinancials = calculateBookingFinancials;
exports.SAUDI_PHONE_REGEX = /^\+9665\d{8}$/;
exports.NATIONAL_ID_REGEX = /^\d{10}$/;
exports.IBAN_REGEX = /^SA\d{22}$/;
exports.PASSWORD_REGEX = /^(?=.*[a-zA-Z])(?=.*\d).{8,}$/;
function sarToHalalas(sar) {
    return Math.round(sar * 100);
}
function halalaToSar(halalas) {
    return halalas / 100;
}
function calculateBookingFinancials(servicePriceHalalas) {
    const vat = Math.round(servicePriceHalalas * 0.15);
    const fee = Math.round(servicePriceHalalas * 0.15);
    return {
        service_price_sar: servicePriceHalalas,
        vat_amount_sar: vat,
        platform_fee_sar: fee,
        pro_payout_sar: servicePriceHalalas - fee,
        customer_total_sar: servicePriceHalalas + vat,
    };
}
exports.RIYADH_DISTRICTS = [
    'Al Olaya',
    'Al Malaz',
    'Al Murabbah',
    'Al Rawdah',
    'Al Sulaymaniyah',
    'Al Nakheel',
    'Al Hamra',
    'Al Sahafa',
    'Al Shuhada',
    'Al Wizarat',
    'Al Madinah',
    'Al Aziziyah',
    'Al Batha',
    'Al Dirah',
    'Al Faisaliyah',
    'Al Ghadir',
    'Al Jazirah',
    'Al Malqa',
    'Al Mansourah',
    'Al Murabba',
    'Al Naseem',
    'Al Qirawan',
    'Al Rabwah',
    'Al Uraija',
    'Al Yasmin',
    'Hittin',
    'Ishbiliyah',
    'King Fahd',
    'Qurtubah',
    'Salam',
];
//# sourceMappingURL=marketplace.js.map