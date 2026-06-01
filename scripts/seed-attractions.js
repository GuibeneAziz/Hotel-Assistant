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
    image_url: null,
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
    ...c({ good_for_rainy: true, good_for_hot: false, activity_level: 'low', estimated_duration: '1-2 hours', transportation: 'Walking / Taxi', image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/da/Hammamet_Medina_Gate.jpg/800px-Hammamet_Medina_Gate.jpg' }),
  },
  {
    hotel_id: 'sindbad-hammamet',
    attraction_name: 'Hammamet Kasbah',
    description: "A 15th-century fortress perched at the tip of the medina, overlooking the sea on two sides. Climb to the rooftop for some of the most stunning panoramic views along the Tunisian coast. The interior houses a small archaeological display with coins, ceramics, and historical documents from the region.",
    category: 'cultural', distance: '1.3 km', priority_order: 19,
    ...c({ good_for_rainy: true, good_for_hot: false, activity_level: 'low', estimated_duration: '45 min', transportation: 'Walking / Taxi', price_range: '3 TND', image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/Kasbah_Hammamet.jpg/800px-Kasbah_Hammamet.jpg' }),
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
    ...c({ good_for_rainy: false, good_for_hot: true, activity_level: 'low', estimated_duration: 'Half day', transportation: 'Walking', price_range: 'Free (sunbeds: 5 TND)', image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/98/Hammamet_beach_Tunisia.jpg/800px-Hammamet_beach_Tunisia.jpg' }),
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
    ...c({ good_for_rainy: false, good_for_hot: true, good_for_cool: false, activity_level: 'high', estimated_duration: 'Full day', transportation: 'Taxi', price_range: '35-65 TND', requires_booking: false, suitable_for_senior: false, image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/28/Aqua_Palace_Hammamet.jpg/800px-Aqua_Palace_Hammamet.jpg' }),
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
  // VILLA DIDON — Byrsa Hill, Carthage (36.853, 10.327)
  // ═══════════════════════════════════════════════════════════════════════════

  // ── CULTURAL ────────────────────────────────────────────────────────────
  { hotel_id: 'villa-didon-carthage', attraction_name: 'Carthage Archaeological Site (UNESCO)', description: "Walk among the ruins of one of the ancient world's greatest cities. The site covers multiple zones: Byrsa Hill (where Villa Didon sits), the Antonine Baths (largest Roman baths outside Rome), Punic ports, Tophet sanctuary, and the Roman theatre. Extraordinary context for history lovers.", category: 'cultural', distance: '200 m – 2 km', ...c({ estimated_duration: '3-4 hours', price_range: '12 TND', transportation: 'Walking from hotel', image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Carthage_-_Amphitheatre.jpg/800px-Carthage_-_Amphitheatre.jpg' }) },
  { hotel_id: 'villa-didon-carthage', attraction_name: 'Antonine Baths of Carthage', description: "The third-largest Roman baths complex in the ancient world, built under Emperor Antoninus Pius (138-161 AD). Monumental columns rise from the seafront site, offering dramatic views of the Gulf of Tunis. An audio guide (available in French and English) brings the ruins to life.", category: 'cultural', distance: '1.2 km', ...c({ estimated_duration: '1.5 hours', price_range: '8 TND', transportation: 'Walking / Taxi', image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Antonine_Baths_Carthage_Tunisia.jpg/800px-Antonine_Baths_Carthage_Tunisia.jpg' }) },
  { hotel_id: 'villa-didon-carthage', attraction_name: 'Bardo National Museum', description: "Home to the world's largest collection of ancient Roman mosaics, housed in a magnificent 19th-century palace. The Virgil mosaic, Ulysses and the Sirens, and the diving scenes from the Gulf are among the most celebrated works. Allow at least 2 hours to appreciate the scale.", category: 'cultural', distance: '9.5 km', ...c({ estimated_duration: '2.5 hours', price_range: '11 TND', transportation: 'Taxi (20 min)', image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Bardo_National_Museum_Tunis.jpg/800px-Bardo_National_Museum_Tunis.jpg' }) },
  { hotel_id: 'villa-didon-carthage', attraction_name: 'Sidi Bou Said Village', description: "Perched on a clifftop above the Bay of Tunis, this iconic blue-and-white village is one of North Africa's most photographed spots. Narrow cobbled streets, bougainvillea-draped walls, art galleries, and the legendary Café des Nattes for a tea with pine nuts. Visit at dusk for the best light.", category: 'cultural', distance: '3.5 km', ...c({ estimated_duration: '2-3 hours', price_range: 'Free', transportation: 'Taxi (10 min) / TGM train', image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Sidi_bou_said_blue_doors.jpg/800px-Sidi_bou_said_blue_doors.jpg' }) },
  { hotel_id: 'villa-didon-carthage', attraction_name: 'Tunis Medina (UNESCO)', description: "Founded in the 7th century and listed as a UNESCO World Heritage Site, the old medina contains over 700 monuments including the Great Mosque of Zitouna (9th century), the souk des Chéchias, and hundreds of artisan workshops. A labyrinthine experience unlike any other in North Africa.", category: 'cultural', distance: '12 km', ...c({ estimated_duration: '3-4 hours', price_range: 'Free', transportation: 'Taxi (25 min) / TGM + Metro', image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Tunis_medina_mosque_zitouna.jpg/800px-Tunis_medina_mosque_zitouna.jpg' }) },
  { hotel_id: 'villa-didon-carthage', attraction_name: 'Carthage Museum (Byrsa Hill)', description: "Situated directly next to Villa Didon on Byrsa Hill, this compact but rich museum displays Punic sarcophagi, carved stelae, pottery, jewellery, and models of ancient Carthage. The rooftop terrace affords the best panoramic view of the entire Carthage archaeological zone.", category: 'cultural', distance: '150 m', ...c({ estimated_duration: '1 hour', price_range: '8 TND', transportation: 'Walking', image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d8/Byrsa_Hill_Carthage.jpg/800px-Byrsa_Hill_Carthage.jpg' }) },

  // ── NATURE ──────────────────────────────────────────────────────────────
  { hotel_id: 'villa-didon-carthage', attraction_name: 'La Marsa Beach', description: "The most popular beach among Tunis residents — wide golden sand, clean water, and a lively promenade lined with cafés and ice cream shops. The weekly market in La Marsa town on Sunday mornings is a bonus. Easily reached by the TGM suburban train from Carthage station.", category: 'nature', distance: '5 km', ...c({ estimated_duration: 'Half day', price_range: 'Free', transportation: 'TGM train (10 min) / Taxi', image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/La_Marsa_beach_Tunisia.jpg/800px-La_Marsa_beach_Tunisia.jpg' }) },
  { hotel_id: 'villa-didon-carthage', attraction_name: 'Gammarth Beach & Cliffs', description: "A long sandy beach with clear Mediterranean water backed by dramatic white cliffs north of Tunis. Quieter than La Marsa with several upscale beach clubs. The coastal road drive from Sidi Bou Said to Gammarth is one of the most scenic in Tunisia.", category: 'nature', distance: '8 km', ...c({ estimated_duration: 'Half day', price_range: 'Free', transportation: 'Taxi (15 min)' }) },
  { hotel_id: 'villa-didon-carthage', attraction_name: 'Lac de Tunis (North Lake)', description: "A large coastal lagoon between Tunis and La Goulette, popular with cyclists and joggers along its promenade. Flamingos and herons are frequently spotted along the shores. The lakeside restaurants on the La Goulette side are excellent for grilled fish at lunchtime.", category: 'nature', distance: '3 km', ...c({ estimated_duration: '1-2 hours', price_range: 'Free', transportation: 'Taxi (8 min)' }) },
  { hotel_id: 'villa-didon-carthage', attraction_name: 'Cap Carthage Coastal Walk', description: "A scenic walk along the Carthage peninsula shoreline between the Punic ports and Salammbo. The path passes ancient ruins, fishing boats, and rocky coves. Best in the early morning or late afternoon for photographs of the ruins reflected in the sea.", category: 'nature', distance: '1-3 km', ...c({ estimated_duration: '1.5 hours', price_range: 'Free', transportation: 'Walking from hotel' }) },

  // ── ADVENTURE ───────────────────────────────────────────────────────────
  { hotel_id: 'villa-didon-carthage', attraction_name: 'Gulf of Tunis Sailing Trip', description: "Day sailing excursion on the Gulf of Tunis departing from La Goulette marina. The route passes the Carthage coastline, with a swim stop in a clear cove and a light seafood lunch on board. Suitable for beginners; max 10 passengers. Book through the hotel concierge.", category: 'adventure', distance: '3 km', ...c({ estimated_duration: 'Full day', price_range: '80-140 TND', transportation: 'Taxi to La Goulette (10 min)' }) },
  { hotel_id: 'villa-didon-carthage', attraction_name: 'Kayaking at Salammbo', description: "Sea kayaking along the Carthage coastline from Salammbo harbour. Guided 2-hour tours paddle past the Punic ports and ancient ruins from the water — a unique perspective on the archaeological site. Rentals also available for experienced paddlers.", category: 'adventure', distance: '2 km', ...c({ estimated_duration: '2 hours', price_range: '35-55 TND', transportation: 'Taxi (5 min)' }) },
  { hotel_id: 'villa-didon-carthage', attraction_name: 'TGM Train Day Trip to Bizerte', description: "Take the suburban TGM train from Carthage Hannibal station northward for a day trip to Bizerte — Tunisia's northernmost city with a beautiful medina, old port, and Spain-facing beach. A local experience far from the tourist circuit.", category: 'adventure', distance: '65 km', ...c({ estimated_duration: 'Full day', price_range: '8-12 TND', transportation: 'TGM + regional train' }) },

  // ── ENTERTAINMENT ────────────────────────────────────────────────────────
  { hotel_id: 'villa-didon-carthage', attraction_name: 'Carthage International Festival', description: "Held every July and August in the Roman amphitheatre of Carthage, this prestigious festival hosts world-class musicians, Tunisian pop stars, classical orchestras, and theatre troupes. The ancient stone setting under the stars makes every performance unforgettable.", category: 'entertainment', distance: '1.5 km', ...c({ estimated_duration: '3 hours', price_range: '30-100 TND', transportation: 'Taxi (5 min)' }) },
  { hotel_id: 'villa-didon-carthage', attraction_name: 'La Goulette Seafood Strip', description: "La Goulette is the port suburb of Tunis, famous for its kilometre-long strip of seafood restaurants. The fish market sells the morning catch directly to restaurants — order the mixed fried seafood platter with local salad and local wine. Lively atmosphere, especially on Friday nights.", category: 'entertainment', distance: '4.5 km', ...c({ estimated_duration: '2 hours', price_range: '25-60 TND/person', transportation: 'Taxi (10 min)' }) },
  { hotel_id: 'villa-didon-carthage', attraction_name: 'Avenue Habib Bourguiba — Evening Stroll', description: "The tree-lined grand boulevard of Tunis, modelled on the Champs-Élysées. At night the avenue comes alive with cafés, street musicians, flower sellers, and families. The Place de l'Indépendance at its eastern end and the famous Clock Tower are perfect photo stops.", category: 'entertainment', distance: '13 km', ...c({ estimated_duration: '1-2 hours', price_range: 'Free', transportation: 'Taxi (25 min)' }) },
  { hotel_id: 'villa-didon-carthage', attraction_name: 'Sidi Bou Said Café des Nattes', description: "Tunisia's most famous café — a whitewashed terrace overlooking the cliffs of Sidi Bou Said. Order the traditional kaaket (anise biscuits) with pine nut tea and stay for sunset. The café was frequented by Paul Klee, Simone de Beauvoir, and André Gide.", category: 'entertainment', distance: '3.5 km', ...c({ estimated_duration: '1 hour', price_range: '5-12 TND', transportation: 'Taxi (10 min)', image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Cafe_des_nattes_sidi_bou_said.jpg/800px-Cafe_des_nattes_sidi_bou_said.jpg' }) },

  // ── SHOPPING ─────────────────────────────────────────────────────────────
  { hotel_id: 'villa-didon-carthage', attraction_name: 'Tunis Medina Souk', description: "The covered souks of the Tunis Medina are among the finest in North Africa. The Souk des Chéchias (traditional red hats), Souk El Attarine (perfumes and spices), and Souk des Orfèvres (silversmiths) each occupy a dedicated street. Prices are honest and quality is high.", category: 'shopping', distance: '12 km', ...c({ estimated_duration: '2-3 hours', price_range: 'Varies', transportation: 'Taxi (25 min)' }) },
  { hotel_id: 'villa-didon-carthage', attraction_name: 'La Marsa Sunday Market', description: "Every Sunday morning, La Marsa town centre fills with stalls selling fresh produce, local crafts, antiques, and bric-à-brac. A favourite with Tunis residents and expatriates for its relaxed, authentic atmosphere. Combine with a morning swim at La Marsa beach.", category: 'shopping', distance: '5 km', ...c({ estimated_duration: '1.5 hours', price_range: 'Varies', transportation: 'TGM train / Taxi' }) },
  { hotel_id: 'villa-didon-carthage', attraction_name: 'Sidi Bou Said Art Galleries', description: "A cluster of contemporary art galleries and artisan boutiques in the main street of Sidi Bou Said selling ceramics, paintings, photography, silver jewellery, and traditional Tunisian textiles. Several artists have studios open to visitors. Fixed prices; no haggling.", category: 'shopping', distance: '3.5 km', ...c({ estimated_duration: '1 hour', price_range: 'Varies', transportation: 'Taxi (10 min)' }) },
  { hotel_id: 'villa-didon-carthage', attraction_name: 'City Mall Tunis', description: "The largest shopping mall in greater Tunis, on the Route de la Marsa, with Zara, Mango, Adidas, a hypermarket, a multiplex cinema, and a broad food court. Air-conditioned and open daily 09:00-22:00. Useful for a rainy afternoon or practical shopping.", category: 'shopping', distance: '6 km', ...c({ estimated_duration: '2-3 hours', price_range: 'Varies', transportation: 'Taxi (15 min)' }) },

  // ── RESTAURANT ───────────────────────────────────────────────────────────
  { hotel_id: 'villa-didon-carthage', attraction_name: 'Restaurant La Falaise — Sidi Bou Said', description: "Perched on the cliff edge of Sidi Bou Said with a panoramic terrace over the Bay of Tunis, La Falaise serves refined Tunisian-Mediterranean cuisine. The whole grilled sea bass, tuna carpaccio, and brik au thon are standouts. Reserve the terrace table at sunset.", category: 'restaurant', distance: '3.5 km', ...c({ estimated_duration: '2 hours', price_range: '45-90 TND/person', transportation: 'Taxi (10 min)' }) },
  { hotel_id: 'villa-didon-carthage', attraction_name: 'Restaurant Bahari — La Goulette', description: "A beloved La Goulette institution serving traditional Tunisian fish and seafood since 1968. The fish couscous is a Thursday specialty not to be missed. Lively outdoor terrace with views of the port. Arrive early — they run out of the best dishes by 13h.", category: 'restaurant', distance: '4.5 km', ...c({ estimated_duration: '1.5 hours', price_range: '25-50 TND/person', transportation: 'Taxi (10 min)' }) },
  { hotel_id: 'villa-didon-carthage', attraction_name: 'Dar El Jeld — Tunis Medina', description: "One of Tunisia's finest restaurants, occupying a beautifully restored 18th-century palace in the Tunis Medina. The menu is a celebration of classic Tunisian haute cuisine — m\'hammara lamb, kamounia veal, and a legendary makroudh dessert. Book in advance.", category: 'restaurant', distance: '12 km', ...c({ estimated_duration: '2.5 hours', price_range: '60-120 TND/person', transportation: 'Taxi (25 min)' }) },
  { hotel_id: 'villa-didon-carthage', attraction_name: 'Café Diwan — Carthage', description: "A historic Tunisian-style café opposite the Carthage train station with a shaded courtyard and slow pace. Order the traditional ftir (layered pastry) at breakfast, or a glass of tchicha (barley soup) in the afternoon. Popular with locals from the Carthage residential district.", category: 'restaurant', distance: '800 m', ...c({ estimated_duration: '45 min', price_range: '5-12 TND', transportation: 'Walking' }) },

  // ── CAFE ─────────────────────────────────────────────────────────────────
  { hotel_id: 'villa-didon-carthage', attraction_name: 'Café des Nattes — Sidi Bou Said', description: "Tunisia's most iconic café. Whitewashed walls, blue shutters, and a tiled terrace overlooking the cobbled main street. The pine nut tea and kaaket anise biscuits are the only items on the menu — and they are perfect. Best at sunset when the clifftop light is golden.", category: 'cafe', distance: '3.5 km', ...c({ estimated_duration: '30-60 min', price_range: '5-10 TND', transportation: 'Taxi (10 min)' }) },
  { hotel_id: 'villa-didon-carthage', attraction_name: 'La Marsa Café — Seafront', description: "A modern café with a large terrace directly on the La Marsa seafront, serving specialty coffee, fresh juices, smoothies, and light lunches. Free Wi-Fi and power sockets. Popular with students, remote workers, and Tunis expats on weekend mornings.", category: 'cafe', distance: '5 km', ...c({ estimated_duration: '30-90 min', price_range: '5-15 TND', transportation: 'TGM / Taxi' }) },
  { hotel_id: 'villa-didon-carthage', attraction_name: 'Hannibal Café — Carthage Hannibal', description: "A quiet café near the Carthage Hannibal TGM station, perfect for a morning espresso before exploring the ruins. Simple terrace, strong Tunisian coffee, fresh orange juice, and msemen (pan-fried flatbread). A neighbourhood institution.", category: 'cafe', distance: '600 m', ...c({ estimated_duration: '30 min', price_range: '3-7 TND', transportation: 'Walking' }) },
  { hotel_id: 'villa-didon-carthage', attraction_name: 'Pastry Café Sidi Bou Said', description: "A patisserie and salon de thé in the heart of Sidi Bou Said, specialising in Tunisian sweets — baklava, makroudh (date pastry), and samsa (sesame-honey triangle). The courtyard is shaded by jasmine and orange trees. A perfect post-sightseeing stop.", category: 'cafe', distance: '3.5 km', ...c({ estimated_duration: '30 min', price_range: '4-10 TND', transportation: 'Taxi (10 min)' }) },


  // ═══════════════════════════════════════════════════════════════════════════
  // HÔTEL BELVÉDÈRE FOURATI — Belvédère, Tunis (36.815, 10.179)
  // ═══════════════════════════════════════════════════════════════════════════

  // ── CULTURAL ────────────────────────────────────────────────────────────
  { hotel_id: 'belvedere-fourati-tunis', attraction_name: 'Bardo National Museum', description: "A 5-minute drive from the hotel, the Bardo is the world's leading museum of Roman mosaics. Over 3,000 sq m of floors from Roman villas, hunting lodges, and thermal baths are displayed in a 19th-century palace. The prehistoric and Islamic collections are equally impressive.", category: 'cultural', distance: '3.2 km', ...c({ estimated_duration: '2.5 hours', price_range: '11 TND', transportation: 'Taxi (8 min)', image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Bardo_National_Museum_Tunis.jpg/800px-Bardo_National_Museum_Tunis.jpg' }) },
  { hotel_id: 'belvedere-fourati-tunis', attraction_name: 'Tunis Medina (UNESCO)', description: "A 15-minute walk or short taxi ride from the hotel. The 7th-century medina covers 270 hectares and contains over 700 monuments. Wander the Great Mosque of Zitouna, the Souks des Chéchias and El Attarine, and the restored Hafsid palaces. A living city — not a museum.", category: 'cultural', distance: '2 km', ...c({ estimated_duration: '3-4 hours', price_range: 'Free', transportation: 'Walking (30 min) / Taxi (8 min)', image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Tunis_medina_mosque_zitouna.jpg/800px-Tunis_medina_mosque_zitouna.jpg' }) },
  { hotel_id: 'belvedere-fourati-tunis', attraction_name: 'Carthage Archaeological Site (UNESCO)', description: "Day trip to the ancient capital of Carthage, covering Byrsa Hill, Antonine Baths, Punic ports, Tophet, and amphitheatre. Take the TGM suburban train from Tunis Marine station for an authentic local experience alongside the ruins.", category: 'cultural', distance: '13 km', ...c({ estimated_duration: '3-4 hours', price_range: '12 TND', transportation: 'Taxi (20 min) / TGM train', image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Carthage_-_Amphitheatre.jpg/800px-Carthage_-_Amphitheatre.jpg' }) },
  { hotel_id: 'belvedere-fourati-tunis', attraction_name: 'Sidi Bou Said Village', description: "The blue-and-white clifftop village above the Bay of Tunis — galleries, the Café des Nattes, and panoramic sea views. Take the TGM train for an hour-long scenic journey, or taxi in 20 minutes. Plan for late afternoon to catch the golden light.", category: 'cultural', distance: '14 km', ...c({ estimated_duration: '2-3 hours', price_range: 'Free', transportation: 'Taxi (20 min) / TGM train', image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Sidi_bou_said_blue_doors.jpg/800px-Sidi_bou_said_blue_doors.jpg' }) },
  { hotel_id: 'belvedere-fourati-tunis', attraction_name: 'Dar Ben Abdallah Museum', description: "One of the most beautifully preserved historic palaces in the Tunis Medina, now the Museum of the Arts and Popular Traditions of the City of Tunis. Exceptional collection of 19th-century Tunisian costumes, furniture, and everyday objects in an intact palatial setting.", category: 'cultural', distance: '2.5 km', ...c({ estimated_duration: '1 hour', price_range: '5 TND', transportation: 'Taxi (10 min)' }) },
  { hotel_id: 'belvedere-fourati-tunis', attraction_name: 'Zitouna Mosque & Medina Tour', description: "The Great Mosque of Zitouna (9th century) is the spiritual heart of the Tunis Medina. Non-Muslim visitors may enter the courtyard. A guided tour of the surrounding souks and medina streets can be arranged through the hotel for 2–3 hours at 09:00 daily.", category: 'cultural', distance: '2 km', ...c({ estimated_duration: '2-3 hours', price_range: 'Free–15 TND (guided)', transportation: 'Taxi (8 min)' }) },

  // ── NATURE ──────────────────────────────────────────────────────────────
  { hotel_id: 'belvedere-fourati-tunis', attraction_name: 'Belvédère Park (Parc du Belvédère)', description: "Directly adjacent to the hotel, this 110-hectare park is the green lung of Tunis. Shaded walks, a small zoo, a municipal pool, fountains, and great birdwatching. Packed with Tunis families on weekend mornings. The elevated terrace near the zoo entrance has city panoramas.", category: 'nature', distance: '100 m', ...c({ estimated_duration: '1-2 hours', price_range: 'Free', transportation: 'Walking', image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Parc_du_belvedere_tunis.jpg/800px-Parc_du_belvedere_tunis.jpg' }) },
  { hotel_id: 'belvedere-fourati-tunis', attraction_name: 'Lac de Tunis Promenade', description: "A long promenade along the North Lake of Tunis, popular with joggers, cyclists, and families at sunset. Flamingos are frequently visible on the far shore. The lakeside restaurant district on the eastern side has some of the best fish restaurants in greater Tunis.", category: 'nature', distance: '5 km', ...c({ estimated_duration: '1-2 hours', price_range: 'Free', transportation: 'Taxi (12 min)' }) },
  { hotel_id: 'belvedere-fourati-tunis', attraction_name: 'La Marsa Beach', description: "The favourite beach of Tunis residents, with golden sand, clear water, and a lively promenade. Take the TGM train from Tunis Marine (10 min walk from hotel) for a scenic 30-minute ride along the lake shore to La Marsa. The Sunday morning market is a bonus.", category: 'nature', distance: '16 km', ...c({ estimated_duration: 'Half day', price_range: 'Free', transportation: 'TGM train (30 min) / Taxi (25 min)' }) },
  { hotel_id: 'belvedere-fourati-tunis', attraction_name: 'Ain Zaghouan Mountain Springs', description: "A half-day excursion (45 km south-west) to the Zaghouan mountain spring — source of the ancient Roman aqueduct that supplied Carthage for over 300 km. The spring temple is beautifully preserved in a pine forest. Mountain air, picnic spots, and complete tranquillity.", category: 'nature', distance: '45 km', ...c({ estimated_duration: 'Half day', price_range: 'Free', transportation: 'Taxi / rental car (45 min)' }) },

  // ── ADVENTURE ───────────────────────────────────────────────────────────
  { hotel_id: 'belvedere-fourati-tunis', attraction_name: 'Gammarth Go-Kart & Paintball', description: "An outdoor leisure complex in Gammarth (20 km north) with go-karts, paintball, archery, and laser tag. Popular for group outings and team-building. Half-day packages include safety briefing and refreshments. Hotel can arrange transfers for groups of 4+.", category: 'adventure', distance: '20 km', ...c({ estimated_duration: '2-3 hours', price_range: '35-75 TND', transportation: 'Taxi (25 min)' }) },
  { hotel_id: 'belvedere-fourati-tunis', attraction_name: 'Cycling Tour — Belvédère to Lac', description: "A 12 km bike loop from the hotel through Belvédère Park, along the lake promenade, and back via the El Menzah residential quarter. Bike rental available from the sports shop adjacent to the park entrance. Flat route, suitable for all fitness levels.", category: 'adventure', distance: '0 km (starts at hotel)', ...c({ estimated_duration: '2 hours', price_range: '15-25 TND', transportation: 'Cycling' }) },
  { hotel_id: 'belvedere-fourati-tunis', attraction_name: 'Kart Cross El Aouina', description: "A permanent kart circuit near Tunis-Carthage Airport, with outdoor and indoor tracks. Open to individuals and groups daily from 09:00. Suitable for beginners and advanced drivers. Food kiosk and spectator terrace on site.", category: 'adventure', distance: '8 km', ...c({ estimated_duration: '1.5 hours', price_range: '30-50 TND', transportation: 'Taxi (15 min)' }) },

  // ── ENTERTAINMENT ────────────────────────────────────────────────────────
  { hotel_id: 'belvedere-fourati-tunis', attraction_name: 'Avenue Habib Bourguiba Evening', description: "Tunis\'s grand boulevard — 2 km of tree-lined cafés, bookshops, cinemas, and street life. The Théâtre Municipal (1902), the French Embassy, and the Cathedral of Saint Vincent de Paul all face this avenue. Especially vibrant after 18:00 with families and street performers.", category: 'entertainment', distance: '2.5 km', ...c({ estimated_duration: '1-2 hours', price_range: 'Free', transportation: 'Walking (25 min) / Taxi (8 min)', image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Avenue_Habib_Bourguiba_Tunis.jpg/800px-Avenue_Habib_Bourguiba_Tunis.jpg' }) },
  { hotel_id: 'belvedere-fourati-tunis', attraction_name: 'Cinéma Le Mondial — Art House', description: "One of Tunis\'s oldest and most beloved cinemas on Avenue Habib Bourguiba, showing Tunisian, French, and international art-house films. Tickets are inexpensive and the restored 1960s interior is worth seeing. Programme posted at the entrance and online.", category: 'entertainment', distance: '2.5 km', ...c({ estimated_duration: '2 hours', price_range: '8-12 TND', transportation: 'Taxi (8 min)' }) },
  { hotel_id: 'belvedere-fourati-tunis', attraction_name: 'Casino de Tunis — El Menzah', description: "The main casino serving Tunis, 4 km from the hotel in El Menzah. Features a full range of slot machines, roulette, blackjack, and poker. Smart casual dress code; passport or ID required. The adjacent restaurant is open to non-gamblers from 19:00.", category: 'entertainment', distance: '4 km', ...c({ estimated_duration: '2-4 hours', price_range: 'Free entry', transportation: 'Taxi (10 min)' }) },
  { hotel_id: 'belvedere-fourati-tunis', attraction_name: 'Centre Culturel International Hammamet', description: "When major cultural events are scheduled in Tunis (music, theatre, film festivals), the Théâtre de l\'Opéra de Tunis on Avenue Mohamed V is the main venue, 1 km from the hotel. Check the cultural calendar — world-class performers appear here year-round.", category: 'entertainment', distance: '1 km', ...c({ estimated_duration: '2-3 hours', price_range: '10-40 TND', transportation: 'Walking / Taxi' }) },

  // ── SHOPPING ─────────────────────────────────────────────────────────────
  { hotel_id: 'belvedere-fourati-tunis', attraction_name: 'City Mall Tunis', description: "The largest shopping mall in Tunisia — over 100 stores including Zara, H&M, Mango, Adidas, a full Géant hypermarket, a 5-screen multiplex cinema, and a wide food court. Air-conditioned and open daily 09:00-22:00. Taxis from the hotel in 15 minutes.", category: 'shopping', distance: '7 km', ...c({ estimated_duration: '2-4 hours', price_range: 'Varies', transportation: 'Taxi (15 min)' }) },
  { hotel_id: 'belvedere-fourati-tunis', attraction_name: 'Tunis Medina Souk El Attarine', description: "The perfume and spice souk in the heart of the medina. Artisan distillers sell rose water, jasmine extract, amber, and locally blended perfumes from tiny glass bottles. The adjacent Souk des Chéchias still produces the traditional red felt hats worn since the Ottoman era.", category: 'shopping', distance: '2 km', ...c({ estimated_duration: '1.5 hours', price_range: 'Varies', transportation: 'Taxi (8 min)' }) },
  { hotel_id: 'belvedere-fourati-tunis', attraction_name: 'SOCOPA Artisanat — Avenue Bourguiba', description: "The national artisanat store on Avenue Habib Bourguiba sells fixed-price, quality-controlled Tunisian handicrafts: ceramics, carpets, silver, leather goods, copper work, and embroidered linen. No haggling required and export certificates are provided on request.", category: 'shopping', distance: '2.5 km', ...c({ estimated_duration: '1 hour', price_range: 'Varies', transportation: 'Taxi (8 min)' }) },
  { hotel_id: 'belvedere-fourati-tunis', attraction_name: 'Jardin d\'El Menzah Market', description: "A weekly open-air market in the El Menzah residential neighbourhood (Fridays) selling fresh produce, olives, local cheeses, homemade harissa, dried figs, and clothing. An authentic slice of Tunis everyday life, very popular with local families.", category: 'shopping', distance: '3.5 km', ...c({ estimated_duration: '1 hour', price_range: 'Varies', transportation: 'Taxi (10 min)' }) },

  // ── RESTAURANT ───────────────────────────────────────────────────────────
  { hotel_id: 'belvedere-fourati-tunis', attraction_name: 'Le Byzantin — Lac de Tunis', description: "An upscale restaurant on the banks of the North Lake, specialising in Tunisian-Mediterranean seafood. The terrace overlooks the water and is magical at sunset. Signature dish: whole dorade in salt crust with chermoula. Reserve the lakeside table for romantic dinners.", category: 'restaurant', distance: '5 km', ...c({ estimated_duration: '2 hours', price_range: '50-100 TND/person', transportation: 'Taxi (12 min)' }) },
  { hotel_id: 'belvedere-fourati-tunis', attraction_name: 'Restaurant M\'Rabet — Tunis Medina', description: "A historic restaurant and tea house in the Souk El Trouk, the Ottoman merchants\' bazaar. Operating since the 18th century, M\'Rabet serves traditional Tunisian home cooking in a vaulted interior of inlaid tiles and carved plaster. The mechouia salad and lamb couscous are excellent.", category: 'restaurant', distance: '2.5 km', ...c({ estimated_duration: '1.5 hours', price_range: '20-40 TND/person', transportation: 'Taxi (8 min)' }) },
  { hotel_id: 'belvedere-fourati-tunis', attraction_name: 'Dar El Jeld — Fine Tunisian Dining', description: "Tunisia\'s most celebrated restaurant in a restored 18th-century Medina palace. The refined menu is purely Tunisian: m\'hammara slow-cooked lamb, kamounia veal with cumin, and a legendary briouat pastry dessert. Book at least 3 days in advance.", category: 'restaurant', distance: '2.5 km', ...c({ estimated_duration: '2.5 hours', price_range: '60-120 TND/person', transportation: 'Taxi (8 min)' }) },
  { hotel_id: 'belvedere-fourati-tunis', attraction_name: 'Snack Le Bon Kilo — Belvédère', description: "A local neighbourhood snack bar 200 m from the hotel, beloved by Belvédère residents for its merguez sandwiches, lablabi (chickpea soup), and fresh-squeezed juice. Open from 06:30 until late. Ideal for a quick authentic Tunisian breakfast before a day of sightseeing.", category: 'restaurant', distance: '200 m', ...c({ estimated_duration: '20 min', price_range: '3-8 TND', transportation: 'Walking' }) },

  // ── CAFE ─────────────────────────────────────────────────────────────────
  { hotel_id: 'belvedere-fourati-tunis', attraction_name: 'Café de Paris — Avenue Bourguiba', description: "A Tunis institution since 1930, Café de Paris occupies a prime corner on Avenue Habib Bourguiba. The large terrace is the best place to watch Tunis life go by over a strong espresso or traditional Turkish coffee. Classic décor, unhurried pace, and excellent pastries.", category: 'cafe', distance: '2.5 km', ...c({ estimated_duration: '45 min', price_range: '4-8 TND', transportation: 'Taxi (8 min)' }) },
  { hotel_id: 'belvedere-fourati-tunis', attraction_name: 'Café Belvédère — Park Entrance', description: "A welcoming café at the main gate of Belvédère Park, 100 m from the hotel entrance. Serves mint tea, fresh citronade, and msemen (flatbread) at all hours. The shaded terrace facing the park is ideal for a slow morning start before a walk through the gardens.", category: 'cafe', distance: '150 m', ...c({ estimated_duration: '30-45 min', price_range: '3-7 TND', transportation: 'Walking' }) },
  { hotel_id: 'belvedere-fourati-tunis', attraction_name: 'Espresso Lab Tunis — El Menzah', description: "Tunis\'s most popular specialty coffee bar, with single-origin espresso, chemex pour-overs, cold brew, and a full menu of cakes and savoury pastries. Free Wi-Fi and USB charging at every table. Very popular with Tunis professionals and digital nomads on weekday mornings.", category: 'cafe', distance: '3 km', ...c({ estimated_duration: '30-90 min', price_range: '5-14 TND', transportation: 'Taxi (8 min)' }) },
  { hotel_id: 'belvedere-fourati-tunis', attraction_name: 'Café M\'Rabet — Medina Terrace', description: "The upper-floor salon of the historic M\'Rabet establishment in the Souk El Trouk. A traditional wooden balcony overlooks the bustling souk below. Order a glass of pine nut tea, a plate of homemade baklava, and absorb the living history of the medina for an hour.", category: 'cafe', distance: '2.5 km', ...c({ estimated_duration: '45 min', price_range: '5-10 TND', transportation: 'Taxi (8 min)' }) },


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
          estimated_duration, price_range, transportation, image_url
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        ON CONFLICT (hotel_id, attraction_name) DO UPDATE SET
          description        = EXCLUDED.description,
          category           = EXCLUDED.category,
          distance           = EXCLUDED.distance,
          estimated_duration = EXCLUDED.estimated_duration,
          price_range        = EXCLUDED.price_range,
          transportation     = EXCLUDED.transportation,
          image_url          = EXCLUDED.image_url,
          updated_at         = NOW()
      `, [
        a.hotel_id, a.attraction_name, a.description, a.category, a.distance,
        a.estimated_duration, a.price_range, a.transportation, a.image_url || null,
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
