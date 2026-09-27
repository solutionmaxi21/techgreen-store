"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useLanguage } from "@/lib/language-context"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { CONTACT_INFO } from "@/config/constants"
import { AlertCircle, CheckCircle, Clock } from "lucide-react"

export default function ReturnsRefundsPage() {
  const { language } = useLanguage()

  const content = {
    fr: {
      title: "Retours & Remboursements",
      intro: "Les conditions dans lesquelles un matériel peut nous être retourné.",
      sections: [
        {
          icon: "check",
          title: "Vérification à la Réception",
          content: "À la réception, vous pouvez vérifier le produit avec le transporteur avant d'accepter le colis : référence, état de l'emballage et intégrité du contenu. C'est le moment d'inspecter le matériel."
        },
        {
          icon: "alert",
          title: "Signalement Immédiat",
          content: "Si vous constatez une erreur (produit ou référence incorrecte) ou un défaut, signalez-le au transporteur avant de régler le colis. Ne vous éloignez pas avec le colis avant cette vérification."
        },
        {
          icon: "check",
          title: "Erreur de Notre Part",
          content: "Si l'erreur vient de nous, ou si le matériel présente un défaut constaté à la réception, nous prenons en charge le retour et son acheminement."
        },
        {
          icon: "alert",
          title: "Retour à Votre Initiative",
          content: "Si le retour résulte de votre choix, le matériel doit nous revenir dans son état d'origine, complet et non utilisé. Les frais d'acheminement du retour sont alors à votre charge. Les délais et conditions applicables vous sont confirmés par écrit par notre équipe avant tout retour."
        },
        {
          icon: "clock",
          title: "Remboursements",
          content: "Un remboursement est traité après réception et contrôle du matériel retourné. Il est effectué sur le moyen de paiement utilisé lors de la commande."
        },
        {
          icon: "alert",
          title: "Cas Non Couverts",
          content: "Les retours ne sont pas acceptés pour : les produits ouverts et utilisés (sauf défaut de fabrication), les produits endommagés ou modifiés par une mauvaise utilisation, les accessoires manquants après démontage ou utilisation, les produits présentant des signes évidents d'usage."
        }
      ],
      contactInfo: "Pour toute question sur un retour ou un remboursement, contactez-nous :"
    },
    ar: {
      title: "الإرجاع والاسترجاع",
      intro: "الشروط التي يمكن بموجبها إرجاع المعدات إلينا.",
      sections: [
        {
          icon: "check",
          title: "التحقق عند الاستلام",
          content: "عند الاستلام، يمكنكم التحقق من المنتج مع موظف الشحن قبل قبول الطرد: المرجع، وحالة التغليف، وسلامة المحتويات. هذه هي فرصتكم لفحص المعدات."
        },
        {
          icon: "alert",
          title: "الإبلاغ الفوري",
          content: "إذا لاحظتم خطأً (منتج أو مرجع غير صحيح) أو عيبًا، أبلغوا موظف الشحن قبل الدفع. لا تبتعدوا بالطرد قبل هذا التحقق."
        },
        {
          icon: "check",
          title: "إذا كان الخطأ من جانبنا",
          content: "إذا كان الخطأ من جانبنا، أو إذا كانت المعدات بها عيب مُثبت عند الاستلام، فإننا نتحمل مسؤولية الإرجاع ونقل المعدات."
        },
        {
          icon: "alert",
          title: "الإرجاع بمبادرة منكم",
          content: "إذا كان الإرجاع بمبادرة منكم، فيجب أن تعود المعدات بحالتها الأصلية، كاملة وغير مستعملة. وفي هذه الحالة تكون تكاليف نقل الإرجاع على عاتقكم. ويتم تأكيد الآجال والشروط المطبقة كتابيًا من طرف فريقنا قبل أي إرجاع."
        },
        {
          icon: "clock",
          title: "الاسترجاع",
          content: "تتم معالجة الاسترجاع بعد استلام المعدات المرجعة وفحصها. ويتم الاسترجاع عبر وسيلة الدفع المستعملة في الطلب."
        },
        {
          icon: "alert",
          title: "الحالات غير المشمولة",
          content: "لا يتم قبول الإرجاع في: المنتجات المفتوحة والمستعملة (ما لم يكن هناك عيب صناعي)، المنتجات التالفة أو المعدلة بسبب سوء الاستعمال، الملحقات المفقودة بعد الفك أو الاستعمال، المنتجات التي تظهر عليها علامات استعمال واضحة."
        }
      ],
      contactInfo: "لأي استفسار حول الإرجاع أو الاسترجاع، تواصلوا معنا:"
    }
  }

  const data = content[language === 'ar' ? 'ar' : 'fr']

  const iconMap = {
    check: <CheckCircle className="h-6 w-6 text-primary" />,
    alert: <AlertCircle className="h-6 w-6 text-primary" />,
    clock: <Clock className="h-6 w-6 text-warning" />
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
