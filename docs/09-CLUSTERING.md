# Clustering — Comprendre et Appliquer au Projet

---

## C'est quoi le clustering ? (Explication from scratch)

Imagine que tu travailles dans un grand hôtel et que tu as devant toi 1000 fiches d'invités. Tu dois les trier à la main pour comprendre qui sont tes clients. Naturellement, tu vas commencer à remarquer des groupes :

- "Tiens, ces 200 personnes sont toutes des jeunes couples en lune de miel, ils demandent tous le spa et la plage"
- "Ces 150 personnes sont des familles avec enfants, elles cherchent le kids club et les animations"
- "Ces 80 personnes voyagent seules pour le business, elles veulent le wifi et les horaires du restaurant"

Tu viens de faire du **clustering à la main**. Le clustering en informatique fait exactement la même chose, mais automatiquement sur des milliers de profils, en trouvant les groupes naturels qui existent dans les données.

**Définition simple :** Le clustering, c'est un algorithme qui regroupe automatiquement des données similaires ensemble, sans qu'on lui dise à l'avance quels groupes existent.

---

## Pourquoi c'est utile ici ?

Notre projet actuel utilise un système de recommandation d'attractions basé sur des règles écrites à la main :

```
Si l'invité est un couple → +25 points pour les attractions "couple"
Si l'invité a 18-25 ans   → +15 points pour les attractions "jeune"
Si il fait soleil         → +20 points pour les attractions "soleil"
```

**Le problème :** Ces poids (+25, +15, +20) ont été inventés. Personne ne sait si c'est vraiment les bons chiffres. Et surtout, le système ne s'améliore jamais — après 10 000 clients, il fait exactement les mêmes recommandations qu'au premier jour.

**Avec le clustering :** L'algorithme analyse les vraies données de tes clients réels, découvre les vrais groupes qui existent, et apprend quelles attractions chaque groupe préfère vraiment.

---

## L'algorithme K-Means — Comment ça marche

K-Means est l'algorithme de clustering le plus simple et le plus utilisé. Voici comment il fonctionne étape par étape.

### Le concept de "distance"

Pour regrouper des choses, il faut mesurer à quel point deux profils se ressemblent. En mathématiques, on mesure ça avec une **distance**.

Exemple simplifié : si on représente chaque invité par seulement deux chiffres (âge et budget), on peut les placer sur un graphique :

```
Budget
  ^
  |    • (25 ans, 200€)   • (23 ans, 180€)
  |    • (27 ans, 220€)
  |
  |                          • (52 ans, 800€)
  |                          • (55 ans, 750€)
  |
  +---------------------------------> Age
```

On voit clairement deux groupes. K-Means va les trouver automatiquement.

### Les étapes de l'algorithme

**Étape 1 — Choisir K**
On décide à l'avance combien de groupes on veut. K=6 par exemple.

**Étape 2 — Placer K centres au hasard**
L'algorithme place 6 points aléatoires dans les données. Ces points s'appellent des **centroïdes** (centres de groupe).

**Étape 3 — Assigner chaque invité au centroïde le plus proche**
Chaque profil rejoint le groupe dont le centre est le plus proche.

**Étape 4 — Recalculer les centroïdes**
Pour chaque groupe, on calcule le nouveau centre (la moyenne de tous les membres du groupe).

**Étape 5 — Répéter jusqu'à stabilisation**
On répète les étapes 3 et 4 jusqu'à ce que les groupes ne changent plus.

```
Itération 1 :   Itération 2 :   Itération finale :
  • * •           •*•              •+•
  * C *           *C*              *C*    ← C = centroïde stable
  • * •           •*•              •+•
```

---

## Comment on transforme un profil invité en chiffres

L'algorithme K-Means travaille avec des chiffres, pas des mots. Il faut donc convertir chaque profil en un **vecteur numérique**.

Prenons un exemple concret. Un invité avec ce profil :
```
ageRange      : "18-25"
groupType     : "couple"
travelPurpose : "honeymoon"
nationality   : "French"
temperature   : 28°C
isRainy       : false
```

On le convertit ainsi :

| Attribut | Méthode | Résultat |
|---|---|---|
| ageRange "18-25" | One-hot encoding | `[1, 0, 0, 0]` |
| groupType "couple" | One-hot encoding | `[0, 1, 0, 0]` |
| travelPurpose "honeymoon" | One-hot encoding | `[0, 0, 0, 1]` |
| nationality "French" | One-hot encoding | `[0, 1, 0, 0, ...]` |
| temperature 28°C | Normalisation 0-1 | `[0.75]` |
| isRainy false | Binaire | `[0]` |

