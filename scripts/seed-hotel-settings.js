/**
 * Seeds facilities, contact_info, and amenities for all hotels.
 * Safe to re-run (UPSERT).
 *
 * Usage:
 *   DATABASE_URL=postgresql://... node scripts/seed-hotel-settings.js
 *   npm run docker:seed-settings
 */
const { Pool } = require('pg')
const { getPoolOptions } = require('./load-env')

const HOTELS = {
  'sindbad-hammamet': {
    restaurant: {
      breakfast: { start: '07:00', end: '10:00', available: true },
      lunch: { start: '12:00', end: '15:00', available: true },
      dinner: { start: '19:00', end: '22:00', available: true },
    },
    spa: { available: true, openTime: '09:00', closeTime: '21:00', treatments: ['Traditional Hammam', 'Aromatherapy Massage', 'Facial Treatment'] },
    pool: { available: true, openTime: '06:00', closeTime: '22:00', barOpenTime: '06:00', barCloseTime: '22:00' },
    gym: { available: true, openTime: '05:00', closeTime: '23:00' },
    kidsClub: { available: true, openTime: '09:00', closeTime: '17:00', ageRange: '4-12' },
    contact: { phone: '+216 72 280 122', email: 'info@sindbad-hammamet.com', address: 'Zone Touristique, Hammamet 8050, Tunisia', emergencyPhone: '+216 72 280 100' },
    wifi: { available: true, password: 'SindbadGuest2024', instructions: 'Connect to "Sindbad_WiFi" network' },
    parking: { available: true, price: 'Free', instructions: 'Parking available in front of hotel' },
    checkIn: { time: '15:00', instructions: 'Early check-in available upon request' },
    checkOut: { time: '12:00', instructions: 'Late check-out available until 14:00 for additional fee' },
  },
  'villa-didon-carthage': {
    restaurant: {
      breakfast: { start: '07:30', end: '10:30', available: true },
      lunch: { start: '12:30', end: '15:30', available: true },
      dinner: { start: '19:30', end: '22:30', available: true },
    },
    spa: { available: true, openTime: '09:00', closeTime: '21:00', treatments: ['Hammam Royal', 'Thalassotherapy', 'Aromatherapy Massage', 'Reflexology'] },
    pool: { available: true, openTime: '08:00', closeTime: '20:00', barOpenTime: '10:00', barCloseTime: '22:00' },
    gym: { available: true, openTime: '06:00', closeTime: '22:00' },
    kidsClub: { available: false, openTime: '09:00', closeTime: '17:00', ageRange: 'N/A' },
    contact: { phone: '+216 31 323 000', email: 'contact@villadidoncarthage.com', address: 'Rue Mendes France, Byrsa Hill, Carthage 2016, Tunisia', emergencyPhone: '+216 31 323 100' },
    wifi: { available: true, password: 'VillaDidon2024', instructions: 'Connect to "VillaDidon_Guest" — password at check-in' },
    parking: { available: true, price: 'Free valet', instructions: 'Valet parking available 24h' },
    checkIn: { time: '14:00', instructions: 'Early check-in from 11:00 subject to availability' },
    checkOut: { time: '12:00', instructions: 'Late check-out until 15:00 on request' },
  },
  'belvedere-fourati-tunis': {
    restaurant: {
      breakfast: { start: '07:00', end: '10:30', available: true },
      lunch: { start: '12:00', end: '15:00', available: true },
      dinner: { start: '19:00', end: '22:30', available: true },
    },
    spa: { available: false, openTime: '00:00', closeTime: '00:00', treatments: [] },
    pool: { available: true, openTime: '07:00', closeTime: '21:00', barOpenTime: '09:00', barCloseTime: '20:00' },
    gym: { available: true, openTime: '06:00', closeTime: '23:00' },
    kidsClub: { available: false, openTime: '09:00', closeTime: '17:00', ageRange: 'N/A' },
    contact: { phone: '+216 71 783 133', email: 'reservation@hotelbelvederetunis.com', address: '10 Avenue des États-Unis, Belvédère, 1002 Tunis, Tunisia', emergencyPhone: '+216 71 783 100' },
    wifi: { available: true, password: 'Belvedere2024', instructions: 'Free WiFi throughout — ask reception for the password' },
    parking: { available: true, price: 'Free', instructions: 'Free covered parking on-site, 24h access' },
    checkIn: { time: '14:00', instructions: 'Express check-in available; ID required' },
    checkOut: { time: '12:00', instructions: 'Late check-out until 14:00 for a small fee' },
  },
}

