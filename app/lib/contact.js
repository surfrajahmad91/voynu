/*
 * Replace with your real WhatsApp Business number
 * (international format, digits only, no + or spaces).
 */
export const WHATSAPP_NUMBER = "919918614844";

export function buildWhatsAppLink(message) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    message
  )}`;
}
