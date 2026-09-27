"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useLanguage } from "@/lib/language-context"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { CONTACT_INFO } from "@/config/constants"
import { Truck, Clock, MapPin, DollarSign, Phone } from "lucide-react"

export default function ShippingInfoPage() {
  const { language } = useLanguage()

  const content = {
    fr: {
      title: "Informations de Livraison",
      intro: "Comment nous expédions votre matériel, en France et en Algérie.",
      sections: [
        {
          icon: "truck",
          title: "Zones Desservies",
          content: "Nous expédions en France métropolitaine et en Algérie. Les zones réellement desservies, ainsi que les transporteurs disponibles pour votre adresse, sont confirmés au moment du paiement selon votre pays et votre région."
        },
        {
          icon: "map",
          title: "Partenaires Logistiques",
          content: "En Algérie, nos expéditions sont opérées avec nos partenaires logistiques locaux. En France, votre commande est confiée à un transporteur avec suivi."
        },
        {
          icon: "clock",
          title: "Délais de Livraison",
          content: "Les délais dépendent de votre pays, de votre région et du mode de livraison choisi. Une estimation vous est présentée au moment du paiement, avant la validation définitive de la commande."
        },
        {
          icon: "dollar",
          title: "Frais de Livraison",
          content: "Les frais de livraison sont calculés automatiquement au moment du paiement, en fonction de votre pays, de votre région et du mode de livraison sélectionné. Le montant exact vous est affiché avant la validation de la commande."
        },
        {
          icon: "track",
          title: "Suivi de Commande",
          content: "Dès l'expédition de votre commande, vous recevez un lien de suivi vous permettant de consulter l'état d'acheminement de votre colis."
        },
        {
          icon: "phone",
          title: "Vérification à la Réception",
          content: "À la réception, vous pouvez vérifier le produit avec le transporteur avant d'accepter et de régler le colis. Ne vous éloignez pas avec le colis avant cette vérification : c'est ce qui vous protège."
        }
      ],
      contactInfo: "Pour toute question sur votre livraison, contactez-nous :"
    },
    ar: {
      title: "معلومات التوصيل",
      intro: "كيف نشحن معداتكم، في فرنسا والجزائر.",
      sections: [
        {
          icon: "truck",
          title: "المناطق المشمولة",
          content: "نشحن إلى فرنسا القارية وإلى الجزائر. يتم تأكيد المناطق المشمولة فعليًا وشركات الشحن المتاحة لعنوانكم عند الدفع، حسب بلدكم ومنطقتكم."
        },
        {
          icon: "map",
          title: "شركاؤنا في الشحن",
          content: "في الجزائر، تتم عمليات الشحن مع شركائنا اللوجستيين المحليين. وفي فرنسا، يتم تسليم طلبكم إلى شركة شحن مع خدمة التتبع."
        },
        {
          icon: "clock",
          title: "مواعيد التسليم",
          content: "تختلف المواعيد حسب بلدكم ومنطقتكم وطريقة الشحن المختارة. يتم عرض تقدير زمني عند الدفع، قبل التأكيد النهائي للطلب."
        },
        {
          icon: "dollar",
          title: "رسوم التوصيل",
          content: "يتم احتساب رسوم التوصيل تلقائيًا عند الدفع، حسب بلدكم ومنطقتكم وطريقة الشحن المختارة. يظهر المبلغ الدقيق قبل تأكيد الطلب."
        },
        {
          icon: "track",
          title: "تتبع الطلب",
          content: "بعد شحن طلبكم، تستلمون رابط تتبع يمكّنكم من متابعة حالة الطرد."
        },
        {
          icon: "phone",
          title: "التحقق عند الاستلام",
          content: "عند الاستلام، يمكنكم التحقق من المنتج مع موظف الشحن قبل قبول الطرد والدفع. لا تبتعدوا بالطرد قبل هذا التحقق: فهو ما يحميكم."
        }
      ],
      contactInfo: "لأي استفسار حول التوصيل، تواصلوا معنا:"
    }
  }

  const data = content[language === 'ar' ? 'ar' : 'fr']

  const iconMap = {
    truck: <Truck className="h-6 w-6 text-primary" />,
    map: <MapPin className="h-6 w-6 text-primary" />,
    clock: <Clock className="h-6 w-6 text-warning" />,
    dollar: <DollarSign className="h-6 w-6 text-info" />,
    track: <Truck className="h-6 w-6 text-info" />,
    phone: <Phone className="h-6 w-6 text-destructive" />
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

          <Card className="bg-muted/50">
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
