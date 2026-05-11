# Sécurité — Mesures OWASP Implémentées

---

## Vue d'ensemble

Ce projet suit les recommandations de l'**OWASP Top 10**. Voici chaque mesure, où elle est implémentée, et comment elle fonctionne.

---

## 1. Injection SQL (A03)

**Risque :** Un attaquant envoie du SQL dans un champ pour manipuler la base de données.

**Protection :** Toutes les requêtes dans `lib/db.ts` utilisent des **paramètres positionnels** (`$1`, `$2`, ...) :

```typescript
// ✅ Correct — le paramètre est envoyé séparément, jamais interpolé
await pool.query(
  'SELECT * FROM hotels WHERE id = $1',
  [hotelId]
)

// ❌ Dangereux — jamais fait dans ce projet
await pool.query(`SELECT * FROM hotels WHERE id = '${hotelId}'`)
```

La bibliothèque `pg` garantit que les valeurs sont toujours traitées comme des données, jamais comme du SQL.

---

## 2. XSS — Cross-Site Scripting (A03)

**Risque :** Un attaquant injecte du `<script>` dans un message qui s'exécute dans le navigateur d'un autre utilisateur.

**Protection :**

**`lib/validation.ts` → `sanitizeHtml(input)`**
```typescript
import DOMPurify from 'isomorphic-dompurify'

function sanitizeHtml(input: string): string {
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [] }) // Supprime TOUT le HTML
}
```

**`lib/validation.ts` → `sanitizeString(input)`**
Échappe les caractères dangereux :
```typescript
input.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')...
```

Tous les messages passent par ces fonctions **avant** d'être traités ou sauvegardés.

---

## 3. Authentification cassée (A07)

**Risque :** Mots de passe faibles, tokens non expirés, brute force.

**Protections :**

**Bcrypt (12 rounds) dans `lib/password.ts` :**
```typescript
await bcrypt.hash(password, 12) // 12 rounds = ~1 seconde de calcul
```
12 rounds rend le brute force très lent (~1 million de tentatives prend des années).

**JWT avec expiration dans `/api/admin/login` :**
```typescript
jwt.sign({ sub: username }, secret, {
  expiresIn: '24h',
  issuer: 'hotel-assistant',
  audience: 'hotel-admin'
})
```

**Rate limiting sur le login dans `/api/admin/login` :**
- Maximum **5 tentatives** par 5 minutes par IP
- Après dépassement → erreur 429

**Délai sur échec dans `/api/admin/login` :**
```typescript
if (!isValid) {
  await new Promise(resolve => setTimeout(resolve, 2000)) // 2 secondes de délai
  return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
}
```
Ce délai empêche de mesurer le temps de réponse pour deviner si le nom d'utilisateur est valide (attaque par timing).

---

## 4. Rate Limiting — Déni de service (A05)

**Risque :** Un bot envoie des milliers de requêtes pour épuiser les ressources (coûts API Groq, base de données).

**Protection :** `lib/rate-limiter.ts` — algorithme de **fenêtre glissante** avec Redis sorted sets.

| Endpoint | Limite | Fenêtre |
|---|---|---|
| `/api/chat` | 30 requêtes | 15 minutes |
| `/api/admin/login` | 5 requêtes | 5 minutes |
| API générales | 100 requêtes | 5 minutes |
| Routes admin | 50 requêtes | 5 minutes |

**Fonctionnement technique :**
```typescript
// Ajoute l'horodatage actuel dans un sorted set Redis
await redis.zadd(key, now, `${now}`)
// Supprime les entrées hors de la fenêtre glissante
await redis.zremrangebyscore(key, '-inf', now - windowMs)
// Compte les entrées restantes
const count = await redis.zcard(key)
if (count > limit) → 429
```

**Fail open :** Si Redis est indisponible, le rate limiting est désactivé pour ne pas bloquer les utilisateurs légitimes.

**En-têtes de réponse ajoutés :**
```
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 27
X-RateLimit-Reset: 1714500900
Retry-After: 240
```

---

## 5. En-têtes de sécurité HTTP (`middleware.ts`)

`middleware.ts` s'exécute **avant** chaque requête vers `/api/*` et ajoute ces en-têtes :

| En-tête | Valeur | Protection |
|---|---|---|
| `X-Content-Type-Options` | `nosniff` | Empêche le navigateur de deviner le type MIME |
| `X-Frame-Options` | `DENY` | Empêche l'inclusion dans une iframe (clickjacking) |
| `X-XSS-Protection` | `1; mode=block` | Active le filtre XSS du navigateur |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limite les informations envoyées dans Referer |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Désactive les APIs sensibles |
| `Content-Security-Policy` | `default-src 'self'; script-src 'self' 'unsafe-inline'` | Restreint les sources de scripts |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | Force HTTPS (production uniquement) |

---

## 6. Validation des entrées (A03)

**Toutes les entrées d'API sont validées avec Zod** avant traitement.

Exemples :
```typescript
// lib/validation.ts
const chatMessageSchema = z.object({
  message: z.string().min(1).max(1000),
  hotelData: z.object({
    id: z.string(),
    name: z.string()
  }),
  sessionId: z.string()
})
```

Si la validation échoue → 400 avec les erreurs détaillées (mais pas de stack trace).

---

## 7. Upload de fichiers sécurisé (`/api/upload/event-image`)

**Risques :** Upload de fichiers malveillants (PHP, exe...), déni de service par gros fichiers.

**Protections :**
- Types MIME vérifiés : uniquement `image/jpeg`, `image/png`, `image/webp`, `image/gif`
- Taille max : **5 MB**
- Nom de fichier généré aléatoirement (pas de nom original conservé)
- Fichiers stockés dans `public/uploads/events/` (pas exécutables par le serveur)

---

## 8. Variables d'environnement sensibles (`lib/env.ts`)

**Protection :** Les secrets ne sont jamais exposés au frontend.

`lib/env.ts` → `getAuthEnv()` lit `JWT_SECRET`, `ADMIN_PASSWORD_HASH` uniquement côté serveur. Next.js garantit que les fichiers `lib/` ne sont jamais envoyés au navigateur sauf s'ils sont explicitement importés dans un composant client.

Le fichier `.env.local` est dans `.gitignore` pour ne jamais être committé.

---

## Résumé rapide

| Attaque | Protection |
|---|---|
| Injection SQL | Requêtes paramétrées (`$1`, `$2`) |
| XSS | DOMPurify + échappement HTML |
| Brute force admin | Rate limiting + délai sur échec |
| Tokens volés | JWT expirant + vérification iss/aud |
| Déni de service | Rate limiting Redis sur tous les endpoints |
| Clickjacking | `X-Frame-Options: DENY` |
| MIME sniffing | `X-Content-Type-Options: nosniff` |
| Upload malveillant | Vérification MIME + taille + nom aléatoire |
| Mots de passe faibles | Bcrypt 12 rounds + complexité minimale |
