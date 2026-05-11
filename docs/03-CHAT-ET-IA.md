# Chat et Intelligence Artificielle

---

## Vue d'ensemble

Le chatbot utilise **Groq API** avec le modèle `llama-3.3-70b-versatile`. Le principe est simple : on donne à l'IA les vraies informations de l'hôtel (horaires, prix, contacts) pour qu'elle réponde avec précision. C'est ce qu'on appelle RAG (**Retrieval-Augmented Generation**).

---

## Deux modes de réponse

### Mode JSON : `POST /api/chat`
Retourne la réponse complète d'un coup.

**Requête :**
```json
{
  "message": "Quels sont les horaires de la piscine ?",
  "hotelData": { "id": "sindbad-hammamet", "name": "Hôtel Sindbad" },
  "weather": { "temperature": 28, "description": "ensoleillé", ... },
  "sessionId": "session_1714500000_abc123",
  "conversationHistory": [
    { "role": "user", "content": "Bonjour" },
    { "role": "assistant", "content": "Bonjour ! Comment puis-je vous aider ?" }
  ]
}
```

**Réponse :**
```json
{
  "success": true,
  "response": "La piscine principale est ouverte de 08:00 à 20:00. ..."
}
```

### Mode SSE : `POST /api/chat/stream`
Retourne les mots **au fur et à mesure** via Server-Sent Events. Mêmes paramètres que le mode JSON.

**Flux de réponse :**
```
data: {"chunk":"La piscine"}
data: {"chunk":" principale"}
data: {"chunk":" est ouverte"}
data: {"chunk":" de 08:00"}
data: {"done":true}
```

Le frontend lit chaque `chunk` et l'ajoute à la bulle de message en temps réel. Cela donne l'impression que l'IA "écrit en direct".

---

## Étape 1 — Validation de l'entrée (`lib/validation.ts`)

Avant tout, le message est validé avec **Zod** :
- Longueur : 1 à 1000 caractères
- Tous les champs HTML sont nettoyés avec **DOMPurify** (supprime `<script>`, etc.)
- Si la validation échoue → réponse 400 avec le détail de l'erreur

---

## Étape 2 — Rate Limiting (`lib/rate-limiter.ts`)

Chaque client est limité par son **adresse IP** :
- **30 messages** par fenêtre de **15 minutes**
- Algorithme : fenêtre glissante avec **Redis sorted sets**

Si la limite est dépassée → réponse 429 avec l'en-tête `Retry-After`.

Si Redis est indisponible → le rate limiting est ignoré (fail open).

---

## Étape 3 — Chargement des paramètres hôtel (`lib/db.ts` + Redis)

```
1. Vérifie si la clé "hotel:settings:all" existe dans Redis
2. Si oui → retourne le JSON mis en cache (TTL: 1 heure)
3. Si non → appelle getAllHotelSettings() (requête PostgreSQL)
              → stocke le résultat dans Redis
              → retourne les données
```

---

## Étape 4 — Construction du contexte RAG (`lib/rag-knowledge.ts`)

C'est l'étape la plus importante. La fonction `buildHotelKnowledge()` construit un long texte structuré contenant toutes les informations de l'hôtel.

**Structure du contexte généré :**

```
=== INFORMATIONS DE CONTACT (PRIORITÉ ABSOLUE) ===
Téléphone: +216 72 280 122
Email: contact@sindbad.com
Adresse: Route Touristique, Hammamet
Urgences 24h/24: +216 72 280 199

=== HÔTEL ===
Nom: Hôtel Sindbad
[...]

=== ÉQUIPEMENTS ===
Piscine principale: Ouverte 08:00-20:00
Spa Thalasso: Ouvert 09:00-19:00
  Traitements disponibles: massage, hammam, soin du visage
[...]

=== PROGRAMME RESTAURANT ===
Petit-déjeuner: 07:00-10:00 (Buffet, salle principale)
[...]

=== ÉVÉNEMENTS AUJOURD'HUI ===
- Soirée Orientale (20:00, Amphithéâtre, 30 TND) [Réservation requise]

=== ÉVÉNEMENTS À VENIR ===
[...]

=== ACTIVITÉS HÔTEL ===
Sport: Tennis (disponible), Volley de plage (disponible)
[...]

=== MÉTÉO ACTUELLE ===
28°C, Ensoleillé, Humidité 65%

=== ATTRACTIONS PROCHES ===
1. Médina de Hammamet (0.5 km) - Gratuit
   Adapté pour: couples, familles
[...]
```

