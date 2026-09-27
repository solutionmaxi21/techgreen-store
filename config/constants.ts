/**
 * Application Constants
 * Centralized configuration for contact information and other app-wide constants.
 *
 * Source of truth: https://www.tech-green.fr/ (official TECH-GREEN website).
 * Every value below is taken from the public site. Anything the site does NOT
 * publish is left out rather than invented — see NOTES at the bottom.
 */

export const CONTACT_INFO = {
  phone: {
    /** Published on tech-green.fr as 09 74 56 30 97 (tel:+33974563097) */
    primary: '0974563097',
    display: {
      primary: '09 74 56 30 97',
    },
  },
  email: {
    /**
     * tech-green.fr exposes only a contact form (no address published).
     * Domain-standard address used as a placeholder — confirm before go-live.
     */
    primary: 'contact@tech-green.fr',
    support: 'contact@tech-green.fr',
  },
  address: {
    street: "32 Boulevard de l'Ouest",
    postalCode: '69580',
    city: 'Sathonay-Camp',
    region: 'Auvergne-Rhône-Alpes',
    country: 'France',
    countryCode: 'FR',
    full: "32 Boulevard de l'Ouest, 69580 Sathonay-Camp, France",
  },
};

export const COMPANY_INFO = {
  name: 'TechGreen',
  legalName: 'TECH-GREEN',
  /** Published claim on tech-green.fr: "10 ans d'expérience" */
  experienceYears: 10,
  tagline: 'Une seconde vie éco-responsable pour votre parc IT',
  description:
    "Reconditionnement de matériel informatique et de téléphones mobiles pour les entreprises de la région lyonnaise",
  city: 'Lyon',
} as const;

/**
 * tech-green.fr publishes no fixed opening hours: the first diagnosis and any
 * appointment are arranged by phone or through the contact form, Monday to
 * Friday. We only state what the site states.
 */
export const BUSINESS_HOURS = {
  weekdays: 'Lundi – Vendredi : sur rendez-vous',
  note: "Premier diagnostic et prise de rendez-vous par téléphone ou via le formulaire de contact.",
} as const;

/**
 * NOTES — values still requiring a business confirmation before go-live:
 *  - CONTACT_INFO.email.*  → no address is published on tech-green.fr.
 *  - BUSINESS_HOURS        → no fixed schedule is published on tech-green.fr.
 *  - Currency / shipping / VAT rules are NOT defined here: they depend on the
 *    visitor's country and live in `config/market.ts`.
 */