const pool = new Pool(getPoolOptions())

async function upsertFacility(client, hotelId, facilityType, facilityName, row) {
  await client.query(
    `INSERT INTO facilities (hotel_id, facility_type, facility_name, is_available, open_time, close_time, treatments, age_range)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (hotel_id, facility_type, facility_name)
     DO UPDATE SET
       is_available = EXCLUDED.is_available,
       open_time = EXCLUDED.open_time,
       close_time = EXCLUDED.close_time,
       treatments = EXCLUDED.treatments,
       age_range = EXCLUDED.age_range,
       updated_at = NOW()`,
    [
      hotelId,
      facilityType,
      facilityName,
      row.available ?? true,
      row.openTime || row.start || null,
      row.closeTime || row.end || null,
      row.treatments || null,
      row.ageRange || null,
    ]
  )
}

async function seedHotel(client, hotelId, settings) {
  for (const [mealType, meal] of Object.entries(settings.restaurant)) {
    await upsertFacility(client, hotelId, 'restaurant', mealType, {
      available: meal.available,
      start: meal.start,
      end: meal.end,
    })
  }

  await upsertFacility(client, hotelId, 'spa', 'main', {
    available: settings.spa.available,
    openTime: settings.spa.openTime,
    closeTime: settings.spa.closeTime,
    treatments: settings.spa.treatments,
  })

  await upsertFacility(client, hotelId, 'pool', 'main', {
    available: settings.pool.available,
    openTime: settings.pool.openTime,
    closeTime: settings.pool.closeTime,
  })

  if (settings.pool.barOpenTime || settings.pool.barCloseTime) {
    await upsertFacility(client, hotelId, 'bar', 'infinity_bar', {
      available: settings.pool.available !== false,
      openTime: settings.pool.barOpenTime,
      closeTime: settings.pool.barCloseTime,
    })
  }

  await upsertFacility(client, hotelId, 'gym', 'main', {
    available: settings.gym.available,
    openTime: settings.gym.openTime,
    closeTime: settings.gym.closeTime,
  })

  await upsertFacility(client, hotelId, 'kids_club', 'main', {
    available: settings.kidsClub.available,
    openTime: settings.kidsClub.openTime,
    closeTime: settings.kidsClub.closeTime,
    ageRange: settings.kidsClub.ageRange,
  })

  const c = settings.contact
  await client.query(
    `INSERT INTO contact_info (hotel_id, phone, email, address, emergency_phone, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (hotel_id) DO UPDATE SET
       phone = EXCLUDED.phone, email = EXCLUDED.email, address = EXCLUDED.address,
       emergency_phone = EXCLUDED.emergency_phone, updated_at = NOW()`,
    [hotelId, c.phone, c.email, c.address, c.emergencyPhone]
  )

  const amenities = [
    ['wifi', settings.wifi.available, settings.wifi.password, settings.wifi.instructions],
    ['parking', settings.parking.available, settings.parking.price, settings.parking.instructions],
    ['checkin', true, settings.checkIn.time, settings.checkIn.instructions],
    ['checkout', true, settings.checkOut.time, settings.checkOut.instructions],
  ]

  for (const [type, available, primary, instructions] of amenities) {
    await client.query(
      `INSERT INTO amenities (hotel_id, amenity_type, is_available, primary_value, instructions)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (hotel_id, amenity_type) DO UPDATE SET
         is_available = EXCLUDED.is_available,
         primary_value = EXCLUDED.primary_value,
         instructions = EXCLUDED.instructions`,
      [hotelId, type, available, primary, instructions]
    )
  }
}

async function main() {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    for (const [hotelId, settings] of Object.entries(HOTELS)) {
      await seedHotel(client, hotelId, settings)
      console.log(`✅ Seeded settings for ${hotelId}`)
    }
    await client.query('COMMIT')
    console.log('\n🎉 Hotel settings seed complete.')

    if (process.env.REDIS_URL) {
      try {
        const Redis = require('ioredis')
        const redis = new Redis(process.env.REDIS_URL, {
          maxRetriesPerRequest: 1,
          connectTimeout: 2000,
          lazyConnect: true,
        })
        await redis.connect()
        await redis.del('hotel:settings:all')
        redis.disconnect()
        console.log('🗑️  Cleared hotel settings cache')
      } catch {
        console.log('ℹ️  Redis cache not cleared (optional) — restart the app if settings look stale')
      }
    }
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('❌ Seed failed:', error.message)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

main()
