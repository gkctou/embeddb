# 🚀 EmbedDB

[English](README.md) | [繁體中文](README.zh-TW.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Español](README.es.md) | [Français](README.fr.md) | [Deutsch](README.de.md)

Salut ! Bienvenue sur EmbedDB ! C'est un système de tags basé sur les vecteurs super cool écrit en TypeScript. Il rend la recherche par similarité aussi facile que d'avoir un assistant IA qui vous aide à trouver des choses ! 🎯

## ✨ Caractéristiques

- 🔍 Puissante recherche par similarité basée sur les vecteurs
- ⚖️ Support des tags pondérés (Si vous dites que c'est important, ça l'est !)
- 🚄 Traitement par lots (Gérez efficacement de grandes quantités de données !)
- 💾 Cache de requêtes intégré (Requêtes répétées à la vitesse de l'éclair !)
- 📝 Support complet de TypeScript (Développement sûr avec typage !)
- 🎯 Implémentation efficace de vecteurs creux (Optimisation de la mémoire !)

## 🎮 Démarrage Rapide

D'abord, installez le package :
```bash
npm install embeddb
```

Voyons un exemple d'utilisation :

```typescript
import { TagVectorSystem, Tag, IndexTag } from 'embeddb';

// Créer un nouveau système
const system = new TagVectorSystem();

// Définir notre univers de tags
const tags: IndexTag[] = [
    { category: 'color', value: 'red' },    // Rouge
    { category: 'color', value: 'blue' },   // Bleu
    { category: 'size', value: 'large' }    // Grand
];

// Construire l'index des tags (étape importante !)
system.buildIndex(tags);

// Ajouter un élément avec ses tags et niveaux de confiance
const item = {
    id: 'cool-item-1',
    tags: [
        { category: 'color', value: 'red', confidence: 1.0 },   // Sûr que c'est rouge !
        { category: 'size', value: 'large', confidence: 0.8 }   // Plutôt grand
    ]
};
system.addItem(item);

// Rechercher des éléments similaires
const queryTags: Tag[] = [
    { category: 'color', value: 'red', confidence: 1.0 }  // Chercher des choses rouges
];
const results = system.query(queryTags, { page: 1, pageSize: 10 });
```

## 🛠 Référence de l'API

### Classe TagVectorSystem

C'est notre héros ! Il gère toutes les opérations.

#### Méthodes Principales

- 🏗 `buildIndex(tags: IndexTag[])`: Construire l'index des tags
  ```typescript
  // Définissez votre monde de tags !
  system.buildIndex([
    { category: 'color', value: 'red' },
    { category: 'style', value: 'modern' }
  ]);
  ```

- ➕ `addItem(item: ItemTags)`: Ajouter un élément
  ```typescript
  // Ajouter quelque chose de cool
  system.addItem({
    id: 'awesome-item',
    tags: [
      { category: 'color', value: 'red', confidence: 1.0 }
    ]
  });
  ```

- 📦 `addItemBatch(items: ItemTags[], batchSize?: number)`: Ajouter des éléments par lots
  ```typescript
  // Ajouter plusieurs éléments à la fois pour de meilleures performances !
  system.addItemBatch([item1, item2, item3], 10);
  ```

- 🔍 `query(tags: Tag[], options?: QueryOptions)`: Rechercher des éléments similaires
  ```typescript
  // Trouver des choses similaires
  const results = system.query([
    { category: 'style', value: 'modern', confidence: 0.9 }
  ], { page: 1, pageSize: 20 });
  ```

- 🎯 `queryFirst(tags: Tag[])`: Obtenir l'élément le plus similaire
  ```typescript
  // Obtenir uniquement la meilleure correspondance
  const bestMatch = system.queryFirst([
    { category: 'color', value: 'red', confidence: 1.0 }
  ]);
  ```

- 📊 `getStats()`: Obtenir les statistiques du système
  ```typescript
  // Vérifier les statistiques du système
  const stats = system.getStats();
  console.log(`Total des éléments : ${stats.totalItems}`);
  ```

- 🔄 `exportIndex()` & `importIndex()`: Exporter/Importer les données d'index
  ```typescript
  // Sauvegarder les données pour plus tard
  const data = system.exportIndex();
  // ... plus tard ...
  system.importIndex(data);
  ```

## 🔧 Guide de Développement

Vous voulez contribuer ? Excellent ! Voici quelques commandes utiles :

```bash
# Installer les dépendances
npm install

# Construire le projet
npm run build

# Exécuter les tests (on adore les tests !)
npm test

# Vérifier le style du code
npm run lint

# Formater le code
npm run format
```

## 🤔 Comment ça Marche

EmbedDB utilise la magie vectorielle pour rendre possible la recherche par similarité :

1. 🏷 **Indexation des Tags**:
   - Chaque paire catégorie-valeur est mappée à une position unique dans le vecteur
   - Cela permet de transformer les tags en vecteurs numériques

2. 📊 **Transformation Vectorielle**:
   - Les tags des éléments sont convertis en vecteurs creux
   - Les niveaux de confiance sont utilisés comme poids vectoriels

3. 🎯 **Calcul de Similarité**:
   - Utilise la similarité cosinus pour mesurer les relations vectorielles
   - Cela aide à trouver les éléments les plus similaires

4. 🚀 **Optimisations de Performance**:
   - Vecteurs creux pour l'efficacité mémoire
   - Cache de requêtes pour la vitesse
   - Opérations par lots pour un meilleur débit

## 🧪 Détails Techniques

Sous le capot, EmbedDB utilise plusieurs techniques intelligentes :

1. **Implémentation de Vecteurs Creux**
   - Ne stocke que les valeurs non nulles
   - Réduit l'empreinte mémoire
   - Parfait pour les systèmes basés sur les tags

2. **Similarité Cosinus**
   - Mesure l'angle entre les vecteurs
   - Plage : -1 à 1 (normalisé de 0 à 1)
   - Idéal pour les espaces creux de haute dimension

3. **Stratégie de Cache**
   - Cache en mémoire pour les résultats de requêtes
   - Invalidation du cache lors des changements de données
   - Pagination configurable

4. **Sécurité des Types**
   - Types TypeScript stricts
   - Vérification des types à l'exécution
   - Gestion complète des erreurs

## 📝 Licence

Licence MIT - Utilisez-le librement, construisez des choses géniales !

## 🙋‍♂️ Besoin d'Aide ?

Des questions ou des suggestions ?
- Ouvrez une Issue
- Soumettez une PR

Rendons EmbedDB encore meilleur ! 🌟

## 🌟 Donnez-nous une Étoile !

Si vous trouvez EmbedDB utile, donnez-nous une étoile ! Cela aide les autres à découvrir ce projet et nous motive à continuer à l'améliorer !
