/**
 * seed-attractions.js
 *
 * Wipes all existing nearby_attractions and inserts a hand-curated set
 * with ~4 entries per category per hotel.
 *
 * Categories: cultural | nature | adventure | entertainment | shopping | restaurant | cafe
 *
 * Usage:
 *   node scripts/seed-attractions.js            # seeds all hotels
 *   node scripts/seed-attractions.js sindbad-hammamet   # seeds one hotel
 */
require('dotenv').config()
const { Pool } = require('pg')

const TARGET_HOTEL = process.argv[2] || null
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })

// ─── Helpers ────────────────────────────────────────────────────────────────
// c() provides default values for the logistics fields still used by the
// clustering pipeline. All old suitability/weather/season flags are ignored.

function c(overrides) {
  return {
    price_range: 'Free',
    estimated_duration: '1-2 hours',
    transportation: 'Walking / Taxi',
    ...overrides,
  }
}

// ─── CURATED DATA ─────────────────────────────────────────────────────────────
// Each entry: { hotel_id, attraction_name, description, category, distance,
//               estimated_duration, price_range, transportation }

const ATTRACTIONS = [

  // ═══════════════════════════════════════════════════════════════════════════
  // SINDBAD HOTEL — Hammamet (36.40, 10.60)
  // ═══════════════════════════════════════════════════════════════════════════

  // ── CULTURAL ────────────────────────────────────────────────────────────
  {
    hotel_id: 'sindbad-hammamet',
    attraction_name: 'Hammamet Medina',
    description: "One of Tunisia's best-preserved medinas, the old town of Hammamet is encircled by ancient walls and offers a maze of narrow alleyways lined with whitewashed houses, artisan workshops, jasmine-draped doorways, and local souvenir stalls. Enter through the main gate near the seafront to discover the authentic heartbeat of the city.",
    category: 'cultural', distance: '1.3 km', priority_order: 20,
    ...c({ good_for_rainy: true, good_for_hot: false, activity_level: 'low', estimated_duration: '1-2 hours', transportation: 'Walking / Taxi' }),
  },
  {
    hotel_id: 'sindbad-hammamet',
    attraction_name: 'Hammamet Kasbah',
    description: "A 15th-century fortress perched at the tip of the medina, overlooking the sea on two sides. Climb to the rooftop for some of the most stunning panoramic views along the Tunisian coast. The interior houses a small archaeological display with coins, ceramics, and historical documents from the region.",
    category: 'cultural', distance: '1.3 km', priority_order: 19,
    ...c({ good_for_rainy: true, good_for_hot: false, activity_level: 'low', estimated_duration: '45 min', transportation: 'Walking / Taxi', price_range: '3 TND' }),
  },
  {
    hotel_id: 'sindbad-hammamet',
    attraction_name: 'Pupput Roman Archaeological Site',
    description: "Discover the ruins of Pupput, a prosperous Roman city that flourished between the 1st and 5th centuries AD. The open-air site reveals mosaic floors still in vivid colour, columns, thermal bath structures, and funerary stelae. An underrated gem just outside the tourist zone, perfect for history enthusiasts.",
    category: 'cultural', distance: '3.0 km', priority_order: 14,
    ...c({ good_for_rainy: false, good_for_hot: false, activity_level: 'low', estimated_duration: '1-2 hours', transportation: 'Taxi', price_range: '8 TND' }),
  },
  {
    hotel_id: 'sindbad-hammamet',
    attraction_name: 'Dar Sebastien Villa & Garden',
    description: "A magnificent early 20th-century villa surrounded by lush Mediterranean gardens, once owned by Romanian playboy Georges Sebastian. Designed by Frank Lloyd Wright's student, it hosted Churchill and Roosevelt. Today it serves as the International Cultural Centre of Hammamet, hosting open-air theatre performances in summer.",
    category: 'cultural', distance: '2.5 km', priority_order: 15,
    ...c({ good_for_rainy: false, good_for_hot: false, activity_level: 'low', estimated_duration: '1 hour', transportation: 'Taxi', price_range: '5 TND', good_for_evening: true, suitable_for_couples: true }),
  },

  // ── NATURE ──────────────────────────────────────────────────────────────
  {
    hotel_id: 'sindbad-hammamet',
    attraction_name: 'Hammamet Main Beach',
    description: "A wide, golden-sand beach stretching for kilometres along the Gulf of Hammamet. The water is calm, shallow, and turquoise — ideal for swimming and paddling. Sunbeds and parasols are available for hire, and several beach bars serve fresh juices and grilled food. Particularly beautiful at sunrise when the beach is nearly empty.",
    category: 'nature', distance: '500 m', priority_order: 30,
    ...c({ good_for_rainy: false, good_for_hot: true, activity_level: 'low', estimated_duration: 'Half day', transportation: 'Walking', price_range: 'Free (sunbeds: 5 TND)' }),
  },
  {
    hotel_id: 'sindbad-hammamet',
    attraction_name: 'Yasmine Beach Strip',
    description: "The beach in front of the Yasmine Hammamet resort complex — slightly more lively than the main beach, with beach clubs, water sports rentals, and a vibrant atmosphere. Jet ski, pedalo, and banana boat rides are easily arranged here. The seafront promenade runs parallel and is excellent for an evening stroll.",
    category: 'nature', distance: '2.0 km', priority_order: 18,
    ...c({ good_for_rainy: false, good_for_hot: true, activity_level: 'moderate', estimated_duration: 'Half day', transportation: 'Walking / Taxi', price_range: 'Free (activities extra)', requires_booking: false }),
  },
  {
    hotel_id: 'sindbad-hammamet',
    attraction_name: 'Cap Bon Coastal Walk',
    description: "A scenic coastal walking path that winds northward along the Cap Bon peninsula, passing through pine forests, small fishing coves, and cliff viewpoints. The walk from Hammamet toward Nabeul offers spectacular views of the Mediterranean, with the scent of eucalyptus and sea breeze throughout. Best in the morning or late afternoon.",
    category: 'nature', distance: '4.0 km', priority_order: 11,
    ...c({ good_for_rainy: false, good_for_hot: false, activity_level: 'moderate', estimated_duration: '2-3 hours', transportation: 'Taxi to starting point', price_range: 'Free' }),
  },
  {
    hotel_id: 'sindbad-hammamet',
    attraction_name: 'Bouficha Botanical Forest',
    description: "A vast pine forest south of Hammamet, criss-crossed by shaded walking and cycling trails. Popular with locals for weekend picnics, the forest provides a cool green escape during summer heat. Look out for flamingos and herons at the small lagoon near the forest edge.",
    category: 'nature', distance: '12 km', priority_order: 8,
    ...c({ good_for_rainy: false, good_for_hot: false, activity_level: 'moderate', estimated_duration: '2-4 hours', transportation: 'Taxi', price_range: 'Free' }),
  },

  // ── ADVENTURE ───────────────────────────────────────────────────────────
  {
    hotel_id: 'sindbad-hammamet',
    attraction_name: 'Aqua Palace Water Park',
    description: "One of the largest water parks in North Africa, located in Yasmine Hammamet. Featuring over 30 slides and attractions including a giant wave pool, lazy river, kamikaze slides, kids splash zone, and a dedicated toddler area. Food kiosks and shaded seating areas throughout. A full day of family fun.",
    category: 'adventure', distance: '2.5 km', priority_order: 16,
    ...c({ good_for_rainy: false, good_for_hot: true, good_for_cool: false, activity_level: 'high', estimated_duration: 'Full day', transportation: 'Taxi', price_range: '35-65 TND', requires_booking: false, suitable_for_senior: false }),
  },
  {
    hotel_id: 'sindbad-hammamet',
    attraction_name: 'Jet Ski & Water Sports Hammamet',
    description: "Multiple operators on Hammamet Beach offer jet ski rentals, parasailing, wakeboarding, and pedalo hire. A 20-minute jet ski session takes you along the coastline with views back toward the medina walls. No experience required — instructors are on hand for beginners. Best booked directly on the beach.",
    category: 'adventure', distance: '600 m', priority_order: 22,
    ...c({ good_for_rainy: false, good_for_hot: true, good_for_cool: false, activity_level: 'high', estimated_duration: '1-2 hours', transportation: 'Walking', price_range: '40-120 TND', requires_booking: false, suitable_for_families: true, suitable_for_senior: false }),
  },
  {
    hotel_id: 'sindbad-hammamet',
    attraction_name: 'Quad Biking Cap Bon',
    description: "Guided quad bike excursions through the Cap Bon countryside — orange groves, coastal tracks, and Berber villages. Tours typically depart at 9h and 14h, lasting around 2 hours. Helmets and brief training provided. A popular choice for couples and small groups looking for a light adrenaline rush off the beach.",
    category: 'adventure', distance: '5 km', priority_order: 10,
    ...c({ good_for_rainy: false, good_for_hot: false, activity_level: 'high', estimated_duration: '2 hours', transportation: 'Taxi / shuttle', price_range: '60-90 TND', requires_booking: true, suitable_for_senior: false }),
  },
  {
    hotel_id: 'sindbad-hammamet',
    attraction_name: 'Camel Riding at Sunset',
    description: "A classic Tunisian experience: a sunset camel ride along the beach or through the dunes near Hammamet. Lasting around 30 to 45 minutes, it is ideal for couples, families, and photographers. Several operators run departures from the southern end of the main beach. No experience needed — the camels are guided.",
    category: 'adventure', distance: '3 km', priority_order: 13,
    ...c({ good_for_rainy: false, good_for_hot: false, activity_level: 'low', estimated_duration: '45 min', transportation: 'Taxi', price_range: '20-35 TND', requires_booking: false, good_for_evening: true }),
  },

  // ── ENTERTAINMENT ────────────────────────────────────────────────────────
  {
    hotel_id: 'sindbad-hammamet',
    attraction_name: 'Carthageland Theme Park',
    description: "The largest theme park in North Africa, spread over 75 hectares in Yasmine Hammamet. Includes thrilling roller coasters, water slides, a medieval village, pirate ship, live performances, and a dedicated children's area. Restaurants and snack kiosks throughout. Plan at least 5-6 hours to cover all the major attractions.",
    category: 'entertainment', distance: '2.2 km', priority_order: 17,
    ...c({ good_for_rainy: false, good_for_hot: false, activity_level: 'high', estimated_duration: 'Full day', transportation: 'Taxi', price_range: '40-80 TND', requires_booking: false, good_for_evening: false }),
  },
  {
    hotel_id: 'sindbad-hammamet',
    attraction_name: 'Yasmine Hammamet Marina & Promenade',
    description: "A beautifully designed marina with dozens of luxury yachts and traditional fishing boats moored side by side. The surrounding promenade is lined with ice cream shops, souvenir boutiques, and terrace cafés. In summer, street performers and live music animate the evenings. A perfect leisurely stroll after dinner.",
    category: 'entertainment', distance: '2.3 km', priority_order: 18,
    ...c({ good_for_rainy: false, good_for_hot: false, activity_level: 'low', estimated_duration: '1-2 hours', transportation: 'Taxi', price_range: 'Free', good_for_evening: true }),
  },
  {
    hotel_id: 'sindbad-hammamet',
    attraction_name: 'International Festival of Hammamet',
    description: "Held every summer (July-August) in the open-air amphitheatre of the International Cultural Centre, this renowned festival attracts international musicians, theatre troupes, and dance companies. Past performers include world music legends, Arabic pop icons, and classical orchestras. The venue itself, set in the historic gardens of Dar Sebastien, is magical at night.",
    category: 'entertainment', distance: '2.5 km', priority_order: 12,
    ...c({ good_for_rainy: false, good_for_hot: false, activity_level: 'low', estimated_duration: '3 hours', transportation: 'Taxi', price_range: '20-60 TND', requires_booking: true, good_for_evening: true, available_spring: false, available_winter: false, available_autumn: false }),
  },
  {
    hotel_id: 'sindbad-hammamet',
    attraction_name: 'Mini Golf Yasmine Hammamet',
    description: "An 18-hole mini golf course set within the Yasmine Hammamet complex, with themed obstacles inspired by Tunisian architecture and landscapes. Open day and evening, it is a relaxed and fun activity for couples and families not wanting a full day out. Drinks and snacks available at the club house.",
    category: 'entertainment', distance: '2.4 km', priority_order: 13,
    ...c({ good_for_rainy: false, good_for_hot: false, activity_level: 'low', estimated_duration: '1 hour', transportation: 'Taxi', price_range: '10-15 TND', good_for_evening: true }),
  },

  // ── SHOPPING ─────────────────────────────────────────────────────────────
  {
    hotel_id: 'sindbad-hammamet',
    attraction_name: 'Hammamet Medina Souk',
    description: "Inside the medina walls, the souk is a winding market selling hand-painted ceramics, embroidered tablecloths, leather sandals, silver jewellery, Berber carpets, and aromatic spice blends. Bargaining is expected and part of the experience. Best explored in the morning before the heat sets in. A few fixed-price artisan boutiques are also tucked in the backstreets.",
    category: 'shopping', distance: '1.3 km', priority_order: 20,
    ...c({ good_for_rainy: true, good_for_hot: false, activity_level: 'low', estimated_duration: '1-2 hours', transportation: 'Walking / Taxi', price_range: 'Varies', good_for_morning: true, good_for_evening: false, suitable_for_business: true }),
  },
  {
    hotel_id: 'sindbad-hammamet',
    attraction_name: 'Nabeul Friday Pottery Market',
    description: "Every Friday, the town of Nabeul — the pottery capital of Tunisia — hosts its famous open-air market. Hundreds of stalls sell hand-painted glazed ceramics, mosaic tiles, terracotta pots, hand-woven rugs, and olive wood carvings at prices far below tourist shops in Tunis. A fascinating cultural outing even if you buy nothing.",
    category: 'shopping', distance: '13.6 km', priority_order: 7,
    ...c({ good_for_rainy: false, good_for_hot: false, activity_level: 'low', estimated_duration: '2-3 hours', transportation: 'Taxi (25 min)', price_range: 'Free entry', available_spring: true, available_summer: true, available_autumn: true, available_winter: true }),
  },
  {
    hotel_id: 'sindbad-hammamet',
    attraction_name: 'Yasmine Hammamet Boutique Strip',
    description: "A modern open-air shopping street in the heart of Yasmine Hammamet, lined with brand clothing stores, jewellery shops, beachwear boutiques, and souvenir outlets. Prices are fixed and quality is generally good. Several shops offer free alteration for purchased garments. Air-conditioned interiors make it pleasant even on hot days.",
    category: 'shopping', distance: '2.3 km', priority_order: 15,
    ...c({ good_for_rainy: true, good_for_hot: false, activity_level: 'low', estimated_duration: '1-2 hours', transportation: 'Taxi', price_range: 'Varies', good_for_evening: true, suitable_for_business: true }),
  },
  {
    hotel_id: 'sindbad-hammamet',
    attraction_name: 'Centre Commercial Hammamet',
    description: "A small shopping mall in central Hammamet with a supermarket, pharmacy, clothing stores, electronics shop, and a fast food court on the ground floor. Practical for picking up sunscreen, beach supplies, or local snacks. The rooftop terrace has views over the town. Air-conditioned and open daily.",
    category: 'shopping', distance: '1.8 km', priority_order: 16,
    ...c({ good_for_rainy: true, good_for_hot: false, activity_level: 'low', estimated_duration: '1 hour', transportation: 'Taxi', price_range: 'Varies', good_for_evening: true }),
  },

  // ── RESTAURANT ───────────────────────────────────────────────────────────
  {
    hotel_id: 'sindbad-hammamet',
    attraction_name: 'La Baraka Restaurant — Seafront',
    description: "A beloved institution on the Hammamet seafront, La Baraka serves grilled fish and seafood platters with the waves crashing just metres away. Order the mixed grill with local salad and a carafe of house rosé. The terrace fills quickly at sunset — arrive by 7pm or book ahead. Cash or card accepted.",
    category: 'restaurant', distance: '1.1 km', priority_order: 22,
    ...c({ good_for_rainy: false, good_for_hot: false, activity_level: 'low', estimated_duration: '1-2 hours', transportation: 'Walking / Taxi', price_range: '25-50 TND/person', good_for_evening: true, good_for_afternoon: true, suitable_for_couples: true, requires_booking: true }),
  },
  {
    hotel_id: 'sindbad-hammamet',
    attraction_name: 'Restaurant Dar Hammamet — Traditional',
    description: "Hidden inside the medina, Dar Hammamet serves authentic Tunisian home cooking in a beautifully tiled courtyard house. Signature dishes include brick à l'oeuf, couscous royal, and slow-cooked lamb with dried fruits. The menu changes with the season using produce from local farms. A genuine taste of Tunisian gastronomy away from the tourist circuit.",
    category: 'restaurant', distance: '1.4 km', priority_order: 20,
    ...c({ good_for_rainy: true, good_for_hot: false, activity_level: 'low', estimated_duration: '1.5 hours', transportation: 'Walking / Taxi', price_range: '20-40 TND/person', good_for_evening: true, good_for_afternoon: true, suitable_for_couples: true }),
  },
  {
    hotel_id: 'sindbad-hammamet',
    attraction_name: 'Marina Grill — Italian & Mediterranean',
    description: "A stylish restaurant at the edge of Yasmine Marina, with a covered terrace overlooking the yachts. The menu blends Italian favourites (wood-fired pizza, fresh pasta) with Tunisian-Mediterranean dishes. The burrata with local tomatoes and the sea bass in salt crust are standouts. Good wine selection and attentive service.",
    category: 'restaurant', distance: '2.4 km', priority_order: 16,
    ...c({ good_for_rainy: false, good_for_hot: false, activity_level: 'low', estimated_duration: '1.5 hours', transportation: 'Taxi', price_range: '35-70 TND/person', good_for_evening: true, suitable_for_couples: true, requires_booking: true }),
  },
  {
    hotel_id: 'sindbad-hammamet',
    attraction_name: 'Le Pêcheur — Local Lunch Spot',
    description: "A no-frills fish restaurant popular with locals and fishermen, serving the freshest catch of the day at honest prices. The menu is written on a blackboard and changes daily — typically grilled bream, fried calamari, or fish soup. Sit inside or at the simple pavement tables. BYOB and arrive hungry.",
    category: 'restaurant', distance: '800 m', priority_order: 21,
    ...c({ good_for_rainy: false, good_for_hot: false, activity_level: 'low', estimated_duration: '1 hour', transportation: 'Walking / Taxi', price_range: '12-25 TND/person', good_for_morning: false, good_for_evening: false }),
  },

  // ── CAFE ─────────────────────────────────────────────────────────────────
  {
    hotel_id: 'sindbad-hammamet',
    attraction_name: 'Café de la Plage — Beachfront',
    description: "A classic beach café right on the sand, shaded by palm-leaf umbrellas. Serves Tunisian mint tea poured from great heights, fresh orange juice, espresso, and simple snacks. Ideal for a morning coffee with your feet in the sand before the sun gets too intense. A laid-back favourite with a loyal local crowd.",
    category: 'cafe', distance: '400 m', priority_order: 28,
    ...c({ good_for_rainy: false, good_for_hot: true, activity_level: 'low', estimated_duration: '30-60 min', transportation: 'Walking', price_range: '3-8 TND', good_for_morning: true, good_for_afternoon: true, good_for_evening: false }),
  },
  {
    hotel_id: 'sindbad-hammamet',
    attraction_name: 'Café Sidi Bou Hadid — Historic',
    description: "Tucked into a corner of the old medina near the main gate, this atmospheric café has been serving locals for over a century. The interior is adorned with traditional blue and white tiles, antique lanterns, and framed calligraphy. Order a glass of mint tea with pine nuts — a quintessential Tunisian experience. Nargileh (hookah) available in the evenings.",
    category: 'cafe', distance: '1.3 km', priority_order: 20,
    ...c({ good_for_rainy: true, good_for_hot: false, activity_level: 'low', estimated_duration: '30-60 min', transportation: 'Walking / Taxi', price_range: '3-8 TND', good_for_morning: true, good_for_afternoon: true, good_for_evening: true }),
  },
  {
    hotel_id: 'sindbad-hammamet',
    attraction_name: 'Marina Coffee Lounge',
    description: "A modern café-lounge at Yasmine Marina with indoor and terrace seating overlooking the boats. Serves specialty coffee (Chemex, cold brew, flat white), fresh smoothies, and light bites including avocado toast and croissants. Reliable Wi-Fi and power sockets — popular with remote workers and digital nomads during the day.",
    category: 'cafe', distance: '2.3 km', priority_order: 15,
    ...c({ good_for_rainy: true, good_for_hot: false, activity_level: 'low', estimated_duration: '30-90 min', transportation: 'Taxi', price_range: '5-15 TND', good_for_morning: true, good_for_afternoon: true, good_for_evening: true, suitable_for_business: true }),
  },
  {
    hotel_id: 'sindbad-hammamet',
    attraction_name: 'Café El Hana — Traditional Courtyard',
    description: "A family-run traditional coffeehouse near the market area of central Hammamet, with tables arranged around a leafy inner courtyard. Known for its slow-poured Turkish coffee, fresh-squeezed lemon juice, and homemade makroudh pastries. A peaceful spot to escape the midday heat and watch the world drift by.",
    category: 'cafe', distance: '1.6 km', priority_order: 17,
    ...c({ good_for_rainy: true, good_for_hot: false, activity_level: 'low', estimated_duration: '30-60 min', transportation: 'Walking / Taxi', price_range: '2-6 TND', good_for_morning: true, good_for_afternoon: true, good_for_evening: false }),
  },


  // ═══════════════════════════════════════════════════════════════════════════
  // PARADISE BEACH HOTEL — Hammamet (36.41, 10.61)
  // Same area — distances slightly different
  // ═══════════════════════════════════════════════════════════════════════════

  { hotel_id: 'paradise-hammamet', attraction_name: 'Hammamet Medina', description: "One of Tunisia's best-preserved medinas, encircled by ancient walls with a maze of alleyways lined with whitewashed houses, artisan workshops, jasmine-draped doorways, and souvenir stalls.", category: 'cultural', distance: '1.5 km', priority_order: 19, ...c({ good_for_rainy: true, good_for_hot: false, activity_level: 'low', estimated_duration: '1-2 hours', transportation: 'Walking / Taxi', price_range: 'Free' }) },
  { hotel_id: 'paradise-hammamet', attraction_name: 'Hammamet Kasbah', description: 'A 15th-century sea fortress at the tip of the medina. Climb the watchtower for panoramic views of the Gulf of Hammamet. Small museum inside with regional artefacts.', category: 'cultural', distance: '1.5 km', priority_order: 18, ...c({ good_for_rainy: true, good_for_hot: false, activity_level: 'low', estimated_duration: '45 min', transportation: 'Walking / Taxi', price_range: '3 TND' }) },
  { hotel_id: 'paradise-hammamet', attraction_name: 'Dar Sebastien Villa & Garden', description: 'Early 20th-century villa designed by an apprentice of Frank Lloyd Wright, surrounded by lush Mediterranean gardens. Now the International Cultural Centre of Hammamet, hosting open-air shows in summer.', category: 'cultural', distance: '2.2 km', priority_order: 15, ...c({ good_for_rainy: false, good_for_hot: false, activity_level: 'low', estimated_duration: '1 hour', transportation: 'Taxi', price_range: '5 TND' }) },
  { hotel_id: 'paradise-hammamet', attraction_name: 'Pupput Roman Archaeological Site', description: 'Ruins of a flourishing Roman city (1st–5th century AD) with mosaic floors, thermal baths, and funerary stelae still visible in vivid colour. A quiet open-air site perfect for history enthusiasts.', category: 'cultural', distance: '2.1 km', priority_order: 16, ...c({ good_for_rainy: false, good_for_hot: false, activity_level: 'low', estimated_duration: '1-2 hours', transportation: 'Taxi', price_range: '8 TND' }) },

  { hotel_id: 'paradise-hammamet', attraction_name: 'Yasmine Beach Strip', description: 'The lively beach in front of the Yasmine complex, with beach clubs, jet ski rentals, banana boat rides, and a vibrant promenade excellent for an evening stroll.', category: 'nature', distance: '700 m', priority_order: 27, ...c({ good_for_rainy: false, good_for_hot: true, activity_level: 'moderate', estimated_duration: 'Half day', transportation: 'Walking', price_range: 'Free (activities extra)' }) },
  { hotel_id: 'paradise-hammamet', attraction_name: 'Hammamet Main Beach', description: 'Wide golden-sand beach with calm turquoise waters, sunbed hire, and beach bars serving fresh juice and grilled food. Ideal for swimming and early-morning walks.', category: 'nature', distance: '1.0 km', priority_order: 24, ...c({ good_for_rainy: false, good_for_hot: true, activity_level: 'low', estimated_duration: 'Half day', transportation: 'Walking', price_range: 'Free (sunbeds: 5 TND)' }) },
  { hotel_id: 'paradise-hammamet', attraction_name: 'Cap Bon Coastal Walk', description: 'A scenic coastal path northward along the Cap Bon peninsula through pine forests and fishing coves, with Mediterranean views and the scent of eucalyptus throughout.', category: 'nature', distance: '4.5 km', priority_order: 10, ...c({ good_for_rainy: false, good_for_hot: false, activity_level: 'moderate', estimated_duration: '2-3 hours', transportation: 'Taxi to start', price_range: 'Free' }) },
  { hotel_id: 'paradise-hammamet', attraction_name: 'Bouficha Botanical Forest', description: 'A vast pine forest with shaded walking and cycling trails, popular for picnics. Look out for flamingos near the lagoon edge. Peaceful and cool even in midsummer.', category: 'nature', distance: '12 km', priority_order: 7, ...c({ good_for_rainy: false, good_for_hot: false, activity_level: 'moderate', estimated_duration: '2-4 hours', transportation: 'Taxi', price_range: 'Free' }) },

  { hotel_id: 'paradise-hammamet', attraction_name: 'Aqua Palace Water Park', description: 'Over 30 slides and attractions including a giant wave pool, lazy river, kamikaze slides, and toddler splash zones. A full-day family destination in Yasmine Hammamet.', category: 'adventure', distance: '1.8 km', priority_order: 19, ...c({ good_for_rainy: false, good_for_hot: true, good_for_cool: false, activity_level: 'high', estimated_duration: 'Full day', transportation: 'Taxi', price_range: '35-65 TND', suitable_for_senior: false }) },
  { hotel_id: 'paradise-hammamet', attraction_name: 'Jet Ski & Water Sports Hammamet', description: 'Jet ski, parasailing, wakeboarding, and pedalo hire from multiple operators on Hammamet Beach. 20-minute jet ski sessions run along the coast. No experience needed.', category: 'adventure', distance: '900 m', priority_order: 22, ...c({ good_for_rainy: false, good_for_hot: true, good_for_cool: false, activity_level: 'high', estimated_duration: '1-2 hours', transportation: 'Walking / Taxi', price_range: '40-120 TND', suitable_for_senior: false }) },
  { hotel_id: 'paradise-hammamet', attraction_name: 'Quad Biking Cap Bon', description: 'Guided 2-hour quad bike tours through Cap Bon countryside — orange groves, coastal tracks, and Berber villages. Helmets and training provided. Departs 9h and 14h.', category: 'adventure', distance: '5 km', priority_order: 10, ...c({ good_for_rainy: false, good_for_hot: false, activity_level: 'high', estimated_duration: '2 hours', transportation: 'Taxi / shuttle', price_range: '60-90 TND', requires_booking: true, suitable_for_senior: false }) },
  { hotel_id: 'paradise-hammamet', attraction_name: 'Camel Riding at Sunset', description: 'A 30–45 minute sunset camel ride along the beach or dunes near Hammamet. Ideal for couples and families. Multiple operators near the south end of the main beach.', category: 'adventure', distance: '3.2 km', priority_order: 12, ...c({ good_for_rainy: false, good_for_hot: false, activity_level: 'low', estimated_duration: '45 min', transportation: 'Taxi', price_range: '20-35 TND', good_for_evening: true }) },

  { hotel_id: 'paradise-hammamet', attraction_name: 'Carthageland Theme Park', description: 'The largest theme park in North Africa: roller coasters, water slides, medieval village, pirate ship, and live shows. Plan 5-6 hours. Restaurant and snack kiosks throughout.', category: 'entertainment', distance: '900 m', priority_order: 23, ...c({ good_for_rainy: false, good_for_hot: false, activity_level: 'high', estimated_duration: 'Full day', transportation: 'Walking / Taxi', price_range: '40-80 TND' }) },
  { hotel_id: 'paradise-hammamet', attraction_name: 'Yasmine Hammamet Marina & Promenade', description: 'Luxury yachts and fishing boats moored side by side, with ice cream shops, souvenir boutiques, and terrace cafés lining the promenade. Street performers animate summer evenings.', category: 'entertainment', distance: '600 m', priority_order: 26, ...c({ good_for_rainy: false, good_for_hot: false, activity_level: 'low', estimated_duration: '1-2 hours', transportation: 'Walking', price_range: 'Free', good_for_evening: true }) },
  { hotel_id: 'paradise-hammamet', attraction_name: 'Mini Golf Yasmine Hammamet', description: '18-hole mini golf in Yasmine with Tunisian-themed obstacles. Open day and evening. A relaxed activity for couples and families. Club house serves drinks and snacks.', category: 'entertainment', distance: '700 m', priority_order: 24, ...c({ good_for_rainy: false, good_for_hot: false, activity_level: 'low', estimated_duration: '1 hour', transportation: 'Walking', price_range: '10-15 TND', good_for_evening: true }) },
  { hotel_id: 'paradise-hammamet', attraction_name: 'International Festival of Hammamet', description: 'Annual summer festival (July-August) at the open-air amphitheatre of Dar Sebastien featuring international musicians, theatre, and dance. Magical setting in the historic gardens.', category: 'entertainment', distance: '2.2 km', priority_order: 14, ...c({ good_for_rainy: false, good_for_hot: false, activity_level: 'low', estimated_duration: '3 hours', transportation: 'Taxi', price_range: '20-60 TND', requires_booking: true, good_for_evening: true, available_spring: false, available_winter: false, available_autumn: false }) },

  { hotel_id: 'paradise-hammamet', attraction_name: 'Yasmine Hammamet Boutique Strip', description: 'Open-air shopping street with brand clothing, jewellery, beachwear, and souvenir outlets. Fixed prices, air-conditioned stores, free alteration on purchases. Good for evening browsing.', category: 'shopping', distance: '600 m', priority_order: 25, ...c({ good_for_rainy: true, good_for_hot: false, activity_level: 'low', estimated_duration: '1-2 hours', transportation: 'Walking', price_range: 'Varies', good_for_evening: true, suitable_for_business: true }) },
  { hotel_id: 'paradise-hammamet', attraction_name: 'Hammamet Medina Souk', description: 'Inside the medina walls: hand-painted ceramics, leather sandals, silver jewellery, Berber carpets, and spice blends. Bargaining expected. Best explored before 11am.', category: 'shopping', distance: '1.5 km', priority_order: 18, ...c({ good_for_rainy: true, good_for_hot: false, activity_level: 'low', estimated_duration: '1-2 hours', transportation: 'Walking / Taxi', price_range: 'Varies', suitable_for_business: true }) },
  { hotel_id: 'paradise-hammamet', attraction_name: 'Nabeul Friday Pottery Market', description: 'Every Friday in Nabeul — the pottery capital of Tunisia — hundreds of stalls sell ceramics, mosaic tiles, terracotta pots, woven rugs, and olive wood at factory prices.', category: 'shopping', distance: '12.4 km', priority_order: 7, ...c({ good_for_rainy: false, good_for_hot: false, activity_level: 'low', estimated_duration: '2-3 hours', transportation: 'Taxi (25 min)', price_range: 'Free entry' }) },
  { hotel_id: 'paradise-hammamet', attraction_name: 'Centre Commercial Hammamet', description: 'Small mall with supermarket, pharmacy, clothing stores, electronics, and a fast food court. Practical for sunscreen, beach supplies, and local snacks. Air-conditioned and open daily.', category: 'shopping', distance: '2.0 km', priority_order: 16, ...c({ good_for_rainy: true, good_for_hot: false, activity_level: 'low', estimated_duration: '1 hour', transportation: 'Taxi', price_range: 'Varies', good_for_evening: true }) },

  { hotel_id: 'paradise-hammamet', attraction_name: 'La Baraka Restaurant — Seafront', description: 'Grilled fish and seafood platters on the Hammamet seafront, with wave views from the terrace. Arrive by 7pm or book ahead. Popular for the mixed grill with local salad.', category: 'restaurant', distance: '1.2 km', priority_order: 22, ...c({ good_for_rainy: false, good_for_hot: false, activity_level: 'low', estimated_duration: '1-2 hours', transportation: 'Walking / Taxi', price_range: '25-50 TND/person', good_for_evening: true, suitable_for_couples: true, requires_booking: true }) },
  { hotel_id: 'paradise-hammamet', attraction_name: 'Restaurant Dar Hammamet — Traditional', description: 'Authentic Tunisian home cooking in a tiled medina courtyard. Signature dishes: brick à l\'oeuf, couscous royal, slow-cooked lamb. Local farm produce, seasonal menu.', category: 'restaurant', distance: '1.5 km', priority_order: 20, ...c({ good_for_rainy: true, good_for_hot: false, activity_level: 'low', estimated_duration: '1.5 hours', transportation: 'Taxi', price_range: '20-40 TND/person', good_for_evening: true, suitable_for_couples: true }) },
  { hotel_id: 'paradise-hammamet', attraction_name: 'Marina Grill — Italian & Mediterranean', description: 'Stylish marina terrace restaurant serving wood-fired pizza, fresh pasta, and Tunisian-Mediterranean dishes. Standouts: burrata with local tomatoes, sea bass in salt crust. Good wine selection.', category: 'restaurant', distance: '700 m', priority_order: 24, ...c({ good_for_rainy: false, good_for_hot: false, activity_level: 'low', estimated_duration: '1.5 hours', transportation: 'Walking', price_range: '35-70 TND/person', good_for_evening: true, suitable_for_couples: true, requires_booking: true }) },
  { hotel_id: 'paradise-hammamet', attraction_name: 'Le Pêcheur — Local Lunch Spot', description: 'No-frills local fish restaurant with a daily blackboard menu — grilled bream, fried calamari, fish soup. Popular with fishermen and locals. Arrive hungry, no reservations taken.', category: 'restaurant', distance: '1.0 km', priority_order: 21, ...c({ good_for_rainy: false, good_for_hot: false, activity_level: 'low', estimated_duration: '1 hour', transportation: 'Walking / Taxi', price_range: '12-25 TND/person', good_for_morning: false, good_for_evening: false }) },

  { hotel_id: 'paradise-hammamet', attraction_name: 'Café de la Plage — Beachfront', description: 'Beach café on the sand under palm-leaf umbrellas. Tunisian mint tea poured from great heights, fresh orange juice, espresso. Ideal for a morning coffee with your feet in the sand.', category: 'cafe', distance: '600 m', priority_order: 26, ...c({ good_for_rainy: false, good_for_hot: true, activity_level: 'low', estimated_duration: '30-60 min', transportation: 'Walking', price_range: '3-8 TND', good_for_morning: true, good_for_afternoon: true, good_for_evening: false }) },
  { hotel_id: 'paradise-hammamet', attraction_name: 'Marina Coffee Lounge', description: 'Modern café-lounge at Yasmine Marina with specialty coffee (Chemex, cold brew, flat white), smoothies, avocado toast, and croissants. Reliable Wi-Fi and power sockets. Popular with remote workers.', category: 'cafe', distance: '600 m', priority_order: 25, ...c({ good_for_rainy: true, good_for_hot: false, activity_level: 'low', estimated_duration: '30-90 min', transportation: 'Walking', price_range: '5-15 TND', good_for_morning: true, good_for_afternoon: true, good_for_evening: true, suitable_for_business: true }) },
  { hotel_id: 'paradise-hammamet', attraction_name: 'Café Sidi Bou Hadid — Historic', description: 'Century-old medina café with blue and white tile décor, antique lanterns, and framed calligraphy. Order mint tea with pine nuts. Nargileh available in the evenings.', category: 'cafe', distance: '1.5 km', priority_order: 18, ...c({ good_for_rainy: true, good_for_hot: false, activity_level: 'low', estimated_duration: '30-60 min', transportation: 'Walking / Taxi', price_range: '3-8 TND', good_for_morning: true, good_for_afternoon: true, good_for_evening: true }) },
  { hotel_id: 'paradise-hammamet', attraction_name: 'Café El Hana — Traditional Courtyard', description: 'Family-run coffeehouse near the market with tables in a leafy inner courtyard. Slow-poured Turkish coffee, fresh lemon juice, and homemade makroudh pastries. Peaceful escape from the midday heat.', category: 'cafe', distance: '1.8 km', priority_order: 16, ...c({ good_for_rainy: true, good_for_hot: false, activity_level: 'low', estimated_duration: '30-60 min', transportation: 'Taxi', price_range: '2-6 TND', good_for_morning: true, good_for_afternoon: true, good_for_evening: false }) },


  // ═══════════════════════════════════════════════════════════════════════════
  // MÖVENPICK SOUSSE (35.83, 10.64)
  // ═══════════════════════════════════════════════════════════════════════════

  // ── CULTURAL ────────────────────────────────────────────────────────────
  {
    hotel_id: 'movenpick-sousse',
    attraction_name: 'Sousse Ribat',
    description: "One of the most completely preserved Islamic ribats in the world, built in 821 AD as a fortified monastery for warrior monks guarding the coast. Climb the circular watchtower for sweeping views over the medina rooftops and the sea. The interior contains beautiful arcaded prayer halls, a historic well, and a small museum of early Islamic artefacts.",
    category: 'cultural', distance: '200 m', priority_order: 40,
    ...c({ good_for_rainy: true, good_for_hot: false, activity_level: 'low', estimated_duration: '1 hour', transportation: 'Walking', price_range: '8 TND' }),
  },
  {
    hotel_id: 'movenpick-sousse',
    attraction_name: 'Sousse Medina (UNESCO)',
    description: "A UNESCO World Heritage Site, the 9th-century medina of Sousse is one of the best-preserved in the Arab world. Wander through its labyrinthine souks selling handmade carpets, leather goods, spices, silver jewellery, and fresh produce. The Great Mosque (founded 851 AD) and the catacombs beneath the city are particularly remarkable. The medina is most vibrant on weekend mornings.",
    category: 'cultural', distance: '300 m', priority_order: 38,
    ...c({ good_for_rainy: true, good_for_hot: false, activity_level: 'low', estimated_duration: '2-3 hours', transportation: 'Walking', price_range: 'Free (medina), 8 TND (monuments)' }),
  },
  {
    hotel_id: 'movenpick-sousse',
    attraction_name: 'Museum of Sousse (Kasbah)',
    description: "Housed inside the imposing kasbah that crowns the medina, this museum contains one of the finest collections of Roman mosaics outside the Bardo in Tunis. The floors of Roman villas, hunting scenes, and mythological tableaux are displayed in beautifully lit halls. Also features Punic stelae, early Christian mosaics, and Byzantine treasures. Allow at least 90 minutes.",
    category: 'cultural', distance: '400 m', priority_order: 36,
    ...c({ good_for_rainy: true, good_for_hot: false, activity_level: 'low', estimated_duration: '1.5 hours', transportation: 'Walking', price_range: '8 TND' }),
  },
  {
    hotel_id: 'movenpick-sousse',
    attraction_name: 'Great Mosque of Sousse',
    description: "Founded in 851 AD during the Aghlabid dynasty, this mosque is one of the oldest in Tunisia. Its exterior walls of pale limestone give it a fortress-like appearance. Non-Muslim visitors may enter the courtyard and admire the architecture from outside. The interior is reserved for worship but the exterior view at golden hour is magnificent.",
    category: 'cultural', distance: '350 m', priority_order: 37,
    ...c({ good_for_rainy: false, good_for_hot: false, activity_level: 'low', estimated_duration: '30 min', transportation: 'Walking', price_range: 'Free' }),
  },

  // ── NATURE ──────────────────────────────────────────────────────────────
  {
    hotel_id: 'movenpick-sousse',
    attraction_name: 'Boujaffar Beach',
    description: "The main city beach of Sousse, a long strip of fine white sand running northward from the medina walls. The water is calm and the beach is well maintained with sunbed hire, pedalo rental, and several beach cafés. It is within walking distance of the hotel and is excellent for an early-morning swim before the beach fills up.",
    category: 'nature', distance: '500 m', priority_order: 32,
    ...c({ good_for_rainy: false, good_for_hot: true, activity_level: 'low', estimated_duration: 'Half day', transportation: 'Walking', price_range: 'Free (sunbeds: 5 TND)' }),
  },
  {
    hotel_id: 'movenpick-sousse',
    attraction_name: 'Sousse Corniche Promenade',
    description: "A 3-kilometre palm-lined seafront promenade stretching from the medina northward past hotels and resort beaches. It is the social heart of Sousse in the evening, with families, cyclists, and strollers filling the path at dusk. The views of the sea and the illuminated medina walls at night are particularly beautiful.",
    category: 'nature', distance: '300 m', priority_order: 35,
    ...c({ good_for_rainy: false, good_for_hot: false, activity_level: 'low', estimated_duration: '1-2 hours', transportation: 'Walking', price_range: 'Free', good_for_evening: true }),
  },
  {
    hotel_id: 'movenpick-sousse',
    attraction_name: 'Port El Kantaoui Beach & Marina',
    description: "A purpose-built marina resort 8 km north of Sousse, set around a picturesque yacht harbour. The beach here is quieter and cleaner than the city beach, backed by pine trees. The marina has excellent seafood restaurants, a watersports centre, and a scenic jetty walk. The 18-hole golf course is open to visitors.",
    category: 'nature', distance: '8.2 km', priority_order: 14,
    ...c({ good_for_rainy: false, good_for_hot: false, activity_level: 'low', estimated_duration: 'Half day', transportation: 'Taxi (15 min)', price_range: 'Free (beach)', suitable_for_couples: true }),
  },
  {
    hotel_id: 'movenpick-sousse',
    attraction_name: 'El Abassia Beach',
    description: "A quieter stretch of beach south of the Sousse city centre, away from the tourist hotels. The water is calm and the beach is rarely crowded even in peak season. Popular with local families on weekends. Accessible via a short taxi ride or a pleasant 20-minute walk along the coast road.",
    category: 'nature', distance: '1.5 km', priority_order: 26,
    ...c({ good_for_rainy: false, good_for_hot: true, activity_level: 'low', estimated_duration: 'Half day', transportation: 'Walking / Taxi', price_range: 'Free' }),
  },

  // ── ADVENTURE ───────────────────────────────────────────────────────────
  {
    hotel_id: 'movenpick-sousse',
    attraction_name: 'Aquapark Boujaafar',
    description: "A large water park on the Sousse seafront, with slides, a wave pool, lazy river, and a dedicated kids' zone. Open from June to September, it is conveniently located near the hotel. Combination tickets with the adjacent beach club are available at the entrance. Lockers and sun lounger hire included in the entry price.",
    category: 'adventure', distance: '1.2 km', priority_order: 25,
    ...c({ good_for_rainy: false, good_for_hot: true, good_for_cool: false, activity_level: 'high', estimated_duration: 'Full day', transportation: 'Walking / Taxi', price_range: '25-50 TND', suitable_for_senior: false }),
  },
  {
    hotel_id: 'movenpick-sousse',
    attraction_name: 'Water Sports Centre — Sousse Beach',
    description: "Jet ski, pedalo, banana boat, and windsurfing rental from operators based on Boujaffar Beach. Qualified instructors are on hand for first-timers. Sessions last 20 to 30 minutes and the views of the medina from the water are spectacular. Prices are posted on boards at each station and are negotiable out of peak season.",
    category: 'adventure', distance: '600 m', priority_order: 29,
    ...c({ good_for_rainy: false, good_for_hot: true, good_for_cool: false, activity_level: 'high', estimated_duration: '1-2 hours', transportation: 'Walking', price_range: '30-100 TND', suitable_for_senior: false }),
  },
  {
    hotel_id: 'movenpick-sousse',
    attraction_name: 'Friguia Safari Park',
    description: "A 90-hectare safari and wildlife park 35 km north of Sousse, home to African animals including lions, elephants, giraffes, zebras, and cheetahs. Guided open-top Jeep safaris run at 10h and 15h. The park also has a reptile house, a small amusement park, and a lakeside picnic area. A full-day family excursion.",
    category: 'adventure', distance: '35 km', priority_order: 6,
    ...c({ good_for_rainy: false, good_for_hot: false, activity_level: 'moderate', estimated_duration: 'Full day', transportation: 'Taxi / Hotel shuttle (45 min)', price_range: '35-60 TND', requires_booking: false }),
  },
  {
    hotel_id: 'movenpick-sousse',
    attraction_name: 'Horse Riding El Kantaoui',
    description: "Guided horse riding sessions on the beach and coastal trails at Port El Kantaoui. Suitable for beginners and experienced riders alike — lessons for children are available. Sunset rides are particularly popular with couples. Bookable at the El Kantaoui equestrian centre or via the hotel concierge.",
    category: 'adventure', distance: '9 km', priority_order: 11,
    ...c({ good_for_rainy: false, good_for_hot: false, activity_level: 'moderate', estimated_duration: '1-2 hours', transportation: 'Taxi', price_range: '40-80 TND', requires_booking: true, good_for_evening: true }),
  },

  // ── ENTERTAINMENT ────────────────────────────────────────────────────────
  {
    hotel_id: 'movenpick-sousse',
    attraction_name: 'Port El Kantaoui Marina & Promenade',
    description: "The liveliest evening destination near Sousse: a beautifully designed Andalusian-style marina complex with luxury boutiques, open-air restaurants, terrace bars, and live music in summer. The harbour promenade is illuminated at night and the atmosphere is excellent for a post-dinner stroll. The replica pirate ship moored in the harbour is a popular photo spot.",
    category: 'entertainment', distance: '8.2 km', priority_order: 13,
    ...c({ good_for_rainy: false, good_for_hot: false, activity_level: 'low', estimated_duration: '2-3 hours', transportation: 'Taxi (15 min)', price_range: 'Free', good_for_evening: true }),
  },
  {
    hotel_id: 'movenpick-sousse',
    attraction_name: 'Hannibal Casino Sousse',
    description: "The main casino of Sousse, located on the seafront, open daily from 8pm. Features a full range of slot machines, roulette, blackjack, and poker tables. Smart casual dress code applies. The ground-floor bar and lounge area is open to non-gamblers and serves cocktails, wine, and light snacks in a lively atmosphere.",
    category: 'entertainment', distance: '1.0 km', priority_order: 22,
    ...c({ good_for_rainy: true, good_for_hot: false, activity_level: 'low', estimated_duration: '2-4 hours', transportation: 'Walking', price_range: 'Free entry (gambling budget varies)', good_for_evening: true, good_for_morning: false, good_for_afternoon: false, suitable_for_families: false }),
  },
  {
    hotel_id: 'movenpick-sousse',
    attraction_name: 'Théâtre Municipal de Sousse',
    description: "A beautifully restored late 19th-century theatre near the medina, hosting plays, concerts, and cultural events throughout the year. The programme leans toward Tunisian and North African productions, with occasional international touring shows. Tickets are inexpensive and the ornate interior with painted ceiling is worth seeing in itself.",
    category: 'entertainment', distance: '600 m', priority_order: 27,
    ...c({ good_for_rainy: true, good_for_hot: false, activity_level: 'low', estimated_duration: '2 hours', transportation: 'Walking', price_range: '5-20 TND', requires_booking: true, good_for_evening: true, good_for_morning: false, good_for_afternoon: false }),
  },
  {
    hotel_id: 'movenpick-sousse',
    attraction_name: 'Medhia Shooting Club & Paintball',
    description: "An outdoor leisure complex on the outskirts of Sousse offering paintball, archery, and clay pigeon shooting. Popular for group outings and stag parties. Half-day packages include equipment, safety briefing, and refreshments. Transfers from Sousse hotels can be arranged.",
    category: 'entertainment', distance: '10 km', priority_order: 9,
    ...c({ good_for_rainy: false, good_for_hot: false, activity_level: 'high', estimated_duration: '2-3 hours', transportation: 'Taxi', price_range: '30-70 TND', requires_booking: true, suitable_for_senior: false }),
  },

  // ── SHOPPING ─────────────────────────────────────────────────────────────
  {
    hotel_id: 'movenpick-sousse',
    attraction_name: 'City Mall Sousse',
    description: "The largest shopping mall in the Sousse region, located on the Route de Tunis north of the city. Houses over 80 stores including Zara, Mango, Adidas, LC Waikiki, a large Géant hypermarket, a multiplex cinema, and a food court with international and Tunisian fast food. Air-conditioned and open daily from 9h to 22h. Taxis available at the entrance.",
    category: 'shopping', distance: '4.5 km', priority_order: 16,
    ...c({ good_for_rainy: true, good_for_hot: false, activity_level: 'low', estimated_duration: '2-4 hours', transportation: 'Taxi (10 min)', price_range: 'Varies', good_for_evening: true, suitable_for_business: true }),
  },
  {
    hotel_id: 'movenpick-sousse',
    attraction_name: 'Sousse Medina Souk',
    description: "One of the most authentic covered markets in Tunisia. The souk winds through the medina selling handmade carpets, Berber jewellery, locally produced olive oil soaps, embroidered fabrics, and traditional pottery. The carpet merchants are particularly well-stocked. Haggling is standard practice and prices start low. Best visited in the morning.",
    category: 'shopping', distance: '400 m', priority_order: 34,
    ...c({ good_for_rainy: true, good_for_hot: false, activity_level: 'low', estimated_duration: '1-2 hours', transportation: 'Walking', price_range: 'Varies', suitable_for_business: true }),
  },
  {
    hotel_id: 'movenpick-sousse',
    attraction_name: 'Marché Central de Sousse',
    description: "The covered central market of Sousse, a sensory highlight of any visit. Stalls overflow with seasonal fruit and vegetables, local cheeses, dried figs and dates, harissa paste, preserved lemons, spices, and fresh fish delivered daily from the port. A lively slice of everyday Tunisian life. Open from sunrise to early afternoon every day except Sunday.",
    category: 'shopping', distance: '700 m', priority_order: 28,
    ...c({ good_for_rainy: true, good_for_hot: false, activity_level: 'low', estimated_duration: '45 min', transportation: 'Walking', price_range: 'Varies', good_for_morning: true, good_for_afternoon: false, good_for_evening: false }),
  },
  {
    hotel_id: 'movenpick-sousse',
    attraction_name: 'El Kantaoui Boutique Shops',
    description: "The marina complex at Port El Kantaoui houses a collection of upscale boutiques selling resort wear, Tunisian handicrafts, silver jewellery, and ceramics. Prices are higher than the medina but quality is generally guaranteed and no bargaining is required. Several shops specialise in handmade leather goods from Sfax.",
    category: 'shopping', distance: '8.5 km', priority_order: 12,
    ...c({ good_for_rainy: false, good_for_hot: false, activity_level: 'low', estimated_duration: '1-2 hours', transportation: 'Taxi (15 min)', price_range: 'Varies', good_for_evening: true, suitable_for_business: true }),
  },

  // ── RESTAURANT ───────────────────────────────────────────────────────────
  {
    hotel_id: 'movenpick-sousse',
    attraction_name: 'Restaurant Le Lido — Seafront Terrace',
    description: "Sousse's most iconic seafront restaurant, with a wide terrace suspended over the sea. Specialises in grilled fish and Tunisian mixed seafood platters. The fish soup is celebrated throughout the city. Arrives fresh from the port each morning. Book the railing tables for sunset — they fill by 7pm in summer. Smart casual dress recommended.",
    category: 'restaurant', distance: '800 m', priority_order: 27,
    ...c({ good_for_rainy: false, good_for_hot: false, activity_level: 'low', estimated_duration: '1.5 hours', transportation: 'Walking / Taxi', price_range: '30-60 TND/person', good_for_evening: true, suitable_for_couples: true, requires_booking: true }),
  },
  {
    hotel_id: 'movenpick-sousse',
    attraction_name: 'Restaurant Emna — Traditional Tunisian',
    description: "A beloved neighbourhood restaurant inside the medina walls, famous for slow-cooked Tunisian home dishes unavailable in tourist restaurants. Specialities include ojja merguez, kamounia (veal with cumin), and the house couscous with seven vegetables. Small dining room, no alcohol, generous portions at exceptional value. Arrive before 12h30 or 7pm to get a table.",
    category: 'restaurant', distance: '500 m', priority_order: 32,
    ...c({ good_for_rainy: true, good_for_hot: false, activity_level: 'low', estimated_duration: '1 hour', transportation: 'Walking', price_range: '8-18 TND/person', good_for_afternoon: false, good_for_evening: true }),
  },
  {
    hotel_id: 'movenpick-sousse',
    attraction_name: 'La Sirène Restaurant — Port El Kantaoui',
    description: "An upscale restaurant on the El Kantaoui marina waterfront, with panoramic views of the yachts. The menu is broad: fresh lobster thermidor, seafood linguine, Tunisian-style branzino, and an excellent wine list featuring local Mornag and Coteaux d'Utique labels. A special-occasion destination that consistently earns strong reviews.",
    category: 'restaurant', distance: '8.5 km', priority_order: 11,
    ...c({ good_for_rainy: false, good_for_hot: false, activity_level: 'low', estimated_duration: '2 hours', transportation: 'Taxi (15 min)', price_range: '50-100 TND/person', good_for_evening: true, suitable_for_couples: true, requires_booking: true }),
  },
  {
    hotel_id: 'movenpick-sousse',
    attraction_name: 'Snack Bab El Gharbi — Local Lunch',
    description: "A legendary street-food stall just outside the medina gate, serving the best ftira (flatbread sandwich) in Sousse since 1978. Stuffed with tuna, harissa, olives, capers, and preserved lemon, it is the unofficial local lunch of the medina. Open from 7am until sold out, typically around 2pm. Queue is long on Fridays but always worth the wait.",
    category: 'restaurant', distance: '350 m', priority_order: 35,
    ...c({ good_for_rainy: false, good_for_hot: false, activity_level: 'low', estimated_duration: '20 min', transportation: 'Walking', price_range: '2-5 TND/person', good_for_morning: true, good_for_afternoon: false, good_for_evening: false }),
  },

  // ── CAFE ─────────────────────────────────────────────────────────────────
  {
    hotel_id: 'movenpick-sousse',
    attraction_name: 'Café Corniche — Seafront Terrace',
    description: "The most popular café on the Sousse corniche, with a large shaded terrace overlooking the sea. Serves mint tea, fresh juices, Turkish coffee, and milkshakes. The terrace fills with locals at sunset and remains lively until midnight in summer. The perfect spot to watch the sun set over the Gulf of Hammamet with a glass of cold citronade.",
    category: 'cafe', distance: '400 m', priority_order: 34,
    ...c({ good_for_rainy: false, good_for_hot: false, activity_level: 'low', estimated_duration: '30-60 min', transportation: 'Walking', price_range: '3-8 TND', good_for_morning: true, good_for_afternoon: true, good_for_evening: true }),
  },
  {
    hotel_id: 'movenpick-sousse',
    attraction_name: 'Café du Ribat — Historic Setting',
    description: "A small traditional café in the shadow of the Ribat fortress walls, serving strong Turkish coffee and sweet pastries to locals and tourists alike since the 1960s. The interior is simple but the terrace offers a unique view of the medina fortifications. Unhurried, inexpensive, and perfectly placed for a post-museum coffee.",
    category: 'cafe', distance: '200 m', priority_order: 38,
    ...c({ good_for_rainy: false, good_for_hot: false, activity_level: 'low', estimated_duration: '30 min', transportation: 'Walking', price_range: '2-5 TND', good_for_morning: true, good_for_afternoon: true, good_for_evening: false }),
  },
  {
    hotel_id: 'movenpick-sousse',
    attraction_name: 'Costa Coffee — City Mall',
    description: "The Costa Coffee outlet inside City Mall Sousse — a welcome familiar face for travellers craving a consistent flat white or cappuccino during a shopping trip. Full menu including frappuccinos, hot chocolate, and a selection of pastries and sandwiches. Free Wi-Fi and comfortable seating inside the air-conditioned mall.",
    category: 'cafe', distance: '4.5 km', priority_order: 14,
    ...c({ good_for_rainy: true, good_for_hot: false, activity_level: 'low', estimated_duration: '30-60 min', transportation: 'Taxi (10 min)', price_range: '5-12 TND', good_for_morning: true, good_for_afternoon: true, good_for_evening: true, suitable_for_business: true }),
  },
  {
    hotel_id: 'movenpick-sousse',
    attraction_name: 'Café Médinea — Traditional Courtyard',
    description: "Hidden inside the medina down a narrow alley near the Great Mosque, this courtyard café is one of Sousse's best-kept secrets. The courtyard is shaded by a grapevine and feels worlds away from the tourist route. Order the house specialty: a glass of ghroiba (almond shortbread) with rose water tea. Nargileh available. Cash only.",
    category: 'cafe', distance: '450 m', priority_order: 32,
    ...c({ good_for_rainy: true, good_for_hot: false, activity_level: 'low', estimated_duration: '30-60 min', transportation: 'Walking', price_range: '3-8 TND', good_for_morning: true, good_for_afternoon: true, good_for_evening: true }),
  },
]

