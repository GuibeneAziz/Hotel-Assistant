# Installation et Configuration

---

## Prérequis

- **Node.js** 18 ou supérieur
- **npm** 9 ou supérieur
- Un compte **NeonDB** (PostgreSQL serverless) ou PostgreSQL local
- Un compte **Upstash** (Redis serverless) ou Redis local
- Une clé API **Groq** (gratuite sur console.groq.com)

---

## 1. Cloner et installer

```bash
git clone <url-du-repo>
cd "Next level 2"
npm install
```

---

## 2. Variables d'environnement

Créer le fichier `.env.local` à la racine du projet :

```env
# Base de données PostgreSQL (NeonDB)
DATABASE_URL=postgres://user:password@host/dbname?sslmode=require

# Redis (Upstash)
REDIS_URL=rediss://default:password@host:port

# IA Groq
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# JWT Admin
JWT_SECRET=une-chaine-aleatoire-de-minimum-32-caracteres

# Compte Admin
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=$2a$12$...   # Voir section "Créer un compte admin" ci-dessous

# Environnement
NODE_ENV=development
PORT=3001
```

**Important :** `.env.local` est dans `.gitignore`. Ne le commitez jamais.

---

## 3. Créer le compte admin

Le mot de passe admin n'est **jamais** stocké en clair. Il faut d'abord le hasher avec bcrypt.

Lancer ce script une seule fois dans Node.js :

```javascript
const bcrypt = require('bcryptjs')

async function main() {
  const password = 'votre-mot-de-passe-fort'
  const hash = await bcrypt.hash(password, 12)
  console.log('ADMIN_PASSWORD_HASH=' + hash)
}
main()
```

Copier le résultat (`$2a$12$...`) dans `.env.local`.

---

## 4. Initialiser la base de données

La base de données doit avoir les tables décrites dans [docs/02-DATABASE.md](02-DATABASE.md).

Si vous avez un fichier SQL de migration :
```bash
psql $DATABASE_URL < prisma/migrations/init.sql
```

---

## 5. Lancer l'application

```bash
# Développement (hot reload, port 3001)
npm run dev

# Production
npm run build
npm start
```

L'application est disponible sur **http://localhost:3001**

---

## 6. Pages disponibles

| URL | Description |
|---|---|
| `http://localhost:3001/` | Accueil — sélection d'hôtel |
| `http://localhost:3001/hotel/sindbad-hammamet` | Chat Hôtel Sindbad |
| `http://localhost:3001/hotel/paradise-hammamet` | Chat Paradise Beach |
| `http://localhost:3001/hotel/movenpick-sousse` | Chat Mövenpick Sousse |
| `http://localhost:3001/admin/login` | Connexion admin |
| `http://localhost:3001/dashboard` | Dashboard gestion hôtel |
| `http://localhost:3001/admin/analytics` | Dashboard analytics |

---

## 7. Commandes utiles

```bash
# Lancer les tests de connexion Redis
node test-redis.js

# Lancer les tests analytics
node test-analytics.js

# Nettoyer le cache Redis
node clear-cache.js

# Nettoyer la base de données (dev uniquement)
node cleanup-database.js
```

---

## 8. Structure des fichiers uploadés

Les images d'événements uploadées sont stockées dans :
```
public/uploads/events/event_{timestamp}_{random}.jpg
```

Ce dossier doit exister avant le premier upload :
```bash
mkdir -p public/uploads/events
```

---

## 9. Déploiement en production

### Variables à modifier pour la production
- `NODE_ENV=production`
- `DATABASE_URL` → URL de production NeonDB
- `REDIS_URL` → URL de production Upstash
- `JWT_SECRET` → Chaîne aléatoire longue et unique

### Comportement en production vs développement
| Comportement | Développement | Production |
|---|---|---|
| Cache Redis hôtel | Désactivé | 1 heure |
| HSTS (force HTTPS) | Non | Oui (1 an) |
| Next.js hot reload | Oui | Non |
| Logs détaillés | Oui | Réduits |

---

## 10. Dépannage courant

**Erreur : "Cannot connect to database"**
→ Vérifier `DATABASE_URL` dans `.env.local`
→ Vérifier que les tables existent (voir section 4)

**Erreur : "Redis connection failed"**
→ Le système continue de fonctionner sans Redis (fail open)
→ Vérifier `REDIS_URL` pour rétablir le cache

**Erreur : "GROQ_API_KEY not configured"**
→ L'IA ne peut pas répondre
→ Ajouter `GROQ_API_KEY` dans `.env.local`

**Erreur 401 sur le dashboard admin**
→ Le token JWT a expiré (durée : 24h)
→ Se reconnecter sur `/admin/login`
