"use client"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useLanguage } from "@/lib/language-context"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { CONTACT_INFO } from "@/config/constants"

export default function FAQPage() {
  const { language } = useLanguage()

  const localT = {
    fr: {
      title: "Questions Fréquemment Posées",
      intro: "Trouvez des réponses aux questions courantes sur nos produits, commandes, livraisons, et plus encore.",
      sections: {
        orders: "Commandes & Paiement",
        shipping: "Expédition & Livraison",
        returns: "Retours & Garantie",
        products: "Produits & Stock",
        account: "Compte & Sécurité"
      },
      questions: {
        order1: { q: "Comment passer une commande ?", a: "Parcourez notre boutique, ajoutez des articles à votre panier et passez à la caisse. Vous devrez créer un compte ou vous connecter, fournir les informations de livraison et choisir votre méthode de paiement. Nous acceptons actuellement le paiement à la livraison (COD)." },
        order2: { q: "Quels moyens de paiement acceptez-vous ?", a: "Nous acceptons actuellement le Paiement à la Livraison (COD). Les paiements en ligne par carte bancaire seront disponibles très bientôt. Le paiement à la livraison est sécurisé et traité conformément aux normes de protection des données." },
        order3: { q: "Puis-je annuler ou modifier ma commande ?", a: "Vous pouvez annuler votre commande si elle n'a pas encore été traitée. Pour modifier votre commande (items, quantité, adresse), il n'existe pas de système de modification en ligne - vous devez annuler votre commande actuelle et en créer une nouvelle avec les bonnes informations. Une fois la commande expédiée, l'annulation n'est plus possible, mais vous pouvez la retourner conformément à notre politique de retour." },
        order4: { q: "Comment suivre ma commande ?", a: "Après avoir passé votre commande, vous pouvez la suivre depuis la section \"Mes Commandes\" de votre compte. Vous verrez des mises à jour en temps réel sur le statut de votre commande : en attente, en traitement, expédiée et livrée." },
        ship1: { q: "Comment sont calculés les frais de livraison ?", a: "Les frais de livraison sont calculés au moment du paiement, selon votre pays, votre région et le mode de livraison choisi. Le montant exact vous est affiché avant la validation de la commande." },
        ship2: { q: "Combien de temps prend la livraison ?", a: "Les délais dépendent de votre pays, de votre région et du mode de livraison choisi. Une estimation vous est présentée au moment du paiement. Vous recevez les informations de suivi dès l'expédition de votre commande." },
        ship3: { q: "Où livrez-vous ?", a: "Nous expédions en France métropolitaine et en Algérie. Les zones réellement desservies, ainsi que les transporteurs disponibles pour votre adresse, sont confirmés au moment du paiement." },
        return1: { q: "Quelle est votre politique de retour ?", a: "À la réception, vérifiez le produit avec le transporteur avant d'accepter le colis. Si vous constatez une erreur (produit ou référence incorrecte) ou un défaut, signalez-le immédiatement. Si l'erreur vient de nous, nous prenons en charge le retour et son acheminement. Si le retour résulte de votre choix, les frais d'acheminement sont à votre charge. Les délais et conditions applicables vous sont confirmés par écrit par notre équipe avant tout retour." },
        return2: { q: "Comment fonctionnent les garanties ?", a: "Chaque appareil est contrôlé et reconditionné avant sa mise en vente. La durée de garantie dépend du type de matériel et de son état de reconditionnement : elle est indiquée sur la fiche du produit et rappelée sur votre facture. Conservez votre facture, elle est indispensable pour toute demande de prise en charge." },
        return3: { q: "Que faire si mon produit arrive endommagé ?", a: "Si vous constatez un dommage ou un défaut à la réception, signalez-le au transporteur avant de régler le colis, puis contactez-nous avec votre numéro de commande. Nous prenons en charge le remplacement du matériel concerné." },
        prod1: { q: "Tous les produits sont-ils authentiques ?", a: "Nous travaillons exclusivement avec des distributeurs et fabricants autorisés pour sourcer nos produits. Tous les articles vendus sur notre plateforme sont conformes aux normes de qualité. En cas de doute sur l'authenticité d'un produit reçu, contactez-nous immédiatement avec photos et numéro de commande." },
        prod2: { q: "Quand les articles en rupture de stock seront-ils disponibles ?", a: `Les délais de réapprovisionnement varient selon le produit et le fournisseur. Pour connaître la disponibilité estimée, consultez la page produit ou envoyez-nous un email à ${CONTACT_INFO.email.primary} avec le nom du produit pour obtenir une date de réapprovisionnement approximative.` },
        prod3: { q: "Offrez-vous un support technique ?", a: `Oui ! Nous sommes disponibles pour vous aider à choisir les bons produits. Pour toute question ou demande de support, envoyez-nous un email à ${CONTACT_INFO.email.primary} avec votre demande détaillée et votre numéro de commande si applicable. Nous nous efforçons de répondre à tous les emails.` },
        acc1: { q: "Ai-je besoin d'un compte pour passer commande ?", a: "Oui, un compte est requis pour passer des commandes. Créer un compte vous permet de suivre vos commandes, enregistrer vos adresses, consulter votre historique de commandes et gérer votre liste de souhaits." },
        acc2: { q: "Mes informations personnelles sont-elles sécurisées ?", a: "Absolument. Nous utilisons un cryptage conforme aux normes de l'industrie pour protéger vos informations personnelles et de paiement. Nous ne partageons jamais vos données avec des tiers sans votre consentement. Lisez notre Politique de Confidentialité pour plus de détails." },
        acc3: { q: "Comment réinitialiser mon mot de passe ?", a: "Cliquez sur \"Mot de passe oublié\" sur la page de connexion, entrez votre adresse email, et nous vous enverrons les instructions pour réinitialiser votre mot de passe. Si vous ne recevez pas l'email, vérifiez votre dossier spam ou contactez le support." },
        stillHaveQuestions: "Vous avez encore des questions ?",
        contactSupport: "Contactez notre équipe de support",
        happyToHelp: "et nous serons ravis de vous aider !"
      }
    },
    ar: {
      title: "الأسئلة الشائعة",
      intro: "اعثر على إجابات للأسئلة الشائعة حول منتجاتنا، طلباتنا، التوصيل، والمزيد.",
      sections: {
        orders: "الطلبات والدفع",
        shipping: "الشحن والتوصيل",
        returns: "الإرجاع والضمان",
        products: "المنتجات والمخزون",
        account: "الحساب والأمان"
      },
      questions: {
        order1: { q: "كيف يمكنني تقديم طلب؟", a: "تصفح متجرنا، أضف المنتجات إلى سلة التسوق، واتجه للدفع. ستحتاج إلى إنشاء حساب أو تسجيل الدخول، تقديم معلومات التوصيل، واختيار طريقة الدفع. نقبل حاليا الدفع عند الاستلام (COD)." },
        order2: { q: "ما هي طرق الدفع المقبولة؟", a: "نقبل حاليا الدفع عند الاستلام (COD). سيكون الدفع الإلكتروني عبر البطاقة البنكية متاحا قريبا جدا. الدفع عند الاستلام آمن ويتم معالجته وفقا لمعايير حماية البيانات." },
        order3: { q: "هل يمكنني إلغاء أو تعديل طلبي؟", a: "يمكنك إلغاء طلبك إذا لم تتم معالجته بعد. للتعديل على طلبك (المنتجات أو الكمية أو العنوان)، لا يوجد نظام تعديل مباشر - يجب عليك إلغاء الطلب الحالي وإنشاء طلب جديد بالبيانات الصحيحة. بمجرد شحن الطلب، لا يمكن إلغاؤه، لكن يمكنك إرجاعه وفقا لسياسة الإرجاع الخاصة بنا." },
        order4: { q: "كيف يمكنني تتبع طلبي؟", a: "بعد تقديم طلبك، يمكنك تتبعه من قسم \"طلباتي\" في حسابك. سترى تحديثات في الوقت الفعلي لحالة طلبك: قيد الانتظار، قيد المعالجة، تم الشحن، وتم التوصيل." },
        ship1: { q: "كيف يتم احتساب رسوم التوصيل؟", a: "يتم احتساب رسوم التوصيل عند الدفع، حسب بلدكم ومنطقتكم وطريقة الشحن المختارة. يظهر المبلغ الدقيق قبل تأكيد الطلب." },
        ship2: { q: "كم يستغرق التوصيل؟", a: "تختلف المدد حسب بلدكم ومنطقتكم وطريقة الشحن المختارة. يتم عرض تقدير زمني عند الدفع. وتستلمون معلومات التتبع بمجرد شحن طلبكم." },
        ship3: { q: "إلى أين تشحنون؟", a: "نشحن إلى فرنسا القارية وإلى الجزائر. يتم تأكيد المناطق المشمولة فعليًا وشركات الشحن المتاحة لعنوانكم عند الدفع." },
        return1: { q: "ما هي سياسة الإرجاع الخاصة بكم؟", a: "عند الاستلام، افحصوا المنتج مع موظف الشحن قبل قبول الطرد. إذا لاحظتم خطأً (منتج أو مرجع غير صحيح) أو عيبًا، أبلغوا عنه فورًا. وإذا كان الخطأ من جانبنا، نتحمل نحن تكاليف الإرجاع ونقله. أما إذا كان الإرجاع بمبادرة منكم، فتكون تكاليف النقل على عاتقكم. ويتم تأكيد الآجال والشروط المطبقة كتابيًا من طرف فريقنا قبل أي إرجاع." },
        return2: { q: "كيف يعمل الضمان؟", a: "كل جهاز يتم فحصه وتجديده قبل عرضه للبيع. وتختلف مدة الضمان حسب نوع المعدات وحالة تجديدها: وهي مذكورة في بطاقة المنتج ومُبيَّنة في فاتورتكم. احتفظوا بفاتورتكم، فهي ضرورية لأي طلب تكفّل." },
        return3: { q: "ماذا لو وصل منتجي تالفاً؟", a: "إذا لاحظتم ضررًا أو عيبًا عند الاستلام، أبلغوا موظف الشحن قبل الدفع، ثم تواصلوا معنا برقم طلبكم. نتكفل باستبدال المعدات المعنية." },
        prod1: { q: "هل جميع المنتجات أصلية؟", a: "نعمل بشكل حصري مع الموزعين والمصنعين المرخصين. جميع المنتجات المباعة على منصتنا تتوافق مع معايير الجودة. في حالة الشك في أصالة منتج استقبلته، اتصل بنا فورا مع صور ورقم طلبك." },
        prod2: { q: "متى ستتوفر المنتجات غير المتوفرة؟", a: `أوقات إعادة التخزين تختلف حسب المنتج والموردين. للحصول على معلومات عن توفر المنتج، راجع صفحة المنتج أو أرسل لنا بريدًا على ${CONTACT_INFO.email.primary} مع اسم المنتج للحصول على تاريخ إعادة تخزين تقريبي.` },
        prod3: { q: "هل توفرون دعما فنيا؟", a: `نعم! نحن متاحون لمساعدتك في اختيار المنتجات المناسبة. لأي سؤال أو طلب دعم، أرسل لنا بريدًا على ${CONTACT_INFO.email.primary} مع تفاصيل طلبك ورقم طلبك إن أمكن. نحرص على الرد على جميع رسائل البريد الإلكتروني.` },
        acc1: { q: "هل أحتاج إلى حساب لتقديم طلب؟", a: "نعم، يلزم وجود حساب لتقديم الطلبات. يتيح لك إنشاء حساب تتبع طلباتك، حفظ عناوينك، عرض سجل طلباتك، وإدارة قائمة رغباتك." },
        acc2: { q: "هل معلوماتي الشخصية آمنة؟", a: "بالتأكيد. نستخدم تشفيراً متفقاً عليه صناعياً لحماية معلوماتك الشخصية ومعلومات الدفع. لا نشارك بياناتك أبداً مع أطراف ثالثة دون موافقتك. اقرأ سياسة الخصوصية الخاصة بنا لمزيد من التفاصيل." },
        acc3: { q: "كيف يمكنني إعادة تعيين كلمة المرور؟", a: "انقر على \"نسيت كلمة المرور\" في صفحة تسجيل الدخول، أدخل بريدك الإلكتروني، وسنرسل لك تعليمات لإعادة تعيين كلمة المرور. إذا لم تتلقَ البريد الإلكتروني، تحقق من مجلد الرسائل غير المرغوب فيها أو اتصل بالدعم." },
        stillHaveQuestions: "لا تزال لديك أسئلة؟",
        contactSupport: "تواصل مع فريق الدعم",
        happyToHelp: "وسنكون سعداء بمساعدتك!"
      }
    }
  }

  const txt = localT[language === 'ar' ? 'ar' : 'fr']

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl font-bold mb-6">{txt.title}</h1>
            <p className="text-lg text-muted-foreground mb-12">
              {txt.intro}
            </p>

            <div className="space-y-8">
              {/* Orders & Payment */}
              <Card>
                <CardHeader>
                  <CardTitle>{txt.sections.orders}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="item-1">
                      <AccordionTrigger className="text-left rtl:text-right">{txt.questions.order1.q}</AccordionTrigger>
                      <AccordionContent className="text-left rtl:text-right">
                        {txt.questions.order1.a}
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-2">
                      <AccordionTrigger className="text-left rtl:text-right">{txt.questions.order2.q}</AccordionTrigger>
                      <AccordionContent className="text-left rtl:text-right">
                        {txt.questions.order2.a}
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-3">
                      <AccordionTrigger className="text-left rtl:text-right">{txt.questions.order3.q}</AccordionTrigger>
                      <AccordionContent className="text-left rtl:text-right">
                        {txt.questions.order3.a}
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-4">
                      <AccordionTrigger className="text-left rtl:text-right">{txt.questions.order4.q}</AccordionTrigger>
                      <AccordionContent className="text-left rtl:text-right">
                        {txt.questions.order4.a}
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>

              {/* Shipping & Delivery */}
              <Card>
                <CardHeader>
                  <CardTitle>{txt.sections.shipping}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="ship-1">
                      <AccordionTrigger className="text-left rtl:text-right">{txt.questions.ship1.q}</AccordionTrigger>
                      <AccordionContent className="text-left rtl:text-right">
                        {txt.questions.ship1.a}
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="ship-2">
                      <AccordionTrigger className="text-left rtl:text-right">{txt.questions.ship2.q}</AccordionTrigger>
                      <AccordionContent className="text-left rtl:text-right">
                        {txt.questions.ship2.a}
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="ship-3">
                      <AccordionTrigger className="text-left rtl:text-right">{txt.questions.ship3.q}</AccordionTrigger>
                      <AccordionContent className="text-left rtl:text-right">
                        {txt.questions.ship3.a}
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>

              {/* Returns & Warranty */}
              <Card>
                <CardHeader>
                  <CardTitle>{txt.sections.returns}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="return-1">
                      <AccordionTrigger className="text-left rtl:text-right">{txt.questions.return1.q}</AccordionTrigger>
                      <AccordionContent className="text-left rtl:text-right">
                        {txt.questions.return1.a}
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="return-2">
                      <AccordionTrigger className="text-left rtl:text-right">{txt.questions.return2.q}</AccordionTrigger>
                      <AccordionContent className="text-left rtl:text-right">
                        {txt.questions.return2.a}
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="return-3">
                      <AccordionTrigger className="text-left rtl:text-right">{txt.questions.return3.q}</AccordionTrigger>
                      <AccordionContent className="text-left rtl:text-right">
                        {txt.questions.return3.a}
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>

              {/* Products & Stock */}
              <Card>
                <CardHeader>
                  <CardTitle>{txt.sections.products}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="prod-1">
                      <AccordionTrigger className="text-left rtl:text-right">{txt.questions.prod1.q}</AccordionTrigger>
                      <AccordionContent className="text-left rtl:text-right">
                        {txt.questions.prod1.a}
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="prod-2">
                      <AccordionTrigger className="text-left rtl:text-right">{txt.questions.prod2.q}</AccordionTrigger>
                      <AccordionContent className="text-left rtl:text-right">
                        {txt.questions.prod2.a}
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="prod-3">
                      <AccordionTrigger className="text-left rtl:text-right">{txt.questions.prod3.q}</AccordionTrigger>
                      <AccordionContent className="text-left rtl:text-right">
                        {txt.questions.prod3.a}
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>

              {/* Account */}
              <Card>
                <CardHeader>
                  <CardTitle>{txt.sections.account}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="acc-1">
                      <AccordionTrigger className="text-left rtl:text-right">{txt.questions.acc1.q}</AccordionTrigger>
                      <AccordionContent className="text-left rtl:text-right">
                        {txt.questions.acc1.a}
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="acc-2">
                      <AccordionTrigger className="text-left rtl:text-right">{txt.questions.acc2.q}</AccordionTrigger>
                      <AccordionContent className="text-left rtl:text-right">
                        {txt.questions.acc2.a}
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="acc-3">
                      <AccordionTrigger className="text-left rtl:text-right">{txt.questions.acc3.q}</AccordionTrigger>
                      <AccordionContent className="text-left rtl:text-right">
                        {txt.questions.acc3.a}
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>
            </div>

            <Card className="mt-8 bg-muted/50">
              <CardContent className="py-6">
                <p className="text-center text-muted-foreground">
                  {txt.questions.stillHaveQuestions}{" "}
                  <Link href="/contact" className="text-primary hover:underline font-medium">
                    {txt.questions.contactSupport}
                  </Link>
                  {" "}{txt.questions.happyToHelp}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
