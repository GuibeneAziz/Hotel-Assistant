# Architecture du Projet

---

## Technologies utilisées

| Couche | Technologie | Rôle |
|---|---|---|
| Frontend | Next.js 14 (App Router) + React 18 | Interface utilisateur |
| Backend | Next.js API Routes (HTTP) | Logique serveur |
| Base de données | PostgreSQL via NeonDB | Stockage persistant |
| Cache | Redis via Upstash | Cache réponses + sessions |
| IA | Groq SDK (LLaMA 3.3 70B) | Génération des réponses chat |
| Authentification | JWT (jsonwebtoken) | Accès admin sécurisé |
| Styles | Tailwind CSS + Framer Motion | UI + animations |
| Graphiques | Recharts | Dashboard analytics |
| Validation | Zod + DOMPurify | Sécurité des entrées |

---

## Flux de données : parcours complet d'un client

```
1. Le client ouvre http://localhost:3001
        ↓
2. app/page.tsx affiche les 3 hôtels
        ↓
3. Le client clique sur un hôtel → /hotel/sindbad-hammamet
        ↓
4. app/hotel/[id]/page.tsx charge :
   - GET /api/hotel-settings → informations de l'hôtel depuis la base de données
   - API OpenMeteo → météo actuelle (coordonnées GPS de Hammamet)
        ↓
5. Formulaire d'inscription : GuestRegistrationForm.tsx
   - Collecte : tranche d'âge, nationalité, but du voyage, type de groupe
   - POST /api/analytics/guest-profile → sauvegarde dans guest_profiles
   - Génère un sessionId = "session_{timestamp}_{random}"
        ↓
6. Le client envoie un message dans le chat
        ↓
7. POST /api/chat ou POST /api/chat/stream
   - Vérifie le rate limit (30 msg / 15 min)
   - Valide et nettoie l'entrée (Zod + DOMPurify)
   - Charge les paramètres hôtel (depuis Redis ou DB)
   - Récupère l'historique de session (Redis)
   - Construit la base de connaissances RAG (lib/rag-knowledge.ts)
   - Appelle Groq AI avec le contexte
   - Renvoie la réponse (stream SSE ou JSON)
   - Track les analytics en arrière-plan (non-bloquant)
        ↓
8. La réponse s'affiche dans le chat
   - Les balises [IMAGE:url] sont converties en images réelles
```

---

## Flux de données : parcours admin

```
1. L'admin ouvre /admin/login
        ↓
2. POST /api/admin/login
   - Vérifie username + password (bcrypt, 12 rounds)
   - Génère un JWT (expire dans 24h)
   - Stocké dans localStorage
        ↓
3. Redirigé vers /dashboard
        ↓
4. app/dashboard/layout.tsx vérifie le JWT à chaque chargement
   - GET /api/admin/verify → valide le token
   - Si invalide → redirigé vers /admin/login
        ↓
5. L'admin modifie les paramètres hôtel
   - POST /api/hotel-settings (JWT requis)
   - Sauvegarde en base de données
   - Invalide le cache Redis
        ↓
6. L'admin consulte les analytics
   - /admin/analytics
   - Appelle : /api/analytics/overview, /api/analytics/demographics, /api/analytics/questions
```

---

## Système de cache Redis

Le cache Redis évite les requêtes répétées à la base de données et à l'IA.

| Clé Redis | Contenu | Durée |
|---|---|---|
| `hotel:settings:all` | Tous les paramètres hôtels (JSON) | 1 heure |
| `ai:response:{hash_MD5}` | Réponses IA en cache (questions communes) | 1 heure |
| `session:{sessionId}` | Historique de conversation du client | 24 heures |
| `rate_limit:{type}:{ip}` | Compteur rate limiting (sorted set Redis) | Fenêtre glissante |

**Important** : Si Redis est indisponible, le système continue de fonctionner (fail open). Il charge les données directement depuis la base de données et l'IA répond sans cache.

---

## Fichiers principaux et leurs rôles

### `lib/db.ts`
Contient le pool de connexions PostgreSQL (20 connexions max) et **toutes les requêtes SQL**. C'est le seul fichier qui parle directement à la base de données. Voir [docs/02-DATABASE.md](02-DATABASE.md) pour le détail.

### `lib/rag-knowledge.ts`
RAG = "Retrieval-Augmented Generation". Ce fichier construit un texte de contexte structuré à partir des données de l'hôtel (horaires, équipements, événements, attractions). Ce texte est injecté dans le prompt de l'IA pour qu'elle réponde avec les vraies informations de l'hôtel.

### `lib/ai-service.ts`
Appelle l'API Groq avec le modèle `llama-3.3-70b-versatile`. Deux modes :
- `generateResponse()` : retourne la réponse complète en une fois
- `generateResponseStream()` : retourne les mots au fur et à mesure (streaming)

### `lib/analytics.ts`
Détecte dans quel catégorie tombe chaque question client (ex: "Quelle heure ouvre la piscine ?" → catégorie "facilities") et sauvegarde en base de données pour les graphiques du dashboard.

### `middleware.ts`
S'exécute **avant** chaque requête vers `/api/*`. Ajoute des en-têtes HTTP de sécurité (CSP, X-Frame-Options, etc.). Ne touche pas à la logique métier.

---

## Communication entre le frontend et le backend

Tout passe par **HTTP standard** (pas de WebSocket). Le streaming du chat utilise **Server-Sent Events (SSE)** via `/api/chat/stream` :

```
Client                          Serveur
  |                                |
  |--- POST /api/chat/stream ----->|
  |                                | ← Commence à générer avec Groq
  |<--- data: {"chunk":"Bon"}  ----|
  |<--- data: {"chunk":"jour"} ----|
  |<--- data: {"chunk":"!"}    ----|
  |<--- data: {"done":true}    ----|
  |                                |
```

Le client lit ces événements et ajoute chaque `chunk` à la bulle de message en temps réel, donnant l'effet "l'IA écrit en direct".
