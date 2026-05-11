'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

export type Language = 'en' | 'ar' | 'fr' | 'es' | 'de' | 'it'

export const LANGUAGES: { code: Language; label: string; flag: string; rtl?: boolean }[] = [
  { code: 'en', label: 'English',  flag: '🇬🇧' },
  { code: 'ar', label: 'العربية',  flag: '🇸🇦', rtl: true },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'es', label: 'Español',  flag: '🇪🇸' },
  { code: 'de', label: 'Deutsch',  flag: '🇩🇪' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹' },
]

// ─── Dictionaries ─────────────────────────────────────────────────────────────

const dictionaries: Record<Language, Record<string, string>> = {
  en: {
    // Main page — header
    appName: 'Tunisia Hotels',
    tagline: 'Your Personal AI Assistant',
    adminBtn: 'Admin',
    localTime: 'Local Time',

    // Main page — hero
    heroTitle: 'Welcome to',
    heroSubtitle: 'Discover the perfect hotel experience with your personal AI assistant. Get personalized recommendations, real-time info, and local activities.',
    featureBeach: 'Beach Access',
    featureWeather: 'Perfect Weather',
    featureAI: '24/7 AI Assistant',

    // Main page — hotel section
    sectionTitle: 'Choose Your Perfect Hotel',
    sectionSubtitle: 'Each hotel comes with a dedicated AI concierge to enhance your stay',
    cardFeatures: 'Features',
    cardSpecialties: 'Specialties',
    cardCTA: 'Start Your Experience',

    // Main page — loading overlay
    loadingTitle: 'Preparing Your Experience',
    loadingSubtitle: 'Setting up AI concierge for',

    // Main page — footer
    footerText: '© 2025 Tunisia Hotel Assistant · Your perfect tourist experience',

    // Hotel page — header
    hotelAssistant: 'Hotel assistant',
    backBtn: 'Back',

    // Hotel page — sidebar
    liveContext: 'Live context',
    hotelDetails: 'Hotel details',
    weatherLabel: 'Weather',
    tempLabel: 'Temperature',
    humidityLabel: 'Humidity',
    windLabel: 'Wind',
    loadingWeather: 'Loading weather...',
    unavailable: 'Unavailable',
    notAvailable: 'Not available',
    available: 'Available',
    checkIn: 'Check-in',
    checkOut: 'Check-out',
    frontDesk: 'Front desk',
    wifi: 'WiFi',
    feelsLike: 'feels like',

    // Hotel card features & specialties
    feat_beachAccess: 'Beach Access',
    feat_spaWellness: 'Spa & Wellness',
    feat_multipleRestaurants: 'Multiple Restaurants',
    feat_kidsClub: 'Kids Club',
    feat_privateBeach: 'Private Beach',
    feat_waterSports: 'Water Sports',
    feat_familyActivities: 'Family Activities',
    feat_allInclusive: 'All-Inclusive',
    feat_historicLocation: 'Historic Location',
    feat_luxurySpa: 'Luxury Spa',
    feat_fineDining: 'Fine Dining',
    feat_culturalTours: 'Cultural Tours',
    spec_traditionalArch: 'Traditional Architecture',
    spec_beachfrontLocation: 'Beachfront Location',
    spec_culturalActivities: 'Cultural Activities',
    spec_familyEntertainment: 'Family Entertainment',
    spec_waterActivities: 'Water Activities',
    spec_kidsPrograms: 'Kids Programs',
    spec_historicMedina: 'Historic Medina Tours',
    spec_localExperiences: 'Local Experiences',
    spec_premiumService: 'Premium Service',

    // Hotel page — chat
    welcomeMessage: 'Welcome to {name}. I can help with hotel facilities, schedules, nearby attractions, weather updates, and hotel amenities. For bookings or actions, please contact the front desk directly. How can I help you today?',
    guestAssistant: 'Guest assistant',
    guestAssistantSub: 'Ask about schedules, amenities, activities, attractions, or general hotel information.',
    chatPlaceholder: 'Ask about breakfast hours, nearby attractions, WiFi, events, or hotel services...',
    assistantTyping: 'Assistant is preparing a response...',

    // Hotel page — events
    upcomingEvents: 'Upcoming Events',
    reserveSpot: 'Reserve a spot',
    dateTBA: 'Date TBA',

    // Hotel page — not found
    hotelNotFound: 'Hotel not found',
    returnHome: 'Return home',

    // Registration form
    formTitle: 'Welcome to',
    formSubtitle: 'Help us personalize your experience by sharing a few details',
    ageRange: 'Age Range',
    age1825: '18-25 years',
    age2635: '26-35 years',
    age3650: '36-50 years',
    age50plus: '50+ years',
    nationality: 'Nationality',
    nationalityPlaceholder: 'e.g., French, German, American',
    travelPurpose: 'Travel Purpose',
    purposeLeisure: 'Leisure / Vacation',
    purposeBusiness: 'Business Trip',
    purposeFamily: 'Family Vacation',
    purposeHoneymoon: 'Honeymoon / Romance',
    travelingWith: 'Traveling With',
    groupSolo: 'Solo Traveler',
    groupCouple: 'Couple',
    groupFamily: 'Family',
    groupGroup: 'Group / Friends',
    saving: 'Saving...',
    continueBtn: 'Continue to Chat Assistant',
    formFooter: 'Your information helps us provide better recommendations and improve our services',
  },

  fr: {
    appName: 'Tunisia Hotels',
    tagline: 'Votre Assistant IA Personnel',
    adminBtn: 'Admin',
    localTime: 'Heure Locale',

    heroTitle: 'Bienvenue en',
    heroSubtitle: "Découvrez l'expérience hôtelière parfaite avec votre assistant IA personnel. Obtenez des recommandations personnalisées, des infos en temps réel et des activités locales.",
    featureBeach: 'Accès à la Plage',
    featureWeather: 'Météo Idéale',
    featureAI: 'Assistant IA 24h/24',

    sectionTitle: 'Choisissez Votre Hôtel Idéal',
    sectionSubtitle: 'Chaque hôtel dispose d\'un concierge IA dédié pour sublimer votre séjour',
    cardFeatures: 'Caractéristiques',
    cardSpecialties: 'Spécialités',
    cardCTA: 'Démarrer Votre Expérience',

    loadingTitle: 'Préparation de Votre Expérience',
    loadingSubtitle: 'Configuration du concierge IA pour',

    footerText: '© 2025 Tunisia Hotel Assistant · Votre expérience touristique parfaite',

    hotelAssistant: 'Assistant hôtel',
    backBtn: 'Retour',

    liveContext: 'Contexte en direct',
    hotelDetails: 'Détails de l\'hôtel',
    weatherLabel: 'Météo',
    tempLabel: 'Température',
    humidityLabel: 'Humidité',
    windLabel: 'Vent',
    loadingWeather: 'Chargement météo...',
    unavailable: 'Indisponible',
    notAvailable: 'Non disponible',
    available: 'Disponible',
    checkIn: 'Arrivée',
    checkOut: 'Départ',
    frontDesk: 'Réception',
    wifi: 'WiFi',
    feelsLike: 'ressenti',

    // Hotel card features & specialties
    feat_beachAccess: 'Accès à la Plage',
    feat_spaWellness: 'Spa & Bien-être',
    feat_multipleRestaurants: 'Plusieurs Restaurants',
    feat_kidsClub: 'Club Enfants',
    feat_privateBeach: 'Plage Privée',
    feat_waterSports: 'Sports Nautiques',
    feat_familyActivities: 'Activités Familiales',
    feat_allInclusive: 'Tout Inclus',
    feat_historicLocation: 'Site Historique',
    feat_luxurySpa: 'Spa de Luxe',
    feat_fineDining: 'Gastronomie',
    feat_culturalTours: 'Visites Culturelles',
    spec_traditionalArch: 'Architecture Traditionnelle',
    spec_beachfrontLocation: 'Emplacement en Bord de Mer',
    spec_culturalActivities: 'Activités Culturelles',
    spec_familyEntertainment: 'Divertissement Familial',
    spec_waterActivities: 'Activités Aquatiques',
    spec_kidsPrograms: 'Programmes Enfants',
    spec_historicMedina: 'Visites de la Médina',
    spec_localExperiences: 'Expériences Locales',
    spec_premiumService: 'Service Premium',

    welcomeMessage: 'Bienvenue à {name}. Je peux vous aider avec les équipements, les horaires, les attractions à proximité, la météo et les services de l\'hôtel. Pour les réservations, veuillez contacter la réception directement. Comment puis-je vous aider ?',
    guestAssistant: 'Assistant client',
    guestAssistantSub: 'Posez vos questions sur les horaires, équipements, activités, attractions ou informations générales.',
    chatPlaceholder: 'Demandez les horaires du petit-déjeuner, les attractions proches, le WiFi, les événements...',
    assistantTyping: 'L\'assistant prépare une réponse...',

    upcomingEvents: 'Événements à Venir',
    reserveSpot: 'Réserver une place',
    dateTBA: 'Date à confirmer',

    hotelNotFound: 'Hôtel introuvable',
    returnHome: 'Retour à l\'accueil',

    formTitle: 'Bienvenue à',
    formSubtitle: 'Aidez-nous à personnaliser votre séjour en partageant quelques informations',
    ageRange: 'Tranche d\'âge',
    age1825: '18-25 ans',
    age2635: '26-35 ans',
    age3650: '36-50 ans',
    age50plus: '50+ ans',
    nationality: 'Nationalité',
    nationalityPlaceholder: 'ex : Français, Allemand, Américain',
    travelPurpose: 'Motif du voyage',
    purposeLeisure: 'Loisirs / Vacances',
    purposeBusiness: 'Voyage d\'affaires',
    purposeFamily: 'Vacances en famille',
    purposeHoneymoon: 'Lune de miel / Romance',
    travelingWith: 'Je voyage avec',
    groupSolo: 'Seul(e)',
    groupCouple: 'En couple',
    groupFamily: 'En famille',
    groupGroup: 'En groupe / Amis',
    saving: 'Enregistrement...',
    continueBtn: 'Accéder à l\'Assistant',
    formFooter: 'Vos informations nous permettent de vous fournir de meilleures recommandations',
  },

  ar: {
    appName: 'فنادق تونس',
    tagline: 'مساعدك الشخصي بالذكاء الاصطناعي',
    adminBtn: 'الإدارة',
    localTime: 'التوقيت المحلي',

    heroTitle: 'مرحباً بك في',
    heroSubtitle: 'اكتشف تجربة الفندق المثالية مع مساعدك الشخصي. احصل على توصيات مخصصة ومعلومات فورية وأنشطة محلية.',
    featureBeach: 'الوصول إلى الشاطئ',
    featureWeather: 'طقس مثالي',
    featureAI: 'مساعد ذكاء اصطناعي ٢٤/٧',

    sectionTitle: 'اختر فندقك المثالي',
    sectionSubtitle: 'كل فندق يأتي مع كونسيرج ذكاء اصطناعي مخصص لتعزيز إقامتك',
    cardFeatures: 'المميزات',
    cardSpecialties: 'التخصصات',
    cardCTA: 'ابدأ تجربتك',

    loadingTitle: 'جارٍ تجهيز تجربتك',
    loadingSubtitle: 'إعداد الكونسيرج الذكي لـ',

    footerText: '© 2025 مساعد فنادق تونس · تجربتك السياحية المثالية',

    hotelAssistant: 'مساعد الفندق',
    backBtn: 'رجوع',

    liveContext: 'السياق المباشر',
    hotelDetails: 'تفاصيل الفندق',
    weatherLabel: 'الطقس',
    tempLabel: 'درجة الحرارة',
    humidityLabel: 'الرطوبة',
    windLabel: 'الرياح',
    loadingWeather: 'تحميل بيانات الطقس...',
    unavailable: 'غير متوفر',
    notAvailable: 'غير متاح',
    available: 'متاح',
    checkIn: 'تسجيل الدخول',
    checkOut: 'تسجيل الخروج',
    frontDesk: 'مكتب الاستقبال',
    wifi: 'واي فاي',
    feelsLike: 'يشعر كأنه',

    // Hotel card features & specialties
    feat_beachAccess: 'الوصول إلى الشاطئ',
    feat_spaWellness: 'سبا وعافية',
    feat_multipleRestaurants: 'مطاعم متعددة',
    feat_kidsClub: 'نادي الأطفال',
    feat_privateBeach: 'شاطئ خاص',
    feat_waterSports: 'رياضات مائية',
    feat_familyActivities: 'أنشطة عائلية',
    feat_allInclusive: 'شامل الكل',
    feat_historicLocation: 'موقع تاريخي',
    feat_luxurySpa: 'سبا فاخر',
    feat_fineDining: 'مطبخ راقي',
    feat_culturalTours: 'جولات ثقافية',
    spec_traditionalArch: 'عمارة تقليدية',
    spec_beachfrontLocation: 'موقع على الشاطئ',
    spec_culturalActivities: 'أنشطة ثقافية',
    spec_familyEntertainment: 'ترفيه عائلي',
    spec_waterActivities: 'أنشطة مائية',
    spec_kidsPrograms: 'برامج الأطفال',
    spec_historicMedina: 'جولات المدينة العتيقة',
    spec_localExperiences: 'تجارب محلية',
    spec_premiumService: 'خدمة مميزة',

    welcomeMessage: 'مرحباً بك في {name}. يمكنني مساعدتك في مرافق الفندق والمواعيد والأماكن السياحية القريبة وحالة الطقس والخدمات الفندقية. للحجوزات يُرجى التواصل مع الاستقبال مباشرةً. كيف يمكنني مساعدتك؟',
    guestAssistant: 'مساعد الضيوف',
    guestAssistantSub: 'اسأل عن المواعيد والمرافق والأنشطة والمعالم السياحية أو معلومات الفندق العامة.',
    chatPlaceholder: 'اسأل عن مواعيد الإفطار، والمعالم القريبة، والواي فاي، والفعاليات...',
    assistantTyping: 'المساعد يُعدّ الرد...',

    upcomingEvents: 'الفعاليات القادمة',
    reserveSpot: 'احجز مكاناً',
    dateTBA: 'التاريخ سيُحدد لاحقاً',

    hotelNotFound: 'الفندق غير موجود',
    returnHome: 'العودة للرئيسية',

    formTitle: 'مرحباً بك في',
    formSubtitle: 'ساعدنا في تخصيص تجربتك بمشاركة بعض التفاصيل',
    ageRange: 'الفئة العمرية',
    age1825: '١٨-٢٥ سنة',
    age2635: '٢٦-٣٥ سنة',
    age3650: '٣٦-٥٠ سنة',
    age50plus: '+٥٠ سنة',
    nationality: 'الجنسية',
    nationalityPlaceholder: 'مثال: فرنسي، ألماني، أمريكي',
    travelPurpose: 'غرض السفر',
    purposeLeisure: 'ترفيه / إجازة',
    purposeBusiness: 'رحلة عمل',
    purposeFamily: 'إجازة عائلية',
    purposeHoneymoon: 'شهر عسل / رومانسية',
    travelingWith: 'أسافر مع',
    groupSolo: 'بمفردي',
    groupCouple: 'زوج/زوجة',
    groupFamily: 'العائلة',
    groupGroup: 'مجموعة / أصدقاء',
    saving: 'جارٍ الحفظ...',
    continueBtn: 'الانتقال إلى المساعد',
    formFooter: 'تساعدنا معلوماتك على تقديم توصيات أفضل وتحسين خدماتنا',
  },

  es: {
    appName: 'Tunisia Hotels',
    tagline: 'Tu Asistente IA Personal',
    adminBtn: 'Admin',
    localTime: 'Hora Local',

    heroTitle: 'Bienvenido a',
    heroSubtitle: 'Descubre la experiencia hotelera perfecta con tu asistente IA personal. Obtén recomendaciones personalizadas, información en tiempo real y actividades locales.',
    featureBeach: 'Acceso a la Playa',
    featureWeather: 'Clima Perfecto',
    featureAI: 'Asistente IA 24/7',

    sectionTitle: 'Elige Tu Hotel Perfecto',
    sectionSubtitle: 'Cada hotel cuenta con un conserje IA dedicado para mejorar tu estancia',
    cardFeatures: 'Características',
    cardSpecialties: 'Especialidades',
    cardCTA: 'Iniciar Tu Experiencia',

    loadingTitle: 'Preparando Tu Experiencia',
    loadingSubtitle: 'Configurando el conserje IA para',

    footerText: '© 2025 Tunisia Hotel Assistant · Tu experiencia turística perfecta',

    hotelAssistant: 'Asistente del hotel',
    backBtn: 'Volver',

    liveContext: 'Contexto en vivo',
    hotelDetails: 'Detalles del hotel',
    weatherLabel: 'Clima',
    tempLabel: 'Temperatura',
    humidityLabel: 'Humedad',
    windLabel: 'Viento',
    loadingWeather: 'Cargando clima...',
    unavailable: 'No disponible',
    notAvailable: 'No disponible',
    available: 'Disponible',
    checkIn: 'Entrada',
    checkOut: 'Salida',
    frontDesk: 'Recepción',
    wifi: 'WiFi',
    feelsLike: 'sensación',

    // Hotel card features & specialties
    feat_beachAccess: 'Acceso a la Playa',
    feat_spaWellness: 'Spa & Bienestar',
    feat_multipleRestaurants: 'Múltiples Restaurantes',
    feat_kidsClub: 'Club Infantil',
    feat_privateBeach: 'Playa Privada',
    feat_waterSports: 'Deportes Acuáticos',
    feat_familyActivities: 'Actividades Familiares',
    feat_allInclusive: 'Todo Incluido',
    feat_historicLocation: 'Ubicación Histórica',
    feat_luxurySpa: 'Spa de Lujo',
    feat_fineDining: 'Alta Cocina',
    feat_culturalTours: 'Tours Culturales',
    spec_traditionalArch: 'Arquitectura Tradicional',
    spec_beachfrontLocation: 'Primera Línea de Playa',
    spec_culturalActivities: 'Actividades Culturales',
    spec_familyEntertainment: 'Entretenimiento Familiar',
    spec_waterActivities: 'Actividades Acuáticas',
    spec_kidsPrograms: 'Programas Infantiles',
    spec_historicMedina: 'Tours Medina Histórica',
    spec_localExperiences: 'Experiencias Locales',
    spec_premiumService: 'Servicio Premium',

    welcomeMessage: 'Bienvenido a {name}. Puedo ayudarte con las instalaciones, horarios, atracciones cercanas, información meteorológica y servicios del hotel. Para reservas, por favor contacta con recepción directamente. ¿En qué puedo ayudarte hoy?',
    guestAssistant: 'Asistente de huéspedes',
    guestAssistantSub: 'Pregunta sobre horarios, instalaciones, actividades, atracciones o información general del hotel.',
    chatPlaceholder: 'Pregunta sobre horarios de desayuno, atracciones cercanas, WiFi, eventos o servicios...',
    assistantTyping: 'El asistente está preparando una respuesta...',

    upcomingEvents: 'Próximos Eventos',
    reserveSpot: 'Reservar un lugar',
    dateTBA: 'Fecha por confirmar',

    hotelNotFound: 'Hotel no encontrado',
    returnHome: 'Volver al inicio',

    formTitle: 'Bienvenido a',
    formSubtitle: 'Ayúdanos a personalizar tu experiencia compartiendo algunos detalles',
    ageRange: 'Rango de edad',
    age1825: '18-25 años',
    age2635: '26-35 años',
    age3650: '36-50 años',
    age50plus: '50+ años',
    nationality: 'Nacionalidad',
    nationalityPlaceholder: 'ej: Francés, Alemán, Americano',
    travelPurpose: 'Motivo del viaje',
    purposeLeisure: 'Ocio / Vacaciones',
    purposeBusiness: 'Viaje de negocios',
    purposeFamily: 'Vacaciones familiares',
    purposeHoneymoon: 'Luna de miel / Romance',
    travelingWith: 'Viajo con',
    groupSolo: 'Solo/a',
    groupCouple: 'Pareja',
    groupFamily: 'Familia',
    groupGroup: 'Grupo / Amigos',
    saving: 'Guardando...',
    continueBtn: 'Ir al Asistente',
    formFooter: 'Tu información nos ayuda a ofrecerte mejores recomendaciones',
  },

  de: {
    appName: 'Tunisia Hotels',
    tagline: 'Ihr Persönlicher KI-Assistent',
    adminBtn: 'Admin',
    localTime: 'Ortszeit',

    heroTitle: 'Willkommen in',
    heroSubtitle: 'Entdecken Sie das perfekte Hotelerlebnis mit Ihrem persönlichen KI-Assistenten. Erhalten Sie personalisierte Empfehlungen, Echtzeit-Informationen und lokale Aktivitäten.',
    featureBeach: 'Strandzugang',
    featureWeather: 'Perfektes Wetter',
    featureAI: 'KI-Assistent 24/7',

    sectionTitle: 'Wählen Sie Ihr Perfektes Hotel',
    sectionSubtitle: 'Jedes Hotel verfügt über einen dedizierten KI-Concierge für Ihren Aufenthalt',
    cardFeatures: 'Ausstattung',
    cardSpecialties: 'Besonderheiten',
    cardCTA: 'Erlebnis Starten',

    loadingTitle: 'Ihr Erlebnis wird vorbereitet',
    loadingSubtitle: 'KI-Concierge wird eingerichtet für',

    footerText: '© 2025 Tunisia Hotel Assistant · Ihr perfektes Reiseerlebnis',

    hotelAssistant: 'Hotelassistent',
    backBtn: 'Zurück',

    liveContext: 'Live-Kontext',
    hotelDetails: 'Hoteldetails',
    weatherLabel: 'Wetter',
    tempLabel: 'Temperatur',
    humidityLabel: 'Luftfeuchtigkeit',
    windLabel: 'Wind',
    loadingWeather: 'Wetter wird geladen...',
    unavailable: 'Nicht verfügbar',
    notAvailable: 'Nicht verfügbar',
    available: 'Verfügbar',
    checkIn: 'Check-in',
    checkOut: 'Check-out',
    frontDesk: 'Rezeption',
    wifi: 'WLAN',
    feelsLike: 'gefühlt',

    // Hotel card features & specialties
    feat_beachAccess: 'Strandzugang',
    feat_spaWellness: 'Spa & Wellness',
    feat_multipleRestaurants: 'Mehrere Restaurants',
    feat_kidsClub: 'Kinderclub',
    feat_privateBeach: 'Privatstrand',
    feat_waterSports: 'Wassersport',
    feat_familyActivities: 'Familienaktivitäten',
    feat_allInclusive: 'All-Inclusive',
    feat_historicLocation: 'Historischer Standort',
    feat_luxurySpa: 'Luxus-Spa',
    feat_fineDining: 'Feinschmecker-Restaurant',
    feat_culturalTours: 'Kulturtouren',
    spec_traditionalArch: 'Traditionelle Architektur',
    spec_beachfrontLocation: 'Strandlage',
    spec_culturalActivities: 'Kulturelle Aktivitäten',
    spec_familyEntertainment: 'Familienunterhaltung',
    spec_waterActivities: 'Wasseraktivitäten',
    spec_kidsPrograms: 'Kinderprogramme',
    spec_historicMedina: 'Historische Medina-Touren',
    spec_localExperiences: 'Lokale Erlebnisse',
    spec_premiumService: 'Premium-Service',

    welcomeMessage: 'Willkommen in {name}. Ich kann Ihnen bei Hoteleinrichtungen, Zeitplänen, nahegelegenen Sehenswürdigkeiten, Wetterupdates und Hotelservices helfen. Für Buchungen wenden Sie sich bitte direkt an die Rezeption. Wie kann ich Ihnen heute helfen?',
    guestAssistant: 'Gästeassistent',
    guestAssistantSub: 'Fragen zu Zeiten, Einrichtungen, Aktivitäten, Sehenswürdigkeiten oder allgemeinen Hotelinformationen.',
    chatPlaceholder: 'Fragen zu Frühstückszeiten, nahegelegenen Sehenswürdigkeiten, WLAN, Veranstaltungen...',
    assistantTyping: 'Assistent bereitet eine Antwort vor...',

    upcomingEvents: 'Bevorstehende Veranstaltungen',
    reserveSpot: 'Platz reservieren',
    dateTBA: 'Datum wird noch bekanntgegeben',

    hotelNotFound: 'Hotel nicht gefunden',
    returnHome: 'Zur Startseite',

    formTitle: 'Willkommen im',
    formSubtitle: 'Helfen Sie uns, Ihren Aufenthalt zu personalisieren, indem Sie einige Details angeben',
    ageRange: 'Altersgruppe',
    age1825: '18-25 Jahre',
    age2635: '26-35 Jahre',
    age3650: '36-50 Jahre',
    age50plus: '50+ Jahre',
    nationality: 'Nationalität',
    nationalityPlaceholder: 'z.B.: Französisch, Deutsch, Amerikanisch',
    travelPurpose: 'Reisezweck',
    purposeLeisure: 'Freizeit / Urlaub',
    purposeBusiness: 'Geschäftsreise',
    purposeFamily: 'Familienurlaub',
    purposeHoneymoon: 'Flitterwochen / Romantik',
    travelingWith: 'Ich reise mit',
    groupSolo: 'Alleinreisend',
    groupCouple: 'Paar',
    groupFamily: 'Familie',
    groupGroup: 'Gruppe / Freunde',
    saving: 'Wird gespeichert...',
    continueBtn: 'Zum Chat-Assistenten',
    formFooter: 'Ihre Angaben helfen uns, bessere Empfehlungen zu geben',
  },

  it: {
    appName: 'Tunisia Hotels',
    tagline: 'Il Tuo Assistente IA Personale',
    adminBtn: 'Admin',
    localTime: 'Ora Locale',

    heroTitle: 'Benvenuto in',
    heroSubtitle: "Scopri l'esperienza alberghiera perfetta con il tuo assistente IA personale. Ricevi raccomandazioni personalizzate, informazioni in tempo reale e attività locali.",
    featureBeach: 'Accesso alla Spiaggia',
    featureWeather: 'Clima Perfetto',
    featureAI: 'Assistente IA 24/7',

    sectionTitle: 'Scegli il Tuo Hotel Perfetto',
    sectionSubtitle: "Ogni hotel dispone di un concierge IA dedicato per migliorare il tuo soggiorno",
    cardFeatures: 'Caratteristiche',
    cardSpecialties: 'Specialità',
    cardCTA: 'Inizia la Tua Esperienza',

    loadingTitle: 'Preparazione della Tua Esperienza',
    loadingSubtitle: 'Configurazione del concierge IA per',

    footerText: '© 2025 Tunisia Hotel Assistant · La tua esperienza turistica perfetta',

    hotelAssistant: 'Assistente hotel',
    backBtn: 'Indietro',

    liveContext: 'Contesto in tempo reale',
    hotelDetails: "Dettagli dell'hotel",
    weatherLabel: 'Meteo',
    tempLabel: 'Temperatura',
    humidityLabel: 'Umidità',
    windLabel: 'Vento',
    loadingWeather: 'Caricamento meteo...',
    unavailable: 'Non disponibile',
    notAvailable: 'Non disponibile',
    available: 'Disponibile',
    checkIn: 'Check-in',
    checkOut: 'Check-out',
    frontDesk: 'Reception',
    wifi: 'WiFi',
    feelsLike: 'percepita',

    // Hotel card features & specialties
    feat_beachAccess: 'Accesso alla Spiaggia',
    feat_spaWellness: 'Spa & Benessere',
    feat_multipleRestaurants: 'Ristoranti Multipli',
    feat_kidsClub: 'Club Bambini',
    feat_privateBeach: 'Spiaggia Privata',
    feat_waterSports: 'Sport Acquatici',
    feat_familyActivities: 'Attività Familiari',
    feat_allInclusive: 'All-Inclusive',
    feat_historicLocation: 'Posizione Storica',
    feat_luxurySpa: 'Spa di Lusso',
    feat_fineDining: 'Alta Cucina',
    feat_culturalTours: 'Tour Culturali',
    spec_traditionalArch: 'Architettura Tradizionale',
    spec_beachfrontLocation: 'Posizione Fronte Mare',
    spec_culturalActivities: 'Attività Culturali',
    spec_familyEntertainment: 'Intrattenimento Familiare',
    spec_waterActivities: 'Attività Acquatiche',
    spec_kidsPrograms: 'Programmi Bambini',
    spec_historicMedina: 'Tour Medina Storica',
    spec_localExperiences: 'Esperienze Locali',
    spec_premiumService: 'Servizio Premium',

    welcomeMessage: 'Benvenuto a {name}. Posso aiutarti con i servizi dell\'hotel, gli orari, le attrazioni vicine, gli aggiornamenti meteo e i servizi alberghieri. Per prenotazioni, contatta direttamente la reception. Come posso aiutarti oggi?',
    guestAssistant: 'Assistente ospiti',
    guestAssistantSub: "Chiedi di orari, servizi, attività, attrazioni o informazioni generali sull'hotel.",
    chatPlaceholder: 'Chiedi degli orari della colazione, attrazioni vicine, WiFi, eventi o servizi...',
    assistantTyping: "L'assistente sta preparando una risposta...",

    upcomingEvents: 'Prossimi Eventi',
    reserveSpot: 'Prenota un posto',
    dateTBA: 'Data da confermare',

    hotelNotFound: 'Hotel non trovato',
    returnHome: 'Torna alla home',

    formTitle: 'Benvenuto a',
    formSubtitle: 'Aiutaci a personalizzare la tua esperienza condividendo alcuni dettagli',
    ageRange: 'Fascia d\'età',
    age1825: '18-25 anni',
    age2635: '26-35 anni',
    age3650: '36-50 anni',
    age50plus: '50+ anni',
    nationality: 'Nazionalità',
    nationalityPlaceholder: 'es: Francese, Tedesco, Americano',
    travelPurpose: 'Scopo del viaggio',
    purposeLeisure: 'Svago / Vacanza',
    purposeBusiness: 'Viaggio di lavoro',
    purposeFamily: 'Vacanza in famiglia',
    purposeHoneymoon: 'Luna di miele / Romantico',
    travelingWith: 'Viaggio con',
    groupSolo: 'Da solo/a',
    groupCouple: 'Coppia',
    groupFamily: 'Famiglia',
    groupGroup: 'Gruppo / Amici',
    saving: 'Salvataggio...',
    continueBtn: "Vai all'Assistente",
    formFooter: 'Le tue informazioni ci aiutano a fornirti raccomandazioni migliori',
  },
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface LanguageContextValue {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
  isRTL: boolean
}

const LanguageContext = createContext<LanguageContextValue>({
  language: 'en',
  setLanguage: () => {},
  t: (key) => key,
  isRTL: false,
})

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en')

  // Load persisted language on mount
  useEffect(() => {
    const saved = localStorage.getItem('appLanguage') as Language | null
    if (saved && dictionaries[saved]) {
      setLanguageState(saved)
    }
  }, [])

  // Apply RTL + html lang attribute whenever language changes
  useEffect(() => {
    const isRTL = LANGUAGES.find(l => l.code === language)?.rtl ?? false
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr'
    document.documentElement.lang = language
  }, [language])

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem('appLanguage', lang)
  }

  const t = (key: string): string => {
    return dictionaries[language]?.[key] ?? dictionaries['en']?.[key] ?? key
  }

  const isRTL = LANGUAGES.find(l => l.code === language)?.rtl ?? false

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}