// ─── Insert ──────────────────────────────────────────────────────────────────

async function run() {
  const client = await pool.connect()
  try {
    const targets = TARGET_HOTEL
      ? ATTRACTIONS.filter(a => a.hotel_id === TARGET_HOTEL)
      : ATTRACTIONS

    if (targets.length === 0) {
      console.error(`No data found for hotel_id: "${TARGET_HOTEL}"`)
      console.log('Available hotel_ids:', [...new Set(ATTRACTIONS.map(a => a.hotel_id))].join(', '))
      process.exit(1)
    }

    const hotelIds = [...new Set(targets.map(a => a.hotel_id))]

    // ── 1. Clear existing attractions for affected hotels ────────────────
    console.log('\n🗑️  Clearing existing attractions...')
    for (const hid of hotelIds) {
      const del = await client.query(
        'DELETE FROM nearby_attractions WHERE hotel_id = $1', [hid]
      )
      console.log(`   ${hid}: ${del.rowCount} rows deleted`)
    }

    // ── 2. Insert fresh data ─────────────────────────────────────────────
    console.log('\n📍 Inserting curated attractions...')
    let inserted = 0

    for (const a of targets) {
      await client.query(`
        INSERT INTO nearby_attractions (
          hotel_id, attraction_name, description, category, distance,
          estimated_duration, price_range, transportation
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        ON CONFLICT (hotel_id, attraction_name) DO UPDATE SET
          description        = EXCLUDED.description,
          category           = EXCLUDED.category,
          distance           = EXCLUDED.distance,
          estimated_duration = EXCLUDED.estimated_duration,
          price_range        = EXCLUDED.price_range,
          transportation     = EXCLUDED.transportation,
          updated_at         = NOW()
      `, [
        a.hotel_id, a.attraction_name, a.description, a.category, a.distance,
        a.estimated_duration, a.price_range, a.transportation,
      ])
      console.log(`  ✅ [${a.hotel_id.padEnd(20)}] [${a.category.padEnd(13)}] ${a.attraction_name}`)
      inserted++
    }

    // ── 3. Summary ────────────────────────────────────────────────────────
    console.log(`\n🎉 Done! ${inserted} attractions inserted.`)
    console.log('\n📊 Breakdown:')
    for (const hid of hotelIds) {
      const hAttractions = targets.filter(a => a.hotel_id === hid)
      const byCategory = hAttractions.reduce((acc, a) => {
        acc[a.category] = (acc[a.category] || 0) + 1
        return acc
      }, {})
      console.log(`\n   ${hid}:`)
      Object.entries(byCategory).sort().forEach(([cat, count]) =>
        console.log(`     ${cat.padEnd(15)} ${count} attractions`)
      )
    }

  } finally {
    client.release()
    await pool.end()
  }
}

run().catch(err => { console.error('Fatal:', err.message); process.exit(1) })
