# Espace Admin

---

## Accès à l'espace admin

L'espace admin comprend deux zones :

| URL | Fichier | Accès |
|---|---|---|
| `/admin/login` | `app/admin/login/page.tsx` | Public |
| `/dashboard` | `app/dashboard/page.tsx` | JWT requis |
| `/admin/analytics` | `app/admin/analytics/page.tsx` | JWT requis |

---

## Authentification JWT

### Connexion : `POST /api/admin/login`

Le fichier `app/api/admin/login/route.ts` :

1. Vérifie le **rate limit** : maximum 5 tentatives de connexion par fenêtre de 5 minutes (par IP)
2. Récupère `username` et `password` depuis le corps de la requête
3. Valide avec Zod (champs requis, longueur max)
4. Compare `username` avec `ADMIN_USERNAME` (variable d'environnement)
5. Compare `password` avec `ADMIN_PASSWORD_HASH` (bcrypt, 12 rounds)
6. Si les identifiants sont incorrects → attente de **2 secondes** avant de répondre (protection contre les attaques par timing)
7. Si ok → génère un **JWT** avec :
   - `sub` : username
   - `iss` : `hotel-assistant`
   - `aud` : `hotel-admin`
   - `exp` : 24 heures
8. Retourne le token

Le token est stocké dans **localStorage** côté client.

### Vérification : `GET /api/admin/verify`

Vérifie que le token JWT est valide :
- Extrait le Bearer token de l'en-tête `Authorization`
- Vérifie la signature avec `JWT_SECRET`
- Vérifie `iss` et `aud`
- Si valide → retourne l'objet décodé
- Si invalide → 401

### Protection des pages admin

`app/dashboard/layout.tsx` vérifie le token **à chaque chargement de page** :
```typescript
const token = localStorage.getItem('admin_token')
if (!token) redirect('/admin/login')

const res = await fetch('/api/admin/verify', {
  headers: { Authorization: `Bearer ${token}` }
})
if (!res.ok) redirect('/admin/login')
```

---

## Dashboard de gestion (`/dashboard`)

Fichier : `app/dashboard/page.tsx`

Ce dashboard permet à l'admin de modifier les informations de chaque hôtel via une interface à onglets.

### Sections modifiables

**Onglet Équipements :**
- Piscine : horaires d'ouverture/fermeture, disponible oui/non
- Spa : horaires, traitements disponibles (liste)
- Salle de sport : horaires, disponible
- Club enfants : horaires, tranche d'âge acceptée

**Onglet Restaurant :**
- Petit-déjeuner : heure début/fin, type de service, salle
- Déjeuner : même structure
- Dîner : même structure

**Onglet Événements :**
- Liste des événements existants
- Ajouter un nouvel événement : titre, description, date, heure, lieu, prix
- Upload d'image pour l'événement (POST `/api/upload/event-image`)
- Supprimer un événement

**Onglet Contact :**
- Numéro de téléphone principal
- Email
- Adresse
- Numéro d'urgence 24h/24

**Onglet Équipements/Services :**
- WiFi disponible oui/non, mot de passe WiFi
- Parking disponible oui/non, tarif
- Heure de check-in, heure de check-out

### Sauvegarde

Le bouton "Enregistrer" envoie `POST /api/hotel-settings` avec :
- Le token JWT dans l'en-tête `Authorization`
- `hotelId` : l'hôtel sélectionné
- `settings` : l'objet complet des nouveaux paramètres

Le serveur vérifie le JWT, met à jour la base de données, et invalide le cache Redis.

---

## Dashboard Analytics (`/admin/analytics`)

Voir [docs/04-ANALYTICS.md](04-ANALYTICS.md) pour le détail complet.

En résumé : affiche les graphiques des questions posées et des profils clients, avec filtres par hôtel et par période.

---

## Gestion des réservations

### `GET /api/admin/reservations?hotelId=sindbad-hammamet`
Retourne toutes les réservations pour un hôtel. JWT requis.

**Réponse :**
```json
[
  {
    "id": 1,
    "guest_name": "Ahmed Ben Ali",
    "phone_number": "+33 6 12 34 56 78",
    "room_number": "305",
    "email": "ahmed@email.com",
    "status": "pending",
    "event_title": "Soirée Orientale",
    "event_date": "2026-05-20",
    "created_at": "2026-04-18T14:30:00Z"
  }
]
```

### `PATCH /api/admin/reservations`
Mettre à jour le statut d'une réservation. JWT requis.

**Corps :**
```json
{
  "id": 1,
  "status": "confirmed"
}
```

Statuts possibles : `pending`, `confirmed`, `cancelled`.

---

## Variables d'environnement pour l'admin

```env
JWT_SECRET=une-chaine-aleatoire-tres-longue-et-secrete
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=$2a$12$...  # Généré avec bcrypt (12 rounds)
```

Pour générer le hash du mot de passe admin :
```javascript
const bcrypt = require('bcryptjs')
const hash = await bcrypt.hash('votre-mot-de-passe', 12)
console.log(hash) // → $2a$12$...
```
