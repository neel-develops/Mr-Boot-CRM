// Shared WhatsApp helpers — used by the dashboard UI and the widget APIs.

/**
 * Normalize an Indian phone number for wa.me links.
 * wa.me REQUIRES a country code: a bare 10-digit number silently fails.
 * "98765 43210" -> "919876543210", "098765..." -> "9198765...", "+91..." kept.
 */
export function normalizeIndianPhone(raw: string): string {
  let digits = (raw || '').replace(/[^0-9]/g, '');
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  if (digits.length === 10) digits = '91' + digits;
  return digits;
}

/** Fill {{placeholder}} tokens in a Settings template. */
export function fillTemplate(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (msg, [key, value]) => msg.split(`{{${key}}}`).join(value),
    template
  );
}

/** Build a click-to-chat link with a pre-filled message. */
export function buildWaUrl(phone: string, message: string): string {
  return `https://wa.me/${normalizeIndianPhone(phone)}?text=${encodeURIComponent(message)}`;
}

/** The standard "your order is ready" blast message. */
export function buildReadyMessage(firstName: string, itemType: string): string {
  return `Hi ${firstName}! 🎉 Great news — your ${itemType} is ready for pickup/delivery at *Mr. Boot*! Please let us know when you're coming or if you need pick & drop. 👟✨`;
}