**One-hot encoding** : Si il y a 4 valeurs possibles pour `ageRange` (`18-25`, `26-35`, `36-50`, `50+`), on crée 4 colonnes et on met 1 dans la colonne qui correspond, 0 dans les autres.

**Vecteur final de l'invité :**
```
[1,0,0,0,  0,1,0,0,  0,0,0,1,  0,1,0,0,...,  0.75,  0]
```

Chaque invité devient un point dans un espace à N dimensions. Le clustering trouve les groupes naturels dans cet espace.

---

## Ce que le clustering va découvrir dans notre projet

En entraînant K-Means sur nos données `guest_profiles`, l'algorithme va probablement découvrir des clusters comme ceux-ci (pas définis à la main — découverts automatiquement) :

| Cluster | Profil typique découvert | Attractions préférées |
|---|---|---|
| **Cluster 0** | Jeunes couples, lune de miel, 28°C+ | Plage, spa, restaurants romantiques |
| **Cluster 1** | Familles, enfants, loisirs | Kids club, aquapark, animations |
| **Cluster 2** | Solo 18-35, aventure, loisirs | Sports nautiques, excursions, médina |
| **Cluster 3** | Couples 36-50, honeymoon/leisure | Spa haut de gamme, culture, gastronomie |
| **Cluster 4** | Seniors 50+, culture, calme | Musées, médina, balades, histoire |
| **Cluster 5** | Business, 26-35, solo | Restaurants efficaces, pas d'attractions |

Ces groupes **émergent des données réelles** — si notre vrai public est différent, les clusters seront différents.

---

## Architecture complète dans le projet

Voici comment le système fonctionnerait de bout en bout.

### Vue globale

```
[Données historiques guest_profiles]
          ↓
    [Script Python - Entraînement K-Means]
          ↓
    [Fichier JSON - centroids.json]
          ↓
    [lib/cluster-matcher.ts - chargé au démarrage]
          ↓
    [Nouveau client → assignation en temps réel]
          ↓
    [Recommandations basées sur les préférences du cluster]
```

---

### Composant 1 — Script d'entraînement (Python, hors-ligne)

Fichier : `scripts/train_clustering.py`

Ce script tourne une fois par semaine (ou manuellement). Il :
1. Charge tous les profils depuis PostgreSQL
2. Vectorise les profils
3. Entraîne K-Means
4. Sauvegarde les centroïdes en JSON

```python
import psycopg2
import json
import numpy as np
from sklearn.cluster import KMeans
from sklearn.preprocessing import OneHotEncoder, MinMaxScaler

# 1. Charger les données
conn = psycopg2.connect("postgresql://...")
profiles = pd.read_sql("SELECT * FROM guest_profiles", conn)

# 2. Vectoriser
encoder = OneHotEncoder()
categorical = encoder.fit_transform(profiles[['age_range', 'group_type', 'travel_purpose', 'nationality']])
scaler = MinMaxScaler()
numerical = scaler.fit_transform(profiles[['avg_temperature']])
X = np.hstack([categorical.toarray(), numerical])

# 3. Entraîner K-Means
kmeans = KMeans(n_clusters=6, random_state=42)
kmeans.fit(X)

# 4. Sauvegarder les centroïdes
output = {
    "centroids": kmeans.cluster_centers_.tolist(),
    "encoder_categories": encoder.categories_,
    "trained_at": datetime.now().isoformat()
}
with open("lib/centroids.json", "w") as f:
    json.dump(output, f)

print("✅ Modèle entraîné et sauvegardé")
```

---

### Composant 2 — Matcher TypeScript (temps réel)

Fichier : `lib/cluster-matcher.ts`

Ce fichier charge les centroïdes au démarrage du serveur et assigne un cluster à chaque nouvel invité en quelques millisecondes.

```typescript
import centroids from './centroids.json'

export function assignCluster(profile: GuestProfile, weather: WeatherConditions): number {
  // 1. Vectoriser le profil
  const vector = encodeProfile(profile, weather)
  
  // 2. Calculer la distance cosinus avec chaque centroïde
  let bestCluster = 0
  let bestDistance = Infinity
  
  centroids.centroids.forEach((centroid, index) => {
    const distance = cosineSimilarity(vector, centroid)
    if (distance < bestDistance) {
      bestDistance = distance
      bestCluster = index
    }
  })
  
  return bestCluster
}
```

