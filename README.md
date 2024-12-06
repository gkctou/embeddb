# EmbedDB

A vector-based tag system for efficient similarity search and retrieval, written in TypeScript.

## Features

- Efficient vector-based similarity search
- Support for weighted tags with confidence scores
- Batch operations for better performance
- Built-in query result caching
- Full TypeScript support
- Memory-efficient sparse vector implementation

## Installation

```bash
npm install embeddb
```

## Quick Start

```typescript
import { TagVectorSystem, Tag, IndexTag } from 'embeddb';

// Initialize the system
const system = new TagVectorSystem();

// Build the tag index
const tags: IndexTag[] = [
    { category: 'color', value: 'red' },
    { category: 'color', value: 'blue' },
    { category: 'size', value: 'large' }
];
system.buildIndex(tags);

// Add items with tags and confidence scores
const item = {
    id: 'item1',
    tags: [
        { category: 'color', value: 'red', confidence: 1.0 },
        { category: 'size', value: 'large', confidence: 0.8 }
    ]
};
system.addItem(item);

// Query similar items
const queryTags: Tag[] = [
    { category: 'color', value: 'red', confidence: 1.0 }
];
const results = system.query(queryTags, { page: 1, pageSize: 10 });
```

## API Reference

### TagVectorSystem

The main class that handles all operations.

#### Methods

- `buildIndex(tags: IndexTag[])`: Build the initial tag index
- `addItem(item: ItemTags)`: Add a single item with tags
- `addItemBatch(items: ItemTags[], batchSize?: number)`: Add multiple items in batches
- `query(tags: Tag[], options?: QueryOptions)`: Query similar items with pagination
- `queryFirst(tags: Tag[])`: Get the most similar item
- `getStats()`: Get system statistics
- `removeTenders(itemIds: string[])`: Remove specific items
- `clearQueryCache()`: Clear the query cache
- `exportIndex(includeItems?: boolean)`: Export the index data
- `importIndex(data: ExportedData)`: Import index data

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Lint
npm run lint

# Format code
npm run format
```

## License

MIT