Ensuite, `extractRelevantContext(message, fullKnowledge)` filtre ce texte pour ne garder que les sections pertinentes à la question posée. Par exemple, si la question parle de "restaurant" ou "petit-déjeuner", seule la section restaurant est gardée.

---

## Étape 5 — Session et historique (`lib/session-state.ts`)

L'historique de la conversation est stocké dans **Redis** (TTL 24h) sous la clé `session:{sessionId}`.

Format stocké :
```json
{
  "conversationHistory": [
    { "role": "user", "content": "Bonjour" },
    { "role": "assistant", "content": "Bonjour ! Comment puis-je vous aider ?" }
  ]
}
```

Cet historique est envoyé à Groq à chaque message pour que l'IA se souvienne de ce qui a été dit avant.

---

## Étape 6 — Appel à Groq (`lib/ai-service.ts`)

Le prompt système dit à l'IA :
- Tu es un assistant informatif pour l'hôtel (tu ne peux PAS faire de réservations)
- Tu dois utiliser uniquement les informations fournies dans le contexte
- Tu dois répondre dans la langue du client (détection automatique)
- Si tu ne sais pas, donne le numéro de téléphone de la réception

**Paramètres Groq :**
- Modèle : `llama-3.3-70b-versatile`
- Température : `0.3` (réponses cohérentes et précises)
- Max tokens : `1024`

**Cache des réponses IA :**
Pour les questions sans historique de conversation (donc questions génériques), la réponse est mise en cache dans Redis pendant **1 heure** avec une clé basée sur un hash MD5 du `(message + contexte)`.

---

## Étape 7 — Images d'événements (`lib/event-image-helper.ts`)

Après la réponse IA, si l'IA a mentionné un événement qui a une image, la fonction `appendEventImages()` ajoute des balises spéciales à la fin :

```
[IMAGE:/uploads/events/event_123.jpg]
```

Le frontend détecte ces balises et les remplace par de vraies balises `<img>` dans la bulle de message.

---

## Étape 8 — Analytics (non-bloquant)

Les analytics sont trackées **en arrière-plan** avec `.catch(() => {})` pour ne pas ralentir la réponse :

```typescript
// Non-bloquant : on ne attend pas ces promesses
detectQuestionCategory(message) // → "facilities", "dining", etc.
trackQuestionCategory(hotelId, category, subcategory).catch(() => {})
topics.forEach(t => trackPopularTopic(hotelId, t).catch(() => {}))
```

---

## Détection de langue

`lib/analytics.ts` → `detectLanguage(message)` :

| Langue | Méthode de détection |
|---|---|
| Arabe | Codes caractères Unicode (0x0600–0x06FF) |
| Français | Mots-clés : `bonjour`, `merci`, `hôtel`, `restaurant`, ... |
| Allemand | Mots-clés : `guten`, `bitte`, `hotel`, ... |
| Espagnol | Mots-clés : `hola`, `gracias`, `habitación`, ... |
| Italien | Mots-clés : `ciao`, `prego`, `camera`, ... |
| Anglais | Défaut si aucun autre ne correspond |

L'IA répond automatiquement dans la langue détectée.

---

## Personnalisation des attractions

Quand un client a un profil (après l'inscription), `lib/personalized-attractions.ts` calcule un score pour chaque attraction :

| Critère | Points |
|---|---|
| Type de groupe correspondant (couple, famille, ...) | +25 |
| Tranche d'âge correspondante | +15 |
| Météo adaptée (soleil, pluie, ...) | +20 |
| Température adaptée | +15 |
| But du voyage correspondant | +5 à +15 |
| Priorité d'ordre | ×2 (multiplicateur) |

Les attractions avec le score le plus élevé sont injectées en premier dans le contexte RAG.
