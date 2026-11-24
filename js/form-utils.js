const { normalizePhone, validAuditUrl } = require('../lib/security.cjs');
const initPhoneInputs = require('./phone-fields.js');
function phoneValue(input) { const wrap=input.closest('[data-phone-field]');if(!wrap)return normalizePhone(input.value);const selected=wrap.querySelector('[data-phone-country]').value;return normalizePhone(input.value,selected==='other'?'+'+wrap.querySelector('[data-phone-code]').value:selected); }
window.TTTForms = { normalizePhone, validAuditUrl, initPhoneInputs, phoneValue };
