/**
 * Social Media Links Configuration
 * Centralized social media URLs for consistent usage across the application.
 *
 * Source of truth: https://www.tech-green.fr/ — only the networks TECH-GREEN
 * actually maintains are listed here. No Instagram / WhatsApp account is
 * published by the brand, so none is declared.
 */

export interface SocialLink {
  name: string;
  url: string;
  icon: string;
  ariaLabel: string;
}

export const SOCIAL_LINKS: SocialLink[] = [
  {
    name: 'Facebook',
    url: 'https://www.facebook.com/profile.php?id=61573417487934',
    icon: 'facebook',
    ariaLabel: 'Suivez-nous sur Facebook',
  },
  {
    name: 'LinkedIn',
    url: 'https://www.linkedin.com/company/techgreen-reconditionn%C3%A9/',
    icon: 'linkedin',
    ariaLabel: 'Connectez-vous avec nous sur LinkedIn',
  },
];
