# 🚀 EmbedDB

[English](README.md) | [繁體中文](README.zh-TW.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Español](README.es.md) | [Français](README.fr.md) | [Deutsch](README.de.md)

Hallo! Willkommen bei EmbedDB! Dies ist ein richtig cooles vektorbasiertes Tag-System, geschrieben in TypeScript. Es macht die Ähnlichkeitssuche so einfach, als hätte man einen KI-Assistenten, der einem beim Finden hilft! 🎯

## ✨ Funktionen

- 🔍 Leistungsstarke vektorbasierte Ähnlichkeitssuche
- ⚖️ Unterstützung für gewichtete Tags (Wenn du sagst, es ist wichtig, dann ist es wichtig!)
- 🚄 Batch-Verarbeitung (Verarbeite große Datenmengen effizient!)
- 💾 Integrierter Abfrage-Cache (Wiederholte Abfragen blitzschnell!)
- 📝 Vollständige TypeScript-Unterstützung (Typsichere Entwicklung!)
- 🎯 Effiziente Sparse-Vektor-Implementierung (Speicheroptimierung!)

## 🎮 Schnellstart

Zuerst das Paket installieren:
```bash
npm install embeddb
```

Schauen wir uns ein Beispiel an:

```typescript
import { TagVectorSystem, Tag, IndexTag } from 'embeddb';

// Neues System erstellen
const system = new TagVectorSystem();

// Unser Tag-Universum definieren
const tags: IndexTag[] = [
    { category: 'color', value: 'red' },    // Rot
    { category: 'color', value: 'blue' },   // Blau
    { category: 'size', value: 'large' }    // Groß
];

// Tag-Index aufbauen (wichtiger Schritt!)
system.buildIndex(tags);

// Ein Element mit Tags und Konfidenzwerten hinzufügen
const item = {
    id: 'cool-item-1',
    tags: [
        { category: 'color', value: 'red', confidence: 1.0 },   // Definitiv rot!
        { category: 'size', value: 'large', confidence: 0.8 }   // Ziemlich groß
    ]
};
system.addItem(item);

// Nach ähnlichen Elementen suchen
const queryTags: Tag[] = [
    { category: 'color', value: 'red', confidence: 1.0 }  // Nach roten Dingen suchen
];
const results = system.query(queryTags, { page: 1, pageSize: 10 });
```

## 🛠 API-Referenz

### TagVectorSystem Klasse

Das ist unser Held! Er handhabt alle Operationen.

#### Hauptmethoden

- 🏗 `buildIndex(tags: IndexTag[])`: Tag-Index aufbauen
  ```typescript
  // Definiere deine Tag-Welt!
  system.buildIndex([
    { category: 'color', value: 'red' },
    { category: 'style', value: 'modern' }
  ]);
  ```

- ➕ `addItem(item: ItemTags)`: Ein Element hinzufügen
  ```typescript
  // Etwas Cooles hinzufügen
  system.addItem({
    id: 'awesome-item',
    tags: [
      { category: 'color', value: 'red', confidence: 1.0 }
    ]
  });
  ```

- 📦 `addItemBatch(items: ItemTags[], batchSize?: number)`: Elemente im Batch hinzufügen
  ```typescript
  // Mehrere Elemente auf einmal für bessere Performance!
  system.addItemBatch([item1, item2, item3], 10);
  ```

- 🔍 `query(tags: Tag[], options?: QueryOptions)`: Nach ähnlichen Elementen suchen
  ```typescript
  // Ähnliche Dinge finden
  const results = system.query([
    { category: 'style', value: 'modern', confidence: 0.9 }
  ], { page: 1, pageSize: 20 });
  ```

- 🎯 `queryFirst(tags: Tag[])`: Das ähnlichste Element finden
  ```typescript
  // Nur den besten Treffer holen
  const bestMatch = system.queryFirst([
    { category: 'color', value: 'red', confidence: 1.0 }
  ]);
  ```

- 📊 `getStats()`: Systemstatistiken abrufen
  ```typescript
  // Systemstatistiken überprüfen
  const stats = system.getStats();
  console.log(`Gesamtanzahl Elemente: ${stats.totalItems}`);
  ```

- 🔄 `exportIndex()` & `importIndex()`: Index-Daten exportieren/importieren
  ```typescript
  // Daten für später speichern
  const data = system.exportIndex();
  // ... später ...
  system.importIndex(data);
  ```

## 🔧 Entwicklungsanleitung

Möchtest du beitragen? Super! Hier sind einige nützliche Befehle:

```bash
# Abhängigkeiten installieren
npm install

# Projekt bauen
npm run build

# Tests ausführen (wir lieben Tests!)
npm test

# Code-Stil überprüfen
npm run lint

# Code formatieren
npm run format
```

## 🤔 Wie es funktioniert

EmbedDB nutzt Vektor-Magie für die Ähnlichkeitssuche:

1. 🏷 **Tag-Indexierung**:
   - Jedes Kategorie-Wert-Paar wird auf eine eindeutige Vektorposition abgebildet
   - Dies ermöglicht die Umwandlung von Tags in numerische Vektoren

2. 📊 **Vektor-Transformation**:
   - Element-Tags werden in Sparse-Vektoren umgewandelt
   - Konfidenzwerte werden als Vektorgewichte verwendet

3. 🎯 **Ähnlichkeitsberechnung**:
   - Verwendet Kosinus-Ähnlichkeit zur Messung von Vektorbeziehungen
   - Hilft bei der Findung der ähnlichsten Elemente

4. 🚀 **Performance-Optimierungen**:
   - Sparse-Vektoren für Speichereffizienz
   - Abfrage-Caching für Geschwindigkeit
   - Batch-Operationen für besseren Durchsatz

## 🧪 Technische Details

Unter der Haube verwendet EmbedDB mehrere clevere Techniken:

1. **Sparse-Vektor-Implementierung**
   - Speichert nur Nicht-Null-Werte
   - Reduziert den Speicherbedarf
   - Perfekt für tag-basierte Systeme

2. **Kosinus-Ähnlichkeit**
   - Misst den Winkel zwischen Vektoren
   - Bereich: -1 bis 1 (normalisiert auf 0 bis 1)
   - Ideal für hochdimensionale Sparse-Räume

3. **Cache-Strategie**
   - In-Memory-Cache für Abfrageergebnisse
   - Cache-Invalidierung bei Datenänderungen
   - Konfigurierbare Paginierung

4. **Typsicherheit**
   - Strikte TypeScript-Typen
   - Laufzeit-Typüberprüfung
   - Umfassende Fehlerbehandlung

## 📝 Lizenz

MIT-Lizenz - Nutze es frei, baue tolle Sachen!

## 🙋‍♂️ Brauchst du Hilfe?

Fragen oder Vorschläge?
- Öffne ein Issue
- Reiche einen PR ein

Lass uns EmbedDB noch besser machen! 🌟

## 🌟 Gib uns einen Stern!

Wenn du EmbedDB nützlich findest, gib uns einen Stern! Das hilft anderen, dieses Projekt zu entdecken und motiviert uns, es weiter zu verbessern!
