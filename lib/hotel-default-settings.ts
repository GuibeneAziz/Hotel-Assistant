export interface HotelSettingsShape {
  name: string
  restaurant: {
    breakfast: { start: string; end: string; available: boolean }
    lunch: { start: string; end: string; available: boolean }
    dinner: { start: string; end: string; available: boolean }
  }
  spa: { available: boolean; openTime: string; closeTime: string; treatments: string[] }
  pool: { openTime: string; closeTime: string; available: boolean; barOpenTime?: string; barCloseTime?: string }
  gym: { openTime: string; closeTime: string; available: boolean }
  kidsClub: { openTime: string; closeTime: string; available: boolean; ageRange: string }
  contact: { phone: string; email: string; address: string; emergencyPhone: string }
  wifi: { available: boolean; password: string; instructions: string }
  parking: { available: boolean; price: string; instructions: string }
  checkIn: { time: string; instructions: string }
  checkOut: { time: string; instructions: string }
  specialEvents: unknown[]
}

export const HOTEL_DEFAULT_SETTINGS: Record<string, HotelSettingsShape> = {
  'sindbad-hammamet': {
    name: 'Sindbad Hotel',
    restaurant: {
      breakfast: { start: '07:00', end: '10:00', available: true },
      lunch: { start: '12:00', end: '15:00', available: true },
      dinner: { start: '19:00', end: '22:00', available: true },
    },
    spa: {
      available: true,
      openTime: '09:00',
      closeTime: '21:00',
      treatments: ['Traditional Hammam', 'Aromatherapy Massage', 'Facial Treatment'],
    },
    pool: { openTime: '06:00', closeTime: '22:00', available: true, barOpenTime: '06:00', barCloseTime: '22:00' },
    gym: { openTime: '05:00', closeTime: '23:00', available: true },
    kidsClub: { openTime: '09:00', closeTime: '17:00', available: true, ageRange: '4-12' },
    contact: {
      phone: '+216 72 280 122',
      email: 'info@sindbad-hammamet.com',
      address: 'Zone Touristique, Hammamet 8050, Tunisia',
      emergencyPhone: '+216 72 280 100',
    },
    wifi: { available: true, password: 'SindbadGuest2024', instructions: 'Connect to "Sindbad_WiFi" network' },
    parking: { available: true, price: 'Free', instructions: 'Parking available in front of hotel' },
    checkIn: { time: '15:00', instructions: 'Early check-in available upon request' },
    checkOut: { time: '12:00', instructions: 'Late check-out available until 14:00 for additional fee' },
    specialEvents: [],
  },
  'villa-didon-carthage': {
    name: 'Villa Didon',
    restaurant: {
      breakfast: { start: '07:30', end: '10:30', available: true },
      lunch: { start: '12:30', end: '15:30', available: true },
      dinner: { start: '19:30', end: '22:30', available: true },
    },
    spa: {
      available: true,
      openTime: '09:00',
      closeTime: '21:00',
      treatments: ['Hammam Royal', 'Thalassotherapy', 'Aromatherapy Massage', 'Reflexology'],
    },
    pool: { openTime: '08:00', closeTime: '20:00', available: true, barOpenTime: '10:00', barCloseTime: '22:00' },
    gym: { openTime: '06:00', closeTime: '22:00', available: true },
    kidsClub: { openTime: '09:00', closeTime: '17:00', available: false, ageRange: 'N/A' },
    contact: {
      phone: '+216 31 323 000',
      email: 'contact@villadidoncarthage.com',
      address: 'Rue Mendes France, Byrsa Hill, Carthage 2016, Tunisia',
      emergencyPhone: '+216 31 323 100',
    },
    wifi: { available: true, password: 'VillaDidon2024', instructions: 'Connect to "VillaDidon_Guest" — password at check-in' },
    parking: { available: true, price: 'Free valet', instructions: 'Valet parking available 24h' },
    checkIn: { time: '14:00', instructions: 'Early check-in from 11:00 subject to availability' },
    checkOut: { time: '12:00', instructions: 'Late check-out until 15:00 on request' },
    specialEvents: [],
  },
  'belvedere-fourati-tunis': {
    name: 'Hôtel Belvédère Fourati',
    restaurant: {
      breakfast: { start: '07:00', end: '10:30', available: true },
      lunch: { start: '12:00', end: '15:00', available: true },
      dinner: { start: '19:00', end: '22:30', available: true },
    },
    spa: { available: false, openTime: '00:00', closeTime: '00:00', treatments: [] },
    pool: { openTime: '07:00', closeTime: '21:00', available: true, barOpenTime: '09:00', barCloseTime: '20:00' },
    gym: { openTime: '06:00', closeTime: '23:00', available: true },
    kidsClub: { openTime: '09:00', closeTime: '17:00', available: false, ageRange: 'N/A' },
    contact: {
      phone: '+216 71 783 133',
      email: 'reservation@hotelbelvederetunis.com',
      address: '10 Avenue des États-Unis, Belvédère, 1002 Tunis, Tunisia',
      emergencyPhone: '+216 71 783 100',
    },
    wifi: { available: true, password: 'Belvedere2024', instructions: 'Free WiFi throughout — ask reception for the password' },
    parking: { available: true, price: 'Free', instructions: 'Free covered parking on-site, 24h access' },
    checkIn: { time: '14:00', instructions: 'Express check-in available; ID required' },
    checkOut: { time: '12:00', instructions: 'Late check-out until 14:00 for a small fee' },
    specialEvents: [],
  },
}

