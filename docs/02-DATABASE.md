# Base de données — Structure Complète

La base de données est PostgreSQL hébergée sur **NeonDB** (cloud serverless). Le fichier `lib/db.ts` gère toutes les connexions et requêtes SQL.

---

## Connexion à la base

```typescript
// lib/db.ts
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,                  // 20 connexions simultanées max
  idleTimeoutMillis: 30000, // Ferme une connexion inactive après 30s
  connectionTimeoutMillis: 10000, // Timeout de connexion : 10s
})
```

Toutes les requêtes utilisent `pool.query(sql, [params])` avec des **paramètres positionnels** (`$1`, `$2`, ...) pour éviter l'injection SQL.

---

## Tables

### `hotels`
Données de base des hôtels.

| Colonne | Type | Description |
|---|---|---|
| `id` | text (PK) | Identifiant unique ex: `sindbad-hammamet` |
| `name` | text | Nom de l'hôtel |

---

### `facilities`
Équipements de l'hôtel (piscine, spa, salle de sport, club enfants).

| Colonne | Type | Description |
|---|---|---|
| `id` | serial (PK) | Auto-incrémenté |
| `hotel_id` | text (FK → hotels) | Hôtel propriétaire |
| `facility_type` | text | Type : `pool`, `spa`, `gym`, `kids_club` |
| `is_available` | boolean | Disponible ou en maintenance |
| `open_time` | text | Heure d'ouverture ex: `08:00` |
| `close_time` | text | Heure de fermeture ex: `20:00` |

---

