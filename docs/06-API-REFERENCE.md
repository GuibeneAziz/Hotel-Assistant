# Référence complète des routes API

---

## Conventions

- Toutes les routes commencent par `/api/`
- Les corps de requête et réponses sont en JSON
- Les routes protégées nécessitent l'en-tête : `Authorization: Bearer <token_JWT>`
- Code `200` = succès, `400` = erreur de validation, `401` = non autorisé, `429` = rate limit, `500` = erreur serveur

---

## Chat

### `POST /api/chat`
Génère une réponse IA complète (retournée d'un coup).

**Corps :**
| Champ | Type | Requis | Description |
|---|---|---|---|
| `message` | string | ✅ | Message du client (1-1000 caractères) |
| `hotelData` | object | ✅ | `{ id: string, name: string }` |
| `weather` | object | ❌ | Données météo OpenMeteo |
| `sessionId` | string | ✅ | Identifiant de session |
| `conversationHistory` | array | ❌ | `[{role, content}, ...]` |

**Réponse 200 :**
```json
{ "success": true, "response": "La piscine ouvre à 08:00..." }
```

**Réponse 429 :**
```json
{ "success": false, "error": "Rate limit exceeded" }
```

---

### `POST /api/chat/stream`
Génère une réponse en streaming SSE. Mêmes paramètres que `POST /api/chat`.

**Réponse :** `Content-Type: text/event-stream`
```
data: {"chunk":"La piscine"}
data: {"chunk":" ouvre"}
data: {"done":true}
```

En cas d'erreur :
```
data: {"error":"Rate limit exceeded"}
```

---

### `GET /api/chat`
Health check.

**Réponse 200 :**
```json
{
  "status": "ok",
  "aiConfigured": true,
  "redisConfigured": true,
  "timestamp": "2026-04-20T10:00:00.000Z"
}
```

---

## Paramètres hôtel

### `GET /api/hotel-settings`
Charge tous les paramètres hôtels (depuis Redis ou base de données). Pas d'authentification requis.

**Réponse 200 :**
```json
{
  "sindbad-hammamet": {
    "facilities": {
      "pool": { "openTime": "08:00", "closeTime": "20:00", "available": true },
      "spa": { "openTime": "09:00", "closeTime": "19:00", "available": true, "treatments": ["massage", "hammam"] },
      "gym": { "openTime": "06:00", "closeTime": "22:00", "available": true },
      "kidsClub": { "openTime": "09:00", "closeTime": "18:00", "available": true, "ageRange": "3-12 ans" }
    },
    "restaurant": {
      "breakfast": { "startTime": "07:00", "endTime": "10:00", "type": "Buffet", "location": "Salle principale" },
      "lunch": { ... },
      "dinner": { ... }
    },
    "contact": {
      "phone": "+216 72 280 122",
      "email": "contact@sindbad.tn",
      "address": "Route Touristique, Hammamet",
      "emergencyPhone": "+216 72 280 199"
    },
    "amenities": {
      "wifi": { "available": true, "password": "sindbad2024" },
      "parking": { "available": true, "fee": "Gratuit" },
      "checkinTime": "14:00",
      "checkoutTime": "12:00"
    },
    "specialEvents": [...],
    "activities": [...],
    "nearbyAttractions": [...]
  },
  "paradise-hammamet": { ... },
  "movenpick-sousse": { ... }
}
```

---

### `POST /api/hotel-settings`
Sauvegarde les paramètres d'un hôtel. **JWT requis.**

**En-tête :** `Authorization: Bearer <token>`

**Corps :**
```json
{
  "hotelId": "sindbad-hammamet",
  "settings": {
    "facilities": { ... },
    "restaurant": { ... }
  }
}
```

**Réponse 200 :**
```json
{ "success": true, "message": "Settings saved" }
```

---

## Analytics

### `GET /api/analytics/overview`

**Paramètres URL :**
| Paramètre | Requis | Valeurs | Défaut |
|---|---|---|---|
| `hotelId` | ❌ | ID hôtel | (tous les hôtels) |
| `timeRange` | ❌ | `1d`, `7d`, `30d` | `7d` |

**Réponse 200 :**
```json
{
  "totalGuests": 142,
  "totalInteractions": 857,
  "mostActiveHotel": "sindbad-hammamet",
  "topCategory": "facilities",
  "avgInteractions": 6.03,
  "timeRange": "7d"
}
```

---

### `GET /api/analytics/demographics`

**Paramètres URL :**
| Paramètre | Requis |
|---|---|
| `hotelId` | ✅ |
| `timeRange` | ❌ |

**Réponse 200 :**
```json
{
  "nationalities": [{ "nationality": "French", "count": 45 }, ...],
  "ageGroups": [{ "range": "26-35", "count": 67 }, ...],
  "travelPurposes": [{ "purpose": "leisure", "count": 98 }, ...],
  "groupTypes": [{ "type": "couple", "count": 54 }, ...]
}
```

---

### `GET /api/analytics/questions`

**Paramètres URL :**
| Paramètre | Requis |
|---|---|
| `hotelId` | ❌ |
| `timeRange` | ❌ |

**Réponse 200 :**
```json
{
  "categories": [{ "category": "facilities", "count": 234 }, ...],
  "topSubcategories": [{ "subcategory": "pool", "count": 89 }, ...],
  "questionsOverTime": [{ "date": "2026-04-14", "count": 45 }, ...]
}
```

---

### `GET /api/analytics/dashboard`

**Paramètres URL :** `hotelId` (requis)

**Réponse 200 :**
```json
{
  "mostAskedQuestions": [{ "category": "facilities", "subcategory": "pool", "total_count": 89 }, ...],
  "demographics": { "nationalities": [...], "ageGroups": [...] },
  "popularActivities": [{ "topic": "piscine", "mention_count": 120, "positive_count": 95 }, ...],
  "satisfaction": { "averageScore": 0.79 }
}
```

---

### `POST /api/analytics/guest-profile`
Sauvegarde le profil d'un client. Pas d'authentification.

**Corps :**
```json
{
  "sessionId": "session_1714500000_abc123",
  "hotelId": "sindbad-hammamet",
  "ageRange": "26-35",
  "nationality": "French",
  "travelPurpose": "leisure",
  "groupType": "couple"
}
```

**Réponse 200 :**
```json
{ "success": true }
```

---

## Admin — Authentification

### `POST /api/admin/login`
**Corps :**
```json
{ "username": "admin", "password": "votre-mot-de-passe" }
```

**Réponse 200 :**
```json
{ "success": true, "token": "eyJhbGciOiJIUzI1NiIs..." }
```

**Réponse 401 :**
```json
{ "success": false, "error": "Invalid credentials" }
```

**Réponse 429 :** Trop de tentatives de connexion.

---

### `GET /api/admin/verify`
**En-tête :** `Authorization: Bearer <token>`

**Réponse 200 :**
```json
{ "valid": true, "user": { "sub": "admin", "iss": "hotel-assistant" } }
```

**Réponse 401 :**
```json
{ "valid": false, "error": "Invalid token" }
```

---

## Admin — Réservations

### `GET /api/admin/reservations?hotelId=sindbad-hammamet`
**En-tête :** `Authorization: Bearer <token>`

**Réponse 200 :**
```json
[
  {
    "id": 1,
    "guest_name": "Ahmed Ben Ali",
    "phone_number": "+33 6 12 34 56 78",
    "room_number": "305",
    "email": "ahmed@email.com",
    "notes": null,
    "status": "pending",
    "event_title": "Soirée Orientale",
    "event_date": "2026-05-20",
    "event_time": "20:00",
    "created_at": "2026-04-18T14:30:00.000Z"
  }
]
```

---

### `PATCH /api/admin/reservations`
**En-tête :** `Authorization: Bearer <token>`

**Corps :**
```json
{ "id": 1, "status": "confirmed" }
```

Valeurs de `status` : `pending`, `confirmed`, `cancelled`.

**Réponse 200 :**
```json
{ "success": true, "reservation": { "id": 1, "status": "confirmed", ... } }
```

**Réponse 404 :**
```json
{ "success": false, "error": "Reservation not found" }
```

---

## Upload de fichiers

### `POST /api/upload/event-image`
Upload d'une image pour un événement.

**Corps :** `multipart/form-data` avec champ `file`

**Validation :**
- Types acceptés : `image/jpeg`, `image/png`, `image/webp`, `image/gif`
- Taille max : 5 MB
- Nom généré : `event_{timestamp}_{random}.{ext}`

**Réponse 200 :**
```json
{ "success": true, "data": { "url": "/uploads/events/event_1714500000_abc.jpg" } }
```

**Réponse 400 :**
```json
{ "success": false, "error": "File too large" }
```

---

### `POST /api/upload`
Upload général (même validation).

**Réponse 200 :**
```json
{ "success": true, "url": "/uploads/events/event_1714500000_xyz.jpg" }
```

---

## Réservations publiques

### `POST /api/reservations`
Créer une réservation pour un événement. Pas d'authentification.

**Corps :**
```json
{
  "eventId": 5,
  "hotelId": "sindbad-hammamet",
  "guestName": "Ahmed Ben Ali",
  "phoneNumber": "+33 6 12 34 56 78",
  "roomNumber": "305",
  "email": "ahmed@email.com",
  "notes": "Végétarien"
}
```

`email` et `notes` sont optionnels.

**Réponse 200 :**
```json
{
  "success": true,
  "reservation": {
    "id": 42,
    "status": "pending",
    "created_at": "2026-04-20T10:00:00.000Z"
  }
}
```

**Réponse 400 :**
```json
{ "success": false, "error": "Event does not require reservation" }
```
