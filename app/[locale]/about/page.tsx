"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail, MapPin, Phone, Clock, Recycle, Laptop, Smartphone, Wrench, ShoppingBag } from "lucide-react"
import { CONTACT_INFO, COMPANY_INFO, BUSINESS_HOURS } from "@/config/constants"
import { useLanguage } from "@/lib/language-context"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"

export default function AboutPage() {
  const { language } = useLanguage()
  const isAr = language === 'ar'

  const localT = {
    fr: {
      title: `À Propos de ${COMPANY_INFO.name}`,
      intro: `${COMPANY_INFO.name} donne une seconde vie au matériel informatique et aux téléphones mobiles des entreprises. Basés à ${COMPANY_INFO.city}, nous intervenons depuis ${COMPANY_INFO.experienceYears} ans sur le rachat, la réparation et le reconditionnement de votre parc IT, avec une exigence simple : une seconde vie éco-responsable pour votre parc IT.`,
      mission: {
        title: "Notre Mission",
        desc: "Prolonger la durée de vie du matériel informatique et des téléphones mobiles plutôt que de les remplacer. Nous rachetons, réparons et reconditionnons votre parc IT pour réduire son impact environnemental tout en maîtrisant votre budget."
      },
      vision: {
        title: "Notre Vision",
        desc: "Faire du reconditionnement le premier réflexe des entreprises de la région lyonnaise : un matériel fiable, garanti et traçable, qui coûte moins cher et pèse moins sur les ressources."
      },
      services: {
        title: "Nos Prestations",
        items: [
          { title: "Rachat de matériel informatique", desc: "Nous rachetons vos ordinateurs, écrans, serveurs et équipements réseau, quelle que soit leur ancienneté." },
          { title: "Rachat de téléphones mobiles", desc: "Reprise de vos parcs de smartphones et de tablettes, avec valorisation de chaque appareil." },
          { title: "Réparation informatique & téléphonie", desc: "Diagnostic et réparation de vos appareils informatiques et de vos téléphones mobiles." },
          { title: "Vente d'accessoires", desc: "Accessoires informatiques et de téléphonie mobiles pour compléter et maintenir votre équipement." }
        ]
      },
      whyChooseUs: {
        title: "Pourquoi Nous Choisir ?",
        items: [
          { title: "10 ans d'expérience :", desc: "une expertise reconnue du rachat et de la réparation de matériel professionnel" },
          { title: "Démarche éco-responsable :", desc: "chaque appareil reconditionné est un appareil qui ne devient pas un déchet" },
          { title: "Interlocuteur unique :", desc: "rachat, réparation et accessoires auprès d'un seul prestataire" },
          { title: "Ancrage local :", desc: `une équipe basée à ${CONTACT_INFO.address.city}, au service des entreprises de la région lyonnaise` },
          { title: "Matériel garanti :", desc: "des équipements testés, reconditionnés et suivis après la vente" }
        ]
      },
      contact: {
        title: "Informations de Contact",
        address: "Adresse",
        phone: "Téléphone",
        email: "Email",
        hours: "Horaires"
      }
    },
    ar: {
      title: `من نحن — ${COMPANY_INFO.name}`,
      intro: `تمنح ${COMPANY_INFO.name} حياة ثانية لمعدات الحواسيب والهواتف المحمولة الخاصة بالشركات. مقرنا في ${CONTACT_INFO.address.city}، ونعمل منذ ${COMPANY_INFO.experienceYears} سنوات في شراء وإصلاح وتجديد أسطول تقنية المعلومات الخاص بكم، بمبدأ واحد: حياة ثانية صديقة للبيئة لمعداتكم.`,
      mission: {
        title: "مهمتنا",
        desc: "إطالة عمر معدات الحواسيب والهواتف المحمولة بدل استبدالها. نشتري ونصلح ونجدّد معداتكم لتقليل أثرها البيئي مع التحكم في ميزانيتكم."
      },
      vision: {
        title: "رؤيتنا",
        desc: "أن يصبح التجديد الخيار الأول للشركات في منطقة ليون: معدات موثوقة ومضمونة وقابلة للتتبع، بتكلفة أقل وأثر أقل على الموارد."
      },
      services: {
        title: "خدماتنا",
        items: [
          { title: "شراء معدات الحواسيب", desc: "نشتري حواسيبكم وشاشاتكم وخوادمكم ومعدات الشبكات، مهما كان عمرها." },
          { title: "شراء الهواتف المحمولة", desc: "استرجاع أسطول الهواتف الذكية والأجهزة اللوحية مع تقييم كل جهاز." },
          { title: "إصلاح الحواسيب والهواتف", desc: "تشخيص وإصلاح أجهزة الحواسيب والهواتف المحمولة." },
          { title: "بيع الملحقات", desc: "ملحقات الحواسيب والهواتف المحمولة لاستكمال معداتكم وصيانتها." }
        ]
      },
      whyChooseUs: {
        title: "لماذا تختارنا؟",
        items: [
          { title: "خبرة 10 سنوات:", desc: "خبرة معترف بها في شراء وإصلاح المعدات المهنية" },
          { title: "نهج صديق للبيئة:", desc: "كل جهاز مُجدَّد هو جهاز لا يتحول إلى نفايات" },
          { title: "جهة اتصال واحدة:", desc: "الشراء والإصلاح والملحقات من مزوّد واحد" },
          { title: "حضور محلي:", desc: `فريق مقره ${CONTACT_INFO.address.city} في خدمة شركات منطقة ليون` },
          { title: "معدات مضمونة:", desc: "أجهزة مُختبرة ومُجدَّدة ومتابعة بعد البيع" }
        ]
      },
      contact: {
        title: "معلومات الاتصال",
        address: "العنوان",
        phone: "الهاتف",
        email: "البريد الإلكتروني",
        hours: "أوقات العمل"
      }
    }
  }

  const txt = localT[isAr ? 'ar' : 'fr']

  const SERVICE_ICONS = [Laptop, Smartphone, Wrench, ShoppingBag]

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-12">
          <h1 className="text-4xl font-bold mb-6">{txt.title}</h1>

          <p className="text-lg text-muted-foreground mb-12 max-w-4xl">
            {txt.intro}
          </p>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <Card>
              <CardHeader>
                <CardTitle>{txt.mission.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {txt.mission.desc}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{txt.vision.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {txt.vision.desc}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="mb-12">
            <h2 className="text-3xl font-bold mb-6">{txt.services.title}</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {txt.services.items.map((item, index) => {
                const Icon = SERVICE_ICONS[index] ?? Recycle
                return (
                  <Card key={index}>
                    <CardHeader className="flex flex-row items-center gap-4">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <CardTitle className="text-lg">{item.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>

          <Card className="mb-12">
            <CardHeader>
              <CardTitle>{txt.whyChooseUs.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="grid md:grid-cols-2 gap-3">
                {txt.whyChooseUs.items.map((item, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-primary font-bold">✓</span>
                    <span><strong>{item.title}</strong> {item.desc}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{txt.contact.title}</CardTitle>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-6">
              <div className="flex items-start gap-3">
                <MapPin className={`h-5 w-5 text-primary mt-0.5 ${isAr ? 'ml-2' : 'mr-2'}`} />
                <div>
                  <p className="font-medium">{txt.contact.address}</p>
                  <p className="text-muted-foreground">{CONTACT_INFO.address.full}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className={`h-5 w-5 text-primary mt-0.5 ${isAr ? 'ml-2' : 'mr-2'}`} />
                <div>
                  <p className="font-medium">{txt.contact.phone}</p>
                  <p className="text-muted-foreground">
                    <a href={`tel:${CONTACT_INFO.phone.primary}`} dir="ltr" style={{ direction: 'ltr', unicodeBidi: 'isolate' }} className="hover:text-primary">{CONTACT_INFO.phone.display.primary}</a>
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail className={`h-5 w-5 text-primary mt-0.5 ${isAr ? 'ml-2' : 'mr-2'}`} />
                <div>
                  <p className="font-medium">{txt.contact.email}</p>
                  <p className="text-muted-foreground">
                    <a href={`mailto:${CONTACT_INFO.email.primary}`} className="hover:text-primary">{CONTACT_INFO.email.primary}</a>
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className={`h-5 w-5 text-primary mt-0.5 ${isAr ? 'ml-2' : 'mr-2'}`} />
                <div>
                  <p className="font-medium">{txt.contact.hours}</p>
                  <p className="text-muted-foreground">{BUSINESS_HOURS.weekdays}</p>
                  <p className="text-muted-foreground text-sm">{BUSINESS_HOURS.note}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  )
}
