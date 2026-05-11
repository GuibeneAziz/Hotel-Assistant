# Système d'Analytics

---

## Objectif

L'analytics permet à l'administrateur de comprendre :
- Qui sont les clients (âge, nationalité, type de groupe, but du voyage)
- Ce qu'ils demandent le plus (catégories de questions)
- Quels sujets sont les plus populaires (et avec quel sentiment)

Tout le tracking se fait **automatiquement** lors des conversations, sans que le client le sache ni que ça ralentisse les réponses.

---

## Fichiers concernés

- `lib/analytics.ts` — toute la logique de tracking et de requêtes
- `app/api/analytics/` — routes API pour récupérer les données
- `app/admin/analytics/page.tsx` — dashboard visuel avec graphiques

---

## 1. Profil client (`guest_profiles`)

Quand un client complète le formulaire d'inscription, ces données sont sauvegardées :

```typescript
// POST /api/analytics/guest-profile
{
  sessionId: "session_1714500000_abc123",
  hotelId: "sindbad-hammamet",
  ageRange: "26-35",
  nationality: "French",
  travelPurpose: "leisure",
  groupType: "couple"
}
```

La requête SQL utilise `ON CONFLICT (session_id) DO UPDATE` — si le client revient, son profil est mis à jour.

Le champ `total_interactions` s'incrémente à chaque message envoyé.

---

## 2. Catégories de questions (`question_categories`)

### Détection automatique

La fonction `detectQuestionCategory(message)` dans `lib/analytics.ts` analyse chaque message et retourne :
- `category` : catégorie principale
- `subcategory` : sous-catégorie précise
- `topics` : liste de sujets détectés

**Catégories disponibles :**

| Catégorie | Mots-clés détectés (exemples) |
|---|---|
| `facilities` | piscine, pool, spa, gym, salle de sport, hammam |
| `dining` | restaurant, petit-déjeuner, buffet, dîner, manger |
| `activities` | activité, sport, animation, excursion |
| `location` | plage, medina, medina, distance, aller |
| `booking` | réservation, réserver, disponible, chambre |
| `weather` | météo, temps, température, pluie, soleil |
| `amenities` | wifi, parking, climatisation, coffre-fort |
| `events` | événement, spectacle, soirée, concert |
| `general` | (défaut si rien ne correspond) |

### Sauvegarde en base

`trackQuestionCategory(hotelId, category, subcategory)` :

```sql
INSERT INTO question_categories (hotel_id, date, category, subcategory, total_count)
VALUES ($1, CURRENT_DATE, $2, $3, 1)
ON CONFLICT (hotel_id, date, category, subcategory)
DO UPDATE SET total_count = question_categories.total_count + 1
```

Si la tranche d'âge du client est connue, la colonne correspondante est aussi incrémentée (`age_18_25`, `age_26_35`, `age_36_50`, `age_50_plus`).

---

## 3. Sujets populaires (`popular_topics`)

`trackPopularTopic(hotelId, topic, sentiment)` :

Le sentiment est `positive`, `negative` ou `neutral`. Il est déduit du contexte du message.

```sql
INSERT INTO popular_topics (hotel_id, topic, mention_count, positive_count, ...)
VALUES ($1, $2, 1, ...)
ON CONFLICT (hotel_id, topic)
DO UPDATE SET mention_count = popular_topics.mention_count + 1, ...
```

---

## 4. Routes API Analytics

### `GET /api/analytics/overview`

Résumé global. Paramètres : `hotelId` (optionnel), `timeRange` (`1d`, `7d`, `30d`).

**Retourne :**
```json
{
  "totalGuests": 142,
  "totalInteractions": 857,
  "mostActiveHotel": "sindbad-hammamet",
  "topCategory": "facilities",
  "avgInteractions": 6.0,
  "timeRange": "7d"
}
```

---

### `GET /api/analytics/demographics`

Paramètres : `hotelId` (requis), `timeRange` (optionnel).

**Retourne :**
```json
{
  "nationalities": [
    { "nationality": "French", "count": 45 },
    { "nationality": "German", "count": 23 },
    ...
  ],
  "ageGroups": [
    { "range": "26-35", "count": 67 },
    ...
  ],
  "travelPurposes": [
    { "purpose": "leisure", "count": 98 },
    ...
  ],
  "groupTypes": [
    { "type": "couple", "count": 54 },
    ...
  ]
}
```

Les nationalités sont normalisées avec du **fuzzy matching** (ex: "France", "française", "french" → "French").

---

### `GET /api/analytics/questions`

Paramètres : `hotelId` (optionnel), `timeRange` (optionnel).

**Retourne :**
```json
{
  "categories": [
    { "category": "facilities", "count": 234 },
    { "category": "dining", "count": 187 },
    ...
  ],
  "topSubcategories": [
    { "subcategory": "pool", "count": 89 },
    { "subcategory": "restaurant", "count": 76 },
    ...
  ],
  "questionsOverTime": [
    { "date": "2026-04-14", "count": 45 },
    { "date": "2026-04-15", "count": 62 },
    ...
  ]
}
```

---

### `GET /api/analytics/dashboard`

Route complète, retourne tout en une seule requête parallèle :
- `mostAskedQuestions` : top 10 questions des 30 derniers jours
- `demographics` : profils clients
- `popularActivities` : sujets avec comptes positif/négatif/neutre
- `satisfaction` : score moyen calculé depuis le ratio positif/négatif

---

## 5. Dashboard Analytics (`app/admin/analytics/page.tsx`)

Le dashboard affiche les données sous forme de graphiques Recharts :

| Graphique | Type | Source |
|---|---|---|
| Catégories de questions | Bar chart | `/api/analytics/questions` |
| Top sous-catégories | Bar chart horizontal | `/api/analytics/questions` |
| Évolution dans le temps | Line/Area chart | `/api/analytics/questions` |
| Nationalités | Pie chart | `/api/analytics/demographics` |
| Tranches d'âge | Pie chart | `/api/analytics/demographics` |
| Types de groupe | Pie chart | `/api/analytics/demographics` |
| Buts du voyage | Bar chart | `/api/analytics/demographics` |
| Total clients / interactions | Cards statistiques | `/api/analytics/overview` |

**Filtres disponibles dans le dashboard :**
- Hôtel : "Tous les hôtels" ou un hôtel spécifique
- Période : 1 jour, 7 jours, 30 jours

Les données sont chargées avec **SWR** (auto-refresh, déduplication des requêtes). Un bouton "Actualiser" force le rechargement manuel.

---

## Exemple complet : une question déclenche le tracking

1. Client envoie : *"À quelle heure est le petit-déjeuner ?"*
2. `/api/chat` appelle `detectQuestionCategory("À quelle heure est le petit-déjeuner ?")`
3. Résultat : `{ category: "dining", subcategory: "breakfast", topics: ["restaurant", "breakfast"] }`
4. (En arrière-plan) :
   - `trackQuestionCategory("sindbad-hammamet", "dining", "breakfast")` → incrémente la ligne dans `question_categories`
   - `trackPopularTopic("sindbad-hammamet", "restaurant", "neutral")` → incrémente dans `popular_topics`
   - `trackPopularTopic("sindbad-hammamet", "breakfast", "neutral")` → idem
5. L'IA répond normalement, le client ne voit rien de tout ça
