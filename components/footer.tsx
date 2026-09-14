"use client"

import Link from "next/link"
import { DarkBgLogo } from "@/components/theme-logo"
import { Facebook, Instagram, Twitter, Youtube, MapPin, Phone, Mail, Linkedin } from "lucide-react"
import { CONTACT_INFO, COMPANY_INFO } from "../config/constants"
import { SOCIAL_LINKS } from "../config/socialLinks"
import { useLanguage } from "@/lib/language-context"

export function Footer() {
  const { t, language } = useLanguage()

  return (
    <footer className="bg-footer-bg text-footer-foreground mt-6 md:mt-8">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* About */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <DarkBgLogo
                src="/logo-dark.png"
                alt="Tech Green Logo"
                width={120}
                height={40}
                className="h-10 w-auto object-contain"
              />
            </div>
            <p className="text-footer-muted mb-4 text-sm leading-relaxed">
              {language === 'ar' ? `حلول معلوماتية وتكنولوجية للشركات في الجزائر. منذ ${COMPANY_INFO.foundedYear}.` : `${COMPANY_INFO.description}. Depuis ${COMPANY_INFO.foundedYear}.`}
            </p>
            <div className="flex gap-3">
              {SOCIAL_LINKS.filter(link => ['Facebook', 'Instagram', 'LinkedIn'].includes(link.name)).map((social) => (
                <Link
                  key={social.name}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center hover:bg-primary transition-colors"
                  aria-label={social.ariaLabel}
                >
                  {social.name === 'Facebook' && <Facebook className="h-4 w-4" aria-hidden="true" />}
                  {social.name === 'Instagram' && <Instagram className="h-4 w-4" aria-hidden="true" />}
                  {social.name === 'LinkedIn' && <Linkedin className="h-4 w-4" aria-hidden="true" />}
                </Link>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-base mb-4">{t.footer.quickLinks}</h3>
            <ul className="space-y-2.5">
              <li>
                <Link href={`/${language}/store`} className="text-footer-muted hover:text-primary transition-colors text-sm">
                  {t.footer.shopAll}
                </Link>
              </li>
              <li>
                <Link href={`/${language}/deals`} className="text-footer-muted hover:text-primary transition-colors text-sm">
                  {t.footer.dealsOffers}
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-footer-muted hover:text-primary transition-colors text-sm">
                  {t.footer.aboutUs}
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-footer-muted hover:text-primary transition-colors text-sm">
                  {t.footer.contact}
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-footer-muted hover:text-primary transition-colors text-sm">
                  {t.footer.faq}
                </Link>
              </li>
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h3 className="font-semibold text-base mb-4">{t.footer.customerService}</h3>
            <ul className="space-y-2.5">
              <li>
                <Link href="/account" className="text-footer-muted hover:text-primary transition-colors text-sm">
                  {t.footer.myAccount}
                </Link>
              </li>
              <li>
                <Link href={`/${language}/orders`} className="text-footer-muted hover:text-primary transition-colors text-sm">
                  {t.footer.trackOrder}
                </Link>
              </li>
              <li>
                <Link href="/returns" className="text-footer-muted hover:text-primary transition-colors text-sm">
                  {t.footer.returnsRefunds}
                </Link>
              </li>
              <li>
                <Link href="/shipping" className="text-footer-muted hover:text-primary transition-colors text-sm">
                  {t.footer.shippingInfo}
                </Link>
              </li>
              <li>
                <Link href="/warranty" className="text-footer-muted hover:text-primary transition-colors text-sm">
                  {t.footer.warranty}
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="font-semibold text-base mb-4">{t.footer.contactUs}</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-primary" aria-hidden="true" />
                <span className="text-footer-muted text-sm">
                  {CONTACT_INFO.address.street}
                  <br />
                  {CONTACT_INFO.address.city}, {CONTACT_INFO.address.country}
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <a href={`tel:${CONTACT_INFO.phone.primary}`} dir="ltr" style={{ direction: 'ltr', unicodeBidi: 'isolate' }} className="text-footer-muted hover:text-primary transition-colors text-sm">
                  {CONTACT_INFO.phone.display.primary}
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <a href={`tel:${CONTACT_INFO.phone.secondary}`} dir="ltr" style={{ direction: 'ltr', unicodeBidi: 'isolate' }} className="text-footer-muted hover:text-primary transition-colors text-sm">
                  {CONTACT_INFO.phone.display.secondary}
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <a href={`mailto:${CONTACT_INFO.email.primary}`} className="text-footer-muted hover:text-primary transition-colors text-sm">
                  {CONTACT_INFO.email.primary}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-footer-border mt-8 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-footer-muted/60 text-xs">© {new Date().getFullYear()} {COMPANY_INFO.name}. {t.footer.allRightsReserved}</p>
          <div className="flex gap-6 text-xs">
            <Link href="/privacy" className="text-footer-muted/60 hover:text-footer-accent transition-colors">
              {t.footer.privacyPolicy}
            </Link>
            <Link href="/terms" className="text-footer-muted/60 hover:text-footer-accent transition-colors">
              {t.footer.termsOfService}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
