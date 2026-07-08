/**
 * WhatsApp SOS Utility
 *
 * Client-side helper to send emergency alerts via WhatsApp deep links.
 * Completely free — no API keys needed.
 *
 * How it works:
 * - Builds an emergency message with a Google Maps location link
 * - Generates WhatsApp deep links (wa.me) for each trusted contact
 * - User taps SEND for each contact (browsers block auto-open popups)
 */

/**
 * Build the SOS emergency message with location.
 *
 * @param {number} latitude
 * @param {number} longitude
 * @param {string} [userName] - Name of the person in danger
 * @returns {string} Formatted emergency message
 */
export function buildSOSMessage(latitude, longitude, userName = 'A Kavach user') {
  const mapsUrl =
    latitude && longitude && (latitude !== 0 || longitude !== 0)
      ? `https://maps.google.com/?q=${latitude},${longitude}`
      : null;

  let message = `🚨 EMERGENCY ALERT 🚨\n`;
  message += `From: ${userName}\n\n`;
  message += `I might be in danger and need help urgently.\n\n`;

  if (mapsUrl) {
    message += `📍 My Live Location:\n${mapsUrl}\n\n`;
  } else {
    message += `📍 Location could not be determined.\n\n`;
  }

  message += `Please reach me ASAP!\n`;
  message += `— Sent via Kavach Safety App`;

  return message;
}

/**
 * Generate a WhatsApp deep link for a single contact.
 *
 * @param {string} phone - Phone number (with or without country code)
 * @param {string} message - Pre-filled message
 * @returns {string} WhatsApp deep link URL
 */
export function getWhatsAppLink(phone, message) {
  // Clean phone: remove spaces, dashes, parentheses
  let cleaned = phone.replace(/[\s\-\(\)\+]/g, '');

  // Add India country code if not present
  if (cleaned.length === 10 && /^\d{10}$/.test(cleaned)) {
    cleaned = '91' + cleaned;
  }

  const encoded = encodeURIComponent(message);
  return `https://wa.me/${cleaned}?text=${encoded}`;
}

/**
 * Build WhatsApp links for all contacts (does NOT auto-open).
 * Returns an array of { name, phone, link } objects for the UI to render.
 *
 * @param {Array<{name: string, phone: string}>} contacts - Trusted contacts
 * @param {number} latitude - User's latitude
 * @param {number} longitude - User's longitude
 * @param {string} [userName] - Name of the person in danger
 * @returns {{ success: boolean, contactCount: number, message: string, links: Array<{name: string, phone: string, link: string}> }}
 */
export function buildWhatsAppSOSLinks(contacts, latitude, longitude, userName) {
  if (!contacts || contacts.length === 0) {
    return {
      success: false,
      contactCount: 0,
      message: 'No trusted contacts found. Please add emergency contacts first.',
      links: [],
    };
  }

  const sosMessage = buildSOSMessage(latitude, longitude, userName);

  const links = contacts.map((contact) => ({
    name: contact.name,
    phone: contact.phone,
    link: getWhatsAppLink(contact.phone, sosMessage),
  }));

  return {
    success: true,
    contactCount: contacts.length,
    message: `Tap each contact below to send SOS via WhatsApp.`,
    links,
  };
}

/**
 * Generate an SMS deep link for a single contact.
 * Works on all phones — opens the native SMS/Messages app with pre-filled text.
 *
 * @param {string} phone - Phone number
 * @param {string} message - Pre-filled message
 * @returns {string} SMS deep link URL
 */
export function getSMSLink(phone, message) {
  let cleaned = phone.replace(/[\s\-\(\)\+]/g, '');
  if (cleaned.length === 10 && /^\d{10}$/.test(cleaned)) {
    cleaned = '+91' + cleaned;
  } else if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }
  const encoded = encodeURIComponent(message);
  // Use & for iOS and ? for Android — &body= works on both modern platforms
  return `sms:${cleaned}?body=${encoded}`;
}

/**
 * Build both WhatsApp and SMS links for all contacts.
 * Returns an array with both link types per contact.
 *
 * @param {Array<{name: string, phone: string}>} contacts
 * @param {number} latitude
 * @param {number} longitude
 * @param {string} [userName]
 * @returns {{ success: boolean, contactCount: number, links: Array<{name: string, phone: string, whatsappLink: string, smsLink: string}> }}
 */
export function buildSOSLinks(contacts, latitude, longitude, userName) {
  if (!contacts || contacts.length === 0) {
    return { success: false, contactCount: 0, links: [] };
  }

  const sosMessage = buildSOSMessage(latitude, longitude, userName);

  const links = contacts.map((contact) => ({
    name: contact.name,
    phone: contact.phone,
    whatsappLink: getWhatsAppLink(contact.phone, sosMessage),
    smsLink: getSMSLink(contact.phone, sosMessage),
  }));

  return { success: true, contactCount: contacts.length, links };
}

export default buildWhatsAppSOSLinks;