### `facility_attributes`
Attributs spéciaux des équipements (traitements spa, tranche d'âge kids club).

| Colonne | Type | Description |
|---|---|---|
| `id` | serial (PK) | |
| `facility_id` | integer (FK → facilities) | Équipement parent |
| `attribute_name` | text | Ex: `treatments`, `age_range`, `min_age` |
| `attribute_value` | text | Ex: `["massage","hammam"]`, `3-12 ans` |

---

### `contact_info`
Coordonnées de contact de l'hôtel.

| Colonne | Type | Description |
|---|---|---|
| `id` | serial (PK) | |
| `hotel_id` | text (FK → hotels) | |
| `phone` | text | Numéro principal |
| `email` | text | Email de contact |
| `address` | text | Adresse complète |
| `emergency_phone` | text | Numéro d'urgence 24h/24 |

---

### `amenities`
Équipements et informations de séjour (WiFi, parking, check-in/out).

| Colonne | Type | Description |
|---|---|---|
| `id` | serial (PK) | |
| `hotel_id` | text (FK → hotels) | |
| `wifi_available` | boolean | WiFi gratuit disponible |
| `wifi_password` | text | Mot de passe WiFi |
| `parking_available` | boolean | Parking disponible |
| `parking_fee` | text | Tarif parking (ou "gratuit") |
| `checkin_time` | text | Heure standard de check-in |
| `checkout_time` | text | Heure standard de check-out |

---

### `special_events`
Événements organisés par l'hôtel (spectacles, soirées, activités).

| Colonne | Type | Description |
|---|---|---|
| `id` | serial (PK) | |
| `hotel_id` | text (FK → hotels) | |
| `title` | text | Nom de l'événement |
| `description` | text | Description détaillée |
| `date` | text | Date ex: `2026-05-15` |
| `time` | text | Heure ex: `20:00` |
| `location` | text | Lieu dans l'hôtel ex: `Amphithéâtre` |
| `price` | text | Tarif ex: `30 TND` ou `Gratuit` |
| `image_url` | text | Chemin image ex: `/uploads/events/event_123.jpg` |
| `requires_reservation` | boolean | Nécessite une réservation préalable |

---

### `hotel_activities`
Activités proposées à l'intérieur de l'hôtel.

| Colonne | Type | Description |
|---|---|---|
| `id` | serial (PK) | |
| `hotel_id` | text (FK → hotels) | |
| `category` | text | Ex: `sport`, `wellness`, `entertainment` |
| `title` | text | Nom de l'activité |
| `description` | text | Description |
| `is_available` | boolean | Disponible ou non |

---

### `nearby_attractions`
Attractions touristiques à proximité de l'hôtel.

| Colonne | Type | Description |
|---|---|---|
| `id` | serial (PK) | |
| `hotel_id` | text (FK → hotels) | |
| `name` | text | Nom de l'attraction |
| `category` | text | Ex: `beach`, `medina`, `museum` |
| `distance` | text | Ex: `2 km`, `10 min à pied` |
| `duration` | text | Temps de visite estimé |
| `price_range` | text | Ex: `Gratuit`, `5-15 TND` |
| `description` | text | Description touristique |
| `suitable_for_couples` | boolean | Recommandé pour couples |
| `suitable_for_families` | boolean | Recommandé pour familles |
| `suitable_for_solo` | boolean | Recommandé pour voyageurs solo |
| `suitable_for_groups` | boolean | Recommandé pour groupes |
| `suitable_for_young` | boolean | Pour les 18-35 ans |
| `suitable_for_middle` | boolean | Pour les 36-50 ans |
| `suitable_for_senior` | boolean | Pour les 50+ |
| `good_for_rainy` | boolean | Activité praticable par temps de pluie |
| `good_for_sunny` | boolean | Activité en plein air (beau temps) |
| `good_for_hot` | boolean | Adaptée aux fortes chaleurs |
| `good_for_mild` | boolean | Températures douces |
| `good_for_cool` | boolean | Temps frais |
| `priority_order` | integer | Ordre d'affichage (plus petit = prioritaire) |

Ces colonnes booléennes permettent au moteur de personnalisation (`lib/personalized-attractions.ts`) de filtrer les attractions selon le profil du client et la météo du jour.

---

### `guest_profiles`
Profil démographique des clients. Une ligne par session.

| Colonne | Type | Description |
|---|---|---|
| `id` | serial (PK) | |
| `session_id` | text (UNIQUE) | Identifiant de session du client |
| `hotel_id` | text (FK → hotels) | |
| `age_range` | text | `18-25`, `26-35`, `36-50`, `50+` |
| `nationality` | text | Nationalité saisie par le client |
| `travel_purpose` | text | `leisure`, `business`, `family`, `honeymoon` |
| `group_type` | text | `solo`, `couple`, `family`, `group` |
| `first_visit` | timestamp | Première visite sur l'application |
| `last_visit` | timestamp | Dernière activité |
| `total_interactions` | integer | Nombre de messages envoyés |

L'insertion utilise `INSERT ... ON CONFLICT (session_id) DO UPDATE` pour mettre à jour si la session existe déjà.

---

### `question_categories`
Suivi quotidien des questions posées, par catégorie et tranche d'âge. Une ligne par combinaison `(hotel_id, date, category, subcategory)`.

| Colonne | Type | Description |
|---|---|---|
| `id` | serial (PK) | |
| `hotel_id` | text | |
| `date` | date | Date du jour |
| `category` | text | `facilities`, `dining`, `activities`, `location`, `booking`, `weather`, `amenities`, `events`, `general` |
| `subcategory` | text | Ex: `pool`, `restaurant`, `spa` |
| `age_18_25` | integer | Nombre de questions de cette catégorie par les 18-25 ans |
| `age_26_35` | integer | |
| `age_36_50` | integer | |
| `age_50_plus` | integer | |
| `total_count` | integer | Total toutes tranches confondues |

---

### `popular_topics`
Sujets les plus mentionnés dans les conversations, avec analyse de sentiment.

| Colonne | Type | Description |
|---|---|---|
| `id` | serial (PK) | |
| `hotel_id` | text | |
| `topic` | text | Ex: `piscine`, `plage`, `spa` |
| `mention_count` | integer | Nombre de fois mentionné |
| `positive_count` | integer | Mentions positives |
| `negative_count` | integer | Mentions négatives |
| `neutral_count` | integer | Mentions neutres |
| `last_mentioned` | timestamp | Dernière mention |

---

### `event_reservations`
Réservations des clients pour les événements nécessitant une inscription.

| Colonne | Type | Description |
|---|---|---|
| `id` | serial (PK) | |
| `event_id` | integer (FK → special_events) | |
| `hotel_id` | text | |
| `guest_name` | text | Nom du client |
| `phone_number` | text | Téléphone |
| `room_number` | text | Numéro de chambre |
| `email` | text | Email (optionnel) |
| `notes` | text | Remarques (optionnel) |
| `status` | text | `pending`, `confirmed`, `cancelled` |
| `created_at` | timestamp | Date de création |

---

## Fonctions de base de données dans `lib/db.ts`

### `getAllHotelSettings()`
Requête principale qui joint toutes les tables et retourne un objet complet pour chaque hôtel. Utilisée dans `/api/hotel-settings` et dans le RAG.

```
hotels
  + facilities (et facility_attributes)
  + contact_info
  + amenities
  + special_events
  + hotel_activities
  + nearby_attractions
→ objet structuré { "sindbad-hammamet": { facilities: {...}, events: [...], ... } }
```

### `createReservation(data)`
`INSERT INTO event_reservations (...)` avec tous les champs du client.

### `getReservationsByHotel(hotelId)`
`SELECT * FROM event_reservations JOIN special_events ON event_id = id WHERE hotel_id = $1`

### `updateReservationStatus(id, status)`
`UPDATE event_reservations SET status = $1 WHERE id = $2`