**Distance cosinus** : mesure l'angle entre deux vecteurs. Deux profils très similaires ont une distance cosinus proche de 0. C'est plus robuste que la distance euclidienne pour ce type de données.

---

### Composant 3 — Préférences par cluster

Fichier : nouvelle table PostgreSQL `cluster_attraction_scores`

```sql
CREATE TABLE cluster_attraction_scores (
  cluster_id       INTEGER,
  attraction_id    INTEGER,
  preference_score FLOAT DEFAULT 0.5,   -- entre 0 et 1
  interaction_count INTEGER DEFAULT 0,
  PRIMARY KEY (cluster_id, attraction_id)
);
```

Cette table est mise à jour automatiquement chaque fois qu'un invité consulte une attraction.

---

### Composant 4 — Mise à jour en temps réel (feedback loop)

Dans `/api/chat/route.ts`, quand `detectQuestionCategory` détecte qu'un invité parle d'une attraction :

```typescript
// Signal positif : l'invité s'intéresse à cette attraction
const clusterScore = await getClusterScore(clusterId, attractionId)
const newScore = (1 - 0.1) * clusterScore + 0.1 * 1.0
await updateClusterScore(clusterId, attractionId, newScore)
```

Formule : `nouveau_score = (1 - α) × ancien_score + α × signal`
- `α = 0.1` (learning rate) → le modèle s'adapte progressivement
- `signal = 1.0` pour une interaction positive
- Le score monte doucement vers les préférences réelles du cluster

---

### Composant 5 — Recommandation finale

Dans `lib/personalized-attractions.ts`, la requête SQL devient :

```sql
SELECT 
  a.*,
  (
    cas.preference_score * 60 +          -- Préférence du cluster (le plus important)
    CASE WHEN $isRainy AND a.good_for_rainy THEN 25
         WHEN NOT $isRainy AND a.good_for_sunny THEN 25
         ELSE 0 END +                    -- Météo (toujours important)
    a.priority_order * 2                 -- Priorité admin
  ) as match_score
FROM nearby_attractions a
JOIN cluster_attraction_scores cas 
  ON cas.attraction_id = a.id 
  AND cas.cluster_id = $clusterId
WHERE a.hotel_id = $hotelId
ORDER BY match_score DESC
LIMIT 10
```

---

## Comparaison : Avant vs Après

| Aspect | Système actuel | Avec K-Means |
|---|---|---|
| **Poids** | Inventés à la main | Appris depuis les données réelles |
| **Amélioration** | Jamais, statique | À chaque interaction (feedback loop) |
| **Nouveaux patterns** | Jamais détectés | Nouveau cluster au prochain entraînement |
| **Précision** | Règles génériques | Basé sur le comportement réel des clients |
| **Transparence** | On sait pourquoi | On sait quel cluster, pas exactement pourquoi |
| **Complexité** | Faible | Moyenne (script Python + JSON) |
| **Données nécessaires** | Aucune | ~500+ profils pour être fiable |

---

## La limite principale : le cold start

Le clustering a un problème bien connu : il faut des données pour fonctionner. Si la base `guest_profiles` est vide, on ne peut pas entraîner le modèle.

**Solution hybride :** on garde le système actuel (règles à la main) comme fallback, et on active le clustering uniquement quand on a assez de données :

```typescript
const clusterCount = await countGuestProfiles()

if (clusterCount >= 500) {
  // Utiliser le clustering
  const cluster = assignCluster(guestProfile, weather)
  return getClusterBasedRecommendations(cluster)
} else {
  // Fallback : ancien système de scoring
  return getRuleBasedRecommendations(guestProfile, weather)
}
```

---

## En résumé

1. **Clustering** = regrouper automatiquement des profils similaires sans règles prédéfinies
2. **K-Means** = l'algorithme qui trouve K groupes en minimisant les distances
3. **Vectorisation** = transformer un profil texte en chiffres pour que l'algo puisse calculer
4. **Feedback loop** = le système apprend de chaque interaction et s'améliore dans le temps
5. **Cold start** = le seul vrai problème : il faut des données pour démarrer

L'avantage fondamental par rapport au système actuel : **le système découvre ce que les clients veulent vraiment**, au lieu de supposer ce qu'ils veulent selon des règles écrites à la main.
