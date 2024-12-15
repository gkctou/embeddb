# EmbedDB

[English](README.md) | [繁體中文](README.zh-TW.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Español](README.es.md) | [Français](README.fr.md) | [Deutsch](README.de.md)

Hey there! Welcome to EmbedDB! This is a super cool vector-based tag system written in TypeScript. It makes similarity searching as easy as having an AI assistant helping you find stuff! 

## Features

- Powerful vector-based similarity search
- Weighted tags with confidence scores (You say it's important? It's important!)
- Category weights for fine-tuned search (Control which categories matter more!)
- Batch operations (Handle lots of data at once, super efficient!)
- Built-in query caching (Repeated queries? Lightning fast!)
- Full TypeScript support (Type-safe, developer-friendly!)
- Memory-efficient sparse vector implementation (Your RAM will thank you!)
- Import/Export functionality (Save and restore your indexes!)
- Pagination support for large result sets (Get results in chunks!)

## Quick Start

First, install the package:
```bash
npm install embeddb
```

Let's see it in action:

```typescript
import { TagVectorSystem, Tag, IndexTag } from 'embeddb';

// Create a new system
const system = new TagVectorSystem();

// Define our tag universe
const tags: IndexTag[] = [
    { category: 'color', value: 'red' },    // Red is rad!
    { category: 'color', value: 'blue' },   // Blue is cool!
    { category: 'size', value: 'large' }    // Size matters!
];

// Build the tag index (important step!)
system.buildIndex(tags);

// Add an item with its tags and confidence scores
const item = {
    id: 'cool-item-1',
    tags: [
        { category: 'color', value: 'red', confidence: 1.0 },   // 100% sure it's red!
        { category: 'size', value: 'large', confidence: 0.8 }   // Pretty sure it's large
    ]
};
system.addItem(item);

// Set category weights to prioritize color matches
system.setCategoryWeight('color', 2.0); // Color matches are twice as important

// Let's find similar items
const query = {
    tags: [
        { category: 'color', value: 'red', confidence: 0.9 }
    ]
};

// Query with pagination
const results = system.query(query.tags, { page: 1, size: 10 }); // Get first 10 results

// Export the index for later use
const exportedData = system.exportIndex();

// Import the index in another instance
const newSystem = new TagVectorSystem();
newSystem.importIndex(exportedData);
```

## API Reference

### TagVectorSystem Class

This is our superhero! It handles all the operations.

#### Core Methods

- `buildIndex(tags: IndexTag[])`: Build your tag universe
  ```typescript
  // Define your tag world!
  system.buildIndex([
    { category: 'color', value: 'red' },
    { category: 'style', value: 'modern' }
  ]);
  ```

- `addItem(item: ItemTags)`: Add a single item
  ```typescript
  // Add something awesome
  system.addItem({
    id: 'awesome-item',
    tags: [
      { category: 'color', value: 'red', confidence: 1.0 }
    ]
  });
  ```

- `addItemBatch(items: ItemTags[], batchSize?: number)`: Batch add items
  ```typescript
  // Add multiple items at once for better performance!
  system.addItemBatch([item1, item2, item3], 10);
  ```

- `query(tags: Tag[], options?: QueryOptions)`: Search for similar items
  ```typescript
  // Find similar stuff
  const results = system.query([
    { category: 'style', value: 'modern', confidence: 0.9 }
  ], { page: 1, size: 20 });
  ```

- `queryFirst(tags: Tag[])`: Get the most similar item
  ```typescript
  // Just get the best match
  const bestMatch = system.queryFirst([
    { category: 'color', value: 'red', confidence: 1.0 }
  ]);
  ```

- `getStats()`: Get system statistics
  ```typescript
  // Check out the system stats
  const stats = system.getStats();
  console.log(`Total items: ${stats.totalItems}`);
  ```

- `exportIndex()` & `importIndex()`: Export/Import index data
  ```typescript
  // Save your data for later
  const data = system.exportIndex();
  // ... later ...
  system.importIndex(data);
  ```

- `setCategoryWeight(category: string, weight: number)`: Set category weight
  ```typescript
  // Make color matches twice as important
  system.setCategoryWeight('color', 2.0);
  ```

## Development

Want to contribute? Awesome! Here are some handy commands:

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run tests (we love testing!)
npm test

# Check code style
npm run lint

# Make the code pretty
npm run format
```

## How It Works

EmbedDB uses vector magic to make similarity search possible:

1. **Tag Indexing**:
   - Each category-value pair gets mapped to a unique vector position
   - This lets us transform tags into numerical vectors

2. **Vector Transformation**:
   - Item tags are converted into sparse vectors
   - Confidence scores are used as vector weights

3. **Similarity Calculation**:
   - Uses cosine similarity to measure vector relationships
   - This helps us find the most similar items

4. **Performance Optimizations**:
   - Sparse vectors for memory efficiency
   - Query caching for speed
   - Batch operations for better throughput

## Technical Details

Under the hood, EmbedDB uses several clever techniques:

1. **Sparse Vector Implementation**
   - Only stores non-zero values
   - Reduces memory footprint
   - Perfect for tag-based systems where most values are zero

2. **Cosine Similarity**
   - Measures angle between vectors
   - Range: -1 to 1 (we normalize to 0 to 1)
   - Ideal for high-dimensional sparse spaces

3. **Caching Strategy**
   - In-memory cache for query results
   - Cache invalidation on data changes
   - Configurable pagination

4. **Type Safety**
   - Strict TypeScript types
   - Runtime type checking
   - Comprehensive error handling

## License

MIT License - Go wild, build awesome stuff!

## Need Help?

Got questions or suggestions? We'd love to hear from you:
- Open an Issue
- Submit a PR

Let's make EmbedDB even more awesome!

## Star Us!

If you find EmbedDB useful, give us a star! It helps others discover this project and motivates us to keep improving it!