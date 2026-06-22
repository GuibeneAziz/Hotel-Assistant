-- Default hotel settings (hours, contact, amenities) — runs on first Postgres init.
-- Re-run on existing DB: npm run docker:seed-settings

-- sindbad-hammamet
INSERT INTO facilities (hotel_id, facility_type, facility_name, is_available, open_time, close_time) VALUES
  ('sindbad-hammamet', 'restaurant', 'breakfast', true, '07:00', '10:00'),
  ('sindbad-hammamet', 'restaurant', 'lunch', true, '12:00', '15:00'),
  ('sindbad-hammamet', 'restaurant', 'dinner', true, '19:00', '22:00'),
  ('sindbad-hammamet', 'spa', 'main', true, '09:00', '21:00'),
  ('sindbad-hammamet', 'pool', 'main', true, '06:00', '22:00'),
  ('sindbad-hammamet', 'bar', 'infinity_bar', true, '06:00', '22:00'),
  ('sindbad-hammamet', 'gym', 'main', true, '05:00', '23:00'),
  ('sindbad-hammamet', 'kids_club', 'main', true, '09:00', '17:00')
ON CONFLICT (hotel_id, facility_type, facility_name) DO UPDATE SET
  is_available = EXCLUDED.is_available, open_time = EXCLUDED.open_time, close_time = EXCLUDED.close_time;

UPDATE facilities SET treatments = ARRAY['Traditional Hammam', 'Aromatherapy Massage', 'Facial Treatment'], age_range = '4-12'
WHERE hotel_id = 'sindbad-hammamet' AND facility_type IN ('spa', 'kids_club');

INSERT INTO contact_info (hotel_id, phone, email, address, emergency_phone) VALUES
  ('sindbad-hammamet', '+216 72 280 122', 'info@sindbad-hammamet.com', 'Zone Touristique, Hammamet 8050, Tunisia', '+216 72 280 100')
ON CONFLICT (hotel_id) DO UPDATE SET phone = EXCLUDED.phone, email = EXCLUDED.email, address = EXCLUDED.address, emergency_phone = EXCLUDED.emergency_phone;

INSERT INTO amenities (hotel_id, amenity_type, is_available, primary_value, instructions) VALUES
  ('sindbad-hammamet', 'wifi', true, 'SindbadGuest2024', 'Connect to "Sindbad_WiFi" network'),
  ('sindbad-hammamet', 'parking', true, 'Free', 'Parking available in front of hotel'),
  ('sindbad-hammamet', 'checkin', true, '15:00', 'Early check-in available upon request'),
  ('sindbad-hammamet', 'checkout', true, '12:00', 'Late check-out available until 14:00 for additional fee')
ON CONFLICT (hotel_id, amenity_type) DO UPDATE SET is_available = EXCLUDED.is_available, primary_value = EXCLUDED.primary_value, instructions = EXCLUDED.instructions;

-- villa-didon-carthage
INSERT INTO facilities (hotel_id, facility_type, facility_name, is_available, open_time, close_time) VALUES
  ('villa-didon-carthage', 'restaurant', 'breakfast', true, '07:30', '10:30'),
  ('villa-didon-carthage', 'restaurant', 'lunch', true, '12:30', '15:30'),
  ('villa-didon-carthage', 'restaurant', 'dinner', true, '19:30', '22:30'),
  ('villa-didon-carthage', 'spa', 'main', true, '09:00', '21:00'),
  ('villa-didon-carthage', 'pool', 'main', true, '08:00', '20:00'),
  ('villa-didon-carthage', 'bar', 'infinity_bar', true, '10:00', '22:00'),
  ('villa-didon-carthage', 'gym', 'main', true, '06:00', '22:00'),
  ('villa-didon-carthage', 'kids_club', 'main', false, '09:00', '17:00')
ON CONFLICT (hotel_id, facility_type, facility_name) DO UPDATE SET
  is_available = EXCLUDED.is_available, open_time = EXCLUDED.open_time, close_time = EXCLUDED.close_time;