function mergeMeal(
  fromDb: { start?: string; end?: string; available?: boolean } | undefined,
  fallback: { start: string; end: string; available: boolean }
) {
  const start = fromDb?.start?.trim() || fallback.start
  const end = fromDb?.end?.trim() || fallback.end
  const available = fromDb?.available ?? (Boolean(fromDb?.start) || fallback.available)
  return { start, end, available }
}

/** Fill missing DB values with hotel defaults (Docker DB starts empty). */
export function mergeHotelSettings(
  fromDb: Partial<HotelSettingsShape> | null | undefined,
  hotelId: string
): HotelSettingsShape {
  const defaults = HOTEL_DEFAULT_SETTINGS[hotelId] || HOTEL_DEFAULT_SETTINGS['sindbad-hammamet']

  if (!fromDb) return defaults

  return {
    ...defaults,
    ...fromDb,
    name: fromDb.name || defaults.name,
    restaurant: {
      breakfast: mergeMeal(fromDb.restaurant?.breakfast, defaults.restaurant.breakfast),
      lunch: mergeMeal(fromDb.restaurant?.lunch, defaults.restaurant.lunch),
      dinner: mergeMeal(fromDb.restaurant?.dinner, defaults.restaurant.dinner),
    },
    contact: {
      phone: fromDb.contact?.phone?.trim() || defaults.contact.phone,
      email: fromDb.contact?.email?.trim() || defaults.contact.email,
      address: fromDb.contact?.address?.trim() || defaults.contact.address,
      emergencyPhone: fromDb.contact?.emergencyPhone?.trim() || defaults.contact.emergencyPhone,
    },
    checkIn: {
      time: fromDb.checkIn?.time?.trim() || defaults.checkIn.time,
      instructions: fromDb.checkIn?.instructions || defaults.checkIn.instructions,
    },
    checkOut: {
      time: fromDb.checkOut?.time?.trim() || defaults.checkOut.time,
      instructions: fromDb.checkOut?.instructions || defaults.checkOut.instructions,
    },
    wifi: {
      available: fromDb.wifi?.available ?? defaults.wifi.available,
      password: fromDb.wifi?.password || defaults.wifi.password,
      instructions: fromDb.wifi?.instructions || defaults.wifi.instructions,
    },
    parking: {
      available: fromDb.parking?.available ?? defaults.parking.available,
      price: fromDb.parking?.price || defaults.parking.price,
      instructions: fromDb.parking?.instructions || defaults.parking.instructions,
    },
    spa: { ...defaults.spa, ...fromDb.spa },
    pool: { ...defaults.pool, ...fromDb.pool },
    gym: { ...defaults.gym, ...fromDb.gym },
    kidsClub: { ...defaults.kidsClub, ...fromDb.kidsClub },
    specialEvents: fromDb.specialEvents ?? defaults.specialEvents,
  }
}
