/** EA Forests contact channels: the single source for every call / WhatsApp link on the site. */
export const eaForestsContact = {
  call: { display: "+254 714 645 505", e164: "+254714645505" },
  whatsapp: { display: "+254 736 582 943", e164: "+254736582943" },
} as const

/** Opens the phone dialer. */
export const callHref = `tel:${eaForestsContact.call.e164}`

/** Opens a WhatsApp chat with the team, optionally with a pre-filled first message. */
export function whatsappHref(message?: string) {
  const base = `https://wa.me/${eaForestsContact.whatsapp.e164.replace(/\D/g, "")}`
  return message ? `${base}?text=${encodeURIComponent(message)}` : base
}