UPDATE facilities SET treatments = ARRAY['Hammam Royal', 'Thalassotherapy', 'Aromatherapy Massage', 'Reflexology']
WHERE hotel_id = 'villa-didon-carthage' AND facility_type = 'spa';
UPDATE facilities SET age_range = 'N/A' WHERE hotel_id = 'villa-didon-carthage' AND facility_type = 'kids_club';

INSERT INTO contact_info (hotel_id, phone, email, address, emergency_phone) VALUES
  ('villa-didon-carthage', '+216 31 323 000', 'contact@villadidoncarthage.com', 'Rue Mendes France, Byrsa Hill, Carthage 2016, Tunisia', '+216 31 323 100')
ON CONFLICT (hotel_id) DO UPDATE SET phone = EXCLUDED.phone, email = EXCLUDED.email, address = EXCLUDED.address, emergency_phone = EXCLUDED.emergency_phone;

INSERT INTO amenities (hotel_id, amenity_type, is_available, primary_value, instructions) VALUES
  ('villa-didon-carthage', 'wifi', true, 'VillaDidon2024', 'Connect to "VillaDidon_Guest" — password at check-in'),
  ('villa-didon-carthage', 'parking', true, 'Free valet', 'Valet parking available 24h'),
  ('villa-didon-carthage', 'checkin', true, '14:00', 'Early check-in from 11:00 subject to availability'),
  ('villa-didon-carthage', 'checkout', true, '12:00', 'Late check-out until 15:00 on request')
ON CONFLICT (hotel_id, amenity_type) DO UPDATE SET is_available = EXCLUDED.is_available, primary_value = EXCLUDED.primary_value, instructions = EXCLUDED.instructions;

-- belvedere-fourati-tunis
INSERT INTO facilities (hotel_id, facility_type, facility_name, is_available, open_time, close_time) VALUES
  ('belvedere-fourati-tunis', 'restaurant', 'breakfast', true, '07:00', '10:30'),
  ('belvedere-fourati-tunis', 'restaurant', 'lunch', true, '12:00', '15:00'),
  ('belvedere-fourati-tunis', 'restaurant', 'dinner', true, '19:00', '22:30'),
  ('belvedere-fourati-tunis', 'spa', 'main', false, '00:00', '00:00'),
  ('belvedere-fourati-tunis', 'pool', 'main', true, '07:00', '21:00'),
  ('belvedere-fourati-tunis', 'bar', 'infinity_bar', true, '09:00', '20:00'),
  ('belvedere-fourati-tunis', 'gym', 'main', true, '06:00', '23:00'),
  ('belvedere-fourati-tunis', 'kids_club', 'main', false, '09:00', '17:00')
ON CONFLICT (hotel_id, facility_type, facility_name) DO UPDATE SET
  is_available = EXCLUDED.is_available, open_time = EXCLUDED.open_time, close_time = EXCLUDED.close_time;

UPDATE facilities SET age_range = 'N/A' WHERE hotel_id = 'belvedere-fourati-tunis' AND facility_type = 'kids_club';

INSERT INTO contact_info (hotel_id, phone, email, address, emergency_phone) VALUES
  ('belvedere-fourati-tunis', '+216 71 783 133', 'reservation@hotelbelvederetunis.com', '10 Avenue des États-Unis, Belvédère, 1002 Tunis, Tunisia', '+216 71 783 100')
ON CONFLICT (hotel_id) DO UPDATE SET phone = EXCLUDED.phone, email = EXCLUDED.email, address = EXCLUDED.address, emergency_phone = EXCLUDED.emergency_phone;

INSERT INTO amenities (hotel_id, amenity_type, is_available, primary_value, instructions) VALUES
  ('belvedere-fourati-tunis', 'wifi', true, 'Belvedere2024', 'Free WiFi throughout — ask reception for the password'),
  ('belvedere-fourati-tunis', 'parking', true, 'Free', 'Free covered parking on-site, 24h access'),
  ('belvedere-fourati-tunis', 'checkin', true, '14:00', 'Express check-in available; ID required'),
  ('belvedere-fourati-tunis', 'checkout', true, '12:00', 'Late check-out until 14:00 for a small fee')
ON CONFLICT (hotel_id, amenity_type) DO UPDATE SET is_available = EXCLUDED.is_available, primary_value = EXCLUDED.primary_value, instructions = EXCLUDED.instructions;
