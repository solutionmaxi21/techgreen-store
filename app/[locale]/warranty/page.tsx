"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useLanguage } from "@/lib/language-context"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { CONTACT_INFO } from "@/config/constants"
import { Shield, Clock, CheckCircle, AlertCircle, HelpCircle } from "lucide-react"

export default function WarrantyPage() {
  const { language } = useLanguage()

  const content = {
    fr: {
      title: "Garantie",
      intro: "Le matériel que nous vendons est testé, reconditionné et suivi après la vente.",
      sections: [
        {
          icon: "shield",
          title: "Matériel Reconditionné et Testé",
          content: "Chaque appareil est contrôlé et reconditionné avant sa mise en vente. Les défauts constatés à la réception sont pris en charge."
        },
        {
          icon: "clock",
          title: "Durée de la Garantie",
          content: "La durée de garantie dépend du type de matériel et de son état de reconditionnement. Elle est indiquée sur la fiche du produit et rappelée sur votre facture."
        },
        {
          icon: "check",
          title: "Ce qui est Couvert",
          content: "Sont couverts les défauts de fonctionnement apparus dans des conditions normales d'utilisation, ainsi que les vices cachés."
        },
        {
          icon: "alert",
          title: "Ce qui n'est pas Couvert",
          content: "Ne sont pas couverts : les dommages liés à une mauvaise utilisation, les chutes, les dégâts causés par un liquide, l'usure normale, ainsi que toute intervention effectuée hors de nos ateliers."
        },
        {
          icon: "help",
          title: "Faire Valoir la Garantie",
          content: "Conservez votre facture : elle est indispensable. Contactez-nous avec votre numéro de commande et une description précise du problème. Nous vous indiquerons la marche à suivre."
        },
        {
          icon: "alert",
          title: "Défaut Constaté à la Réception",
          content: "Si vous découvrez un défaut au moment de la réception, signalez-le au transporteur avant de régler le colis, puis contactez-nous : nous prenons en charge le remplacement du matériel concerné."
        }
      ],
      importantNote: "Important : conservez toujours votre facture d'achat. Elle est votre preuve d'achat et reste indispensable pour faire valoir la garantie.",
      contactInfo: "Pour toute réclamation en garantie, contactez-nous :"
    },
    ar: {
      title: "الضمان",
      intro: "المعدات التي نبيعها مُختبرة ومُجدَّدة ومتابعة بعد البيع.",
      sections: [
        {
          icon: "shield",
          title: "معدات مُجدَّدة ومُختبرة",
          content: "كل جهاز يتم فحصه وتجديده قبل عرضه للبيع. والعيوب المُثبتة عند الاستلام يتم التكفل بها."
        },
        {
          icon: "clock",
          title: "مدة الضمان",
          content: "تختلف مدة الضمان حسب نوع المعدات وحالة تجديدها. وهي مذكورة في بطاقة المنتج ومُبيَّنة في فاتورتكم."
        },
        {
          icon: "check",
          title: "ما يغطيه الضمان",
          content: "يشمل الضمان عيوب التشغيل التي تظهر في ظروف الاستعمال العادية، وكذلك العيوب الخفية."
        },
        {
          icon: "alert",
          title: "ما لا يغطيه الضمان",
          content: "لا يشمل الضمان: الأضرار الناتجة عن سوء الاستعمال، السقوط، التلف بفعل السوائل، البلى العادي، وكذلك أي تدخل يتم خارج ورشاتنا."
        },
        {
          icon: "help",
          title: "المطالبة بالضمان",
          content: "احتفظوا بفاتورتكم: فهي ضرورية. تواصلوا معنا برقم طلبكم ووصف دقيق للمشكلة، وسنوضح لكم الإجراءات الواجب اتباعها."
        },
        {
          icon: "alert",
          title: "عيب مُثبت عند الاستلام",
          content: "إذا اكتشفتم عيبًا عند الاستلام، أبلغوا موظف الشحن قبل الدفع، ثم تواصلوا معنا: نتكفل باستبدال المعدات المعنية."
        }
      ],
      importantNote: "مهم: احتفظوا دائمًا بفاتورة الشراء. فهي دليل شرائكم وتبقى ضرورية للمطالبة بالضمان.",
      contactInfo: "لأي مطالبة بالضمان، تواصلوا معنا:"
    }
  }

  const data = content[language === 'ar' ? 'ar' : 'fr']

  const iconMap = {
    shield: <Shield className="h-6 w-6 text-primary" />,
    check: <CheckCircle className="h-6 w-6 text-primary" />,
    alert: <AlertCircle className="h-6 w-6 text-warning" />,
    clock: <Clock className="h-6 w-6 text-info" />,
    help: <HelpCircle className="h-6 w-6 text-destructive" />
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-12">
          <h1 className="text-4xl font-bold mb-4">{data.title}</h1>
          <p className="text-lg text-muted-foreground mb-12 max-w-4xl">
            {data.intro}
          </p>

          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6 mb-12">
            {data.sections.map((section, index) => (
              <Card key={index} className="border-l-4 border-l-primary h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    {iconMap[section.icon as keyof typeof iconMap]}
                    {section.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">{section.content}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="bg-warning/10 border-warning/30">
            <CardContent className="py-6">
              <div className="flex gap-3">
                <AlertCircle className="h-6 w-6 text-warning shrink-0" />
                <p className="text-foreground">
                  {data.importantNote}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-muted/50 mt-6">
            <CardContent className="py-6">
              <p className="text-center text-muted-foreground">
                {data.contactInfo}{' '}
                <a href={`mailto:${CONTACT_INFO.email.primary}`} className="text-primary hover:underline font-medium">
                  {CONTACT_INFO.email.primary}
                </a>
                {' · '}
                <a
                  href={`tel:${CONTACT_INFO.phone.primary}`}
                  dir="ltr"
                  style={{ direction: 'ltr', unicodeBidi: 'isolate' }}
                  className="text-primary hover:underline font-medium"
                >
                  {CONTACT_INFO.phone.display.primary}
                </a>
              </p>
            </CardContent>
          </Card>

          <div className="mt-8 text-center">
            <Link href={`/${language}/faq`} className="text-primary hover:underline">
              {language === 'ar' ? '← العودة إلى الأسئلة الشائعة' : '← Retour aux questions fréquentes'}
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
