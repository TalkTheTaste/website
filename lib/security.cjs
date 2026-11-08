'use strict';

const { parsePhoneNumberFromString } = require('libphonenumber-js/min');
const PUBLIC_SETTINGS = ['siteName', 'tagline', 'email', 'phone', 'instagram', 'linkedin', 'tiktok', 'web3formsKey'];

function publicSettings(settings = {}) {
    if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return {};
    return Object.fromEntries(PUBLIC_SETTINGS.filter(key => Object.hasOwn(settings, key)).map(key => [key, settings[key]]));
}

function cleanText(value) {
    return typeof value === 'string' ? value.trim().slice(0, 2000) : '';
}

function normalizePhone(value, countryCode = '') {
    const raw = cleanText(value);
    if (!raw || !/^[+\d\s().-]+$/.test(raw)) return '';
    let input = raw.replace(/[\s().-]/g, '');
    if (input.startsWith('00')) input = '+' + input.slice(2);
    if (!input.startsWith('+')) {
        if (!/^\+[1-9]\d{0,3}$/.test(countryCode)) return '';
        // A selected international calling code replaces the national trunk prefix.
        // Italy retains its leading zero as part of the international number.
        input = countryCode + (countryCode === '+39' ? input : input.replace(/^0+/, ''));
    }
    const phone = parsePhoneNumberFromString(input);
    return phone?.isValid() ? phone.number : '';
}

function validAuditUrl(value) {
    const input = cleanText(value);
    if (/^@[a-zA-Z0-9_](?:[a-zA-Z0-9_.]{0,28}[a-zA-Z0-9_])?$/.test(input)) return true;
    try {
        const url = new URL(input);
        return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password && url.hostname.includes('.') && !/\s/.test(input);
    } catch { return false; }
}

function validateLead(body, phone) {
    const errors = [];
    if (!cleanText(body.fname)) errors.push('fname');
    if (!cleanText(body.lname)) errors.push('lname');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanText(body.email))) errors.push('email');
    if (!phone) errors.push('phone');
    if (cleanText(body.message).length < 10) errors.push('message');
    if (body.contactConsent !== true) errors.push('contactConsent');
    if (body.source === 'Free Growth Audit Form' && !validAuditUrl(body.auditUrl)) errors.push('auditUrl');
    return errors;
}

function adminConfigured(env) {
    return typeof env.ADMIN_PASSWORD === 'string' && env.ADMIN_PASSWORD.length >= 16 &&
        typeof env.SESSION_SECRET === 'string' && env.SESSION_SECRET.length >= 32;
}

module.exports = { publicSettings, cleanText, normalizePhone, validAuditUrl, validateLead, adminConfigured };
