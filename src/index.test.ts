import { TagVectorSystem, Tag, IndexTag, ItemTags, IFilter, QueryOptions } from './index';

describe('TagVectorSystem', () => {
    let system: TagVectorSystem;

    beforeEach(() => {
        system = new TagVectorSystem();
    });

    describe('Index Building', () => {
        test('should build index correctly', () => {
            const tags: IndexTag[] = [
                { category: 'color', value: 'red' },
                { category: 'color', value: 'blue' },
                { category: 'size', value: 'large' }
            ];

            system.buildIndex(tags);
            const stats = system.getStats();
            expect(stats.totalTags).toBe(3);
            expect(stats.memoryUsage.categoryMapSize).toBe(2); // color and size categories
        });

        test('should handle empty tag list', () => {
            const tags: IndexTag[] = [];
            system.buildIndex(tags);
            const stats = system.getStats();
            expect(stats.totalTags).toBe(0);
        });

        test('should handle duplicate tags', () => {
            const tags: IndexTag[] = [
                { category: 'color', value: 'red' },
                { category: 'color', value: 'red' }, // duplicate
                { category: 'size', value: 'large' }
            ];
            system.buildIndex(tags);
            const stats = system.getStats();
            expect(stats.totalTags).toBe(2); // should deduplicate
        });
    });

    describe('Item Management', () => {
        const baseTags: IndexTag[] = [
            { category: 'color', value: 'red' },
            { category: 'color', value: 'blue' },
            { category: 'size', value: 'large' },
            { category: 'size', value: 'small' }
        ];

        beforeEach(() => {
            system.buildIndex(baseTags);
        });

        test('should add and query items correctly', () => {
            const item1Tags: Tag[] = [
                { category: 'color', value: 'red', confidence: 1.0 },
                { category: 'size', value: 'large', confidence: 0.8 }
            ];
            const item2Tags: Tag[] = [
                { category: 'color', value: 'blue', confidence: 1.0 },
                { category: 'size', value: 'large', confidence: 0.9 }
            ];

            system.addItem({ id: 'item1', tags: item1Tags });
            system.addItem({ id: 'item2', tags: item2Tags });

            const queryTags: Tag[] = [
                { category: 'color', value: 'red', confidence: 1.0 }
            ];

            const result = system.queryFirst(queryTags);
            expect(result).toBeTruthy();
            expect(result?.id).toBe('item1');
            expect(result?.similarity).toBeGreaterThan(0);
        });

        test('should handle batch operations', () => {
            const items = Array.from({ length: 100 }, (_, i) => ({
                id: `item${i}`,
                tags: [
                    { category: 'color', value: 'red', confidence: Math.random() },
                    { category: 'size', value: 'large', confidence: Math.random() }
                ]
            }));

            system.addItemBatch(items, 10);
            const stats = system.getStats();
            expect(stats.totalItems).toBe(100);
        });

        test('should handle item removal', () => {
            const items: ItemTags[] = [
                {
                    id: 'item1',
                    tags: [{ category: 'color', value: 'red', confidence: 1.0 }]
                },
                {
                    id: 'item2',
                    tags: [{ category: 'color', value: 'blue', confidence: 1.0 }]
                }
            ];

            system.addItemBatch(items);
            expect(system.getStats().totalItems).toBe(2);

            system.removeItems(['item1']);
            expect(system.getStats().totalItems).toBe(1);

            const result = system.queryFirst([{ category: 'color', value: 'red', confidence: 1.0 }]);
            expect(result).toBeNull();
        });
    });

    describe('Query Operations', () => {
        beforeEach(() => {
            const tags: IndexTag[] = [
                { category: 'color', value: 'red' },
                { category: 'color', value: 'blue' },
                { category: 'size', value: 'large' }
            ];
            system.buildIndex(tags);

            const items: ItemTags[] = [
                {
                    id: 'item1',
                    tags: [
                        { category: 'color', value: 'red', confidence: 1.0 },
                        { category: 'size', value: 'large', confidence: 0.8 }
                    ]
                },
                {
                    id: 'item2',
                    tags: [
                        { category: 'color', value: 'blue', confidence: 1.0 },
                        { category: 'size', value: 'large', confidence: 0.9 }
                    ]
                }
            ];
            system.addItemBatch(items);
        });

        test('should handle pagination in query', () => {
            const queryTags: Tag[] = [
                { category: 'size', value: 'large', confidence: 1.0 }
            ];

            const results = system.query(queryTags, { page: 1, size: 1 });
            expect(results.length).toBe(1);
            
            const allResults = system.query(queryTags, { page: 1, size: 10 });
            expect(allResults.length).toBe(2);
        });

        test('should handle empty query results', () => {
            const queryTags: Tag[] = [
                { category: 'color', value: 'green', confidence: 1.0 } // non-existent tag
            ];

            const result = system.queryFirst(queryTags);
            expect(result).toBeNull();

            const results = system.query(queryTags);
            expect(results.length).toBe(0);
        });

        test('should use query cache effectively', () => {
            const queryTags: Tag[] = [
                { category: 'size', value: 'large', confidence: 1.0 }
            ];

            // First query should populate cache
            const firstResults = system.query(queryTags);
            expect(firstResults.length).toBe(2);

            // Second query should use cache
            const secondResults = system.query(queryTags);
            expect(secondResults).toEqual(firstResults);

            // Clear cache and verify it's cleared
            system.clearQueryCache();
            const stats = system.getStats();
            expect(stats.memoryUsage.hasCachedQuery).toBe(false);
        });

        test('should handle filtering with metadata', () => {
            type MetaType = { type: string };
            const items: ItemTags<MetaType>[] = [
                {
                    id: 'item1',
                    tags: [
                        { category: 'color', value: 'red', confidence: 1.0 }
                    ],
                    meta: { type: 'A' }
                },
                {
                    id: 'item2',
                    tags: [
                        { category: 'color', value: 'red', confidence: 1.0 }
                    ],
                    meta: { type: 'B' }
                }
            ];
            system.addItemBatch(items);

            const queryTags: Tag[] = [
                { category: 'color', value: 'red', confidence: 1.0 }
            ];

            // Query with type A filter
            const filterA: IFilter<MetaType> = (meta) => meta.type === 'A';
            const resultsA = system.query<MetaType>(queryTags, { filter: filterA } as QueryOptions<MetaType>);
            expect(resultsA.length).toBe(1);
            expect(resultsA[0].id).toBe('item1');

            // Query with type B filter
            const filterB: IFilter<MetaType> = (meta) => meta.type === 'B';
            const resultsB = system.query<MetaType>(queryTags, { filter: filterB } as QueryOptions<MetaType>);
            expect(resultsB.length).toBe(1);
            expect(resultsB[0].id).toBe('item2');

            // Cache should work with same filter
            const cachedResults = system.query<MetaType>(queryTags, { filter: filterA } as QueryOptions<MetaType>);
            expect(cachedResults).toEqual(resultsA);
        });

        test('should handle undefined filter cases', () => {
            const queryTags: Tag[] = [
                { category: 'color', value: 'red', confidence: 1.0 }
            ];

            // Query without filter
            const results1 = system.query(queryTags);
            expect(results1.length).toBeGreaterThan(0);

            // Query with undefined filter
            const results2 = system.query(queryTags, { filter: undefined });
            expect(results2).toEqual(results1);
        });

        test('should handle vector similarity through query results', () => {
            // Build index with some tags
            const tags: IndexTag[] = [
                { category: 'color', value: 'red' },
                { category: 'size', value: 'large' }
            ];
            system.buildIndex(tags);

            // Add two identical items
            const item1: ItemTags = {
                id: 'item1',
                tags: [
                    { category: 'color', value: 'red', confidence: 1.0 }
                ]
            };
            const item2: ItemTags = {
                id: 'item2',
                tags: [
                    { category: 'color', value: 'red', confidence: 1.0 }
                ]
            };
            system.addItem(item1);
            system.addItem(item2);

            // Query with same tags
            const queryTags: Tag[] = [
                { category: 'color', value: 'red', confidence: 1.0 }
            ];
            const results = system.query(queryTags);

            // Both items should have similarity 1.0
            expect(results).toHaveLength(2);
            expect(results[0].similarity).toBe(1);
            expect(results[1].similarity).toBe(1);

            // Query with different tags
            const differentTags: Tag[] = [
                { category: 'size', value: 'large', confidence: 1.0 }
            ];
            const noMatches = system.query(differentTags);
            expect(noMatches).toHaveLength(0);
        });
    });

    describe('Advanced Query Operations', () => {
        test('should handle query with empty index', () => {
            // Query before building index
            const queryTags: Tag[] = [
                { category: 'color', value: 'red', confidence: 1.0 }
            ];
            const results = system.query(queryTags);
            expect(results).toHaveLength(0);
        });

        test('should handle query with no matching items', () => {
            // Build index
            const tags: IndexTag[] = [
                { category: 'color', value: 'red' }
            ];
            system.buildIndex(tags);

            // Add item with different tag
            const item: ItemTags = {
                id: 'item1',
                tags: [
                    { category: 'color', value: 'blue', confidence: 1.0 }
                ]
            };
            system.addItem(item);

            // Query with non-matching tag
            const queryTags: Tag[] = [
                { category: 'color', value: 'red', confidence: 1.0 }
            ];
            const results = system.query(queryTags);
            expect(results).toHaveLength(0);
        });

        test('should handle query with invalid cache', () => {
            // Build index
            const tags: IndexTag[] = [
                { category: 'color', value: 'red' }
            ];
            system.buildIndex(tags);

            // Add item
            const item: ItemTags = {
                id: 'item1',
                tags: [
                    { category: 'color', value: 'red', confidence: 1.0 }
                ]
            };
            system.addItem(item);

            // First query to populate cache
            const queryTags: Tag[] = [
                { category: 'color', value: 'red', confidence: 1.0 }
            ];
            system.query(queryTags);

            // Add another item to invalidate cache
            const item2: ItemTags = {
                id: 'item2',
                tags: [
                    { category: 'color', value: 'red', confidence: 1.0 }
                ]
            };
            system.addItem(item2);

            // Query again should not use invalid cache
            const results = system.query(queryTags);
            expect(results).toHaveLength(2);
        });
    });

    describe('Category Weights', () => {
        test('should handle category weight operations', () => {
            system.setCategoryWeight('color', 2.0);
            expect(system.getCategoryWeight('color')).toBe(2.0);
            
            // Test default weight
            expect(system.getCategoryWeight('nonexistent')).toBe(1.0);
            
            // Test batch weight setting
            const weights = [
                { category: 'color', weight: 1.5 },
                { category: 'size', weight: 0.8 }
            ];
            system.setCategoryWeights(weights);
            
            expect(system.getCategoryWeight('color')).toBe(1.5);
            expect(system.getCategoryWeight('size')).toBe(0.8);
            
            const allWeights = system.getAllCategoryWeights();
            expect(allWeights).toHaveLength(2);
            expect(allWeights).toContainEqual({ category: 'color', weight: 1.5 });
            expect(allWeights).toContainEqual({ category: 'size', weight: 0.8 });
        });

        test('should handle category weight edge cases', () => {
            // Set small weight
            system.setCategoryWeight('color', 0.1);
            expect(system.getCategoryWeight('color')).toBe(0.1);

            // Set large weight
            system.setCategoryWeight('size', 10);
            expect(system.getCategoryWeight('size')).toBe(10);

            // Set weights with empty array
            system.setCategoryWeights([]);
            expect(system.getAllCategoryWeights()).toHaveLength(2);
        });
    });

    describe('Memory Management', () => {
        test('should handle cache clearing', () => {
            const queryTags: Tag[] = [
                { category: 'color', value: 'red', confidence: 1.0 }
            ];
            
            // First query to populate cache
            system.query(queryTags);
            expect(system.getStats().memoryUsage.hasCachedQuery).toBe(true);
            
            // Clear cache
            system.clearQueryCache();
            expect(system.getStats().memoryUsage.hasCachedQuery).toBe(false);
        });

        test('should handle item metadata', () => {
            const item: ItemTags<{ type: string }> = {
                id: 'item1',
                tags: [
                    { category: 'color', value: 'red', confidence: 1.0 }
                ],
                meta: { type: 'A' }
            };
            
            system.addItem(item);
            const stats = system.getStats();
            expect(stats.totalItems).toBe(1);
            
            // Test with filter using metadata
            const queryTags: Tag[] = [
                { category: 'color', value: 'red', confidence: 1.0 }
            ];
            
            const filter: IFilter<{ type: string }> = (meta) => meta.type === 'B';
            const results = system.query<{ type: string }>(queryTags, { filter } as QueryOptions<{ type: string }>);
            expect(results).toHaveLength(0);
        });
    });

    describe('Vector Operations', () => {
        test('should handle vector similarity edge cases', () => {
            // Build index with some tags
            const tags: IndexTag[] = [
                { category: 'color', value: 'red' }
            ];
            system.buildIndex(tags);

            // Empty tags should not match anything
            const emptyQuery = system.query([]);
            expect(emptyQuery).toHaveLength(0);

            // Add an item with empty tags
            const emptyItem: ItemTags = {
                id: 'empty',
                tags: []
            };
            system.addItem(emptyItem);

            // Query with tags should not match empty item
            const queryTags: Tag[] = [
                { category: 'color', value: 'red', confidence: 1.0 }
            ];
            const results = system.query(queryTags);
            expect(results).toHaveLength(0);

            // Empty query should not match empty item
            const emptyResults = system.query([]);
            expect(emptyResults).toHaveLength(0);
        });

        test('should handle perfect similarity', () => {
            // Build index
            const tags: IndexTag[] = [
                { category: 'color', value: 'red' }
            ];
            system.buildIndex(tags);

            // Add an item
            const item: ItemTags = {
                id: 'item1',
                tags: [
                    { category: 'color', value: 'red', confidence: 1.0 }
                ]
            };
            system.addItem(item);

            // Query with identical tags
            const queryTags: Tag[] = [
                { category: 'color', value: 'red', confidence: 1.0 }
            ];
            const results = system.query(queryTags);
            expect(results).toHaveLength(1);
            expect(results[0].similarity).toBe(1);
        });
    });

    describe('Import/Export Operations', () => {
        test('should correctly export and import index data', () => {
            // Setup initial data
            const tags: IndexTag[] = [
                { category: 'color', value: 'red' },
                { category: 'size', value: 'large' }
            ];
            system.buildIndex(tags);

            const item: ItemTags = {
                id: 'item1',
                tags: [
                    { category: 'color', value: 'red', confidence: 1.0 },
                    { category: 'size', value: 'large', confidence: 0.8 }
                ]
            };
            system.addItem(item);

            // Export data
            const exportedData = system.exportIndex(true);
            expect(exportedData.vectorSize).toBeGreaterThan(0);
            expect(Object.keys(exportedData.categoryMap).length).toBe(2);
            expect(exportedData.itemVectors).toBeDefined();

            // Create new system and import data
            const newSystem = new TagVectorSystem();
            newSystem.importIndex(exportedData);

            // Verify imported data
            const stats = newSystem.getStats();
            expect(stats.totalItems).toBe(1);
            expect(stats.totalTags).toBe(exportedData.vectorSize);

            // Verify query functionality
            const queryTags: Tag[] = [
                { category: 'color', value: 'red', confidence: 1.0 }
            ];
            const result = newSystem.queryFirst(queryTags);
            expect(result?.id).toBe('item1');
        });

        test('should handle export without items', () => {
            const tags: IndexTag[] = [
                { category: 'color', value: 'red' },
                { category: 'size', value: 'large' }
            ];
            system.buildIndex(tags);

            const exportedData = system.exportIndex(false);
            expect(exportedData.itemVectors).toBeUndefined();
        });
    });

    describe('Edge Cases', () => {
        test('should handle invalid cache states', () => {
            const queryTags: Tag[] = [
                { category: 'color', value: 'red', confidence: 1.0 }
            ];

            // Query with invalid filter should not use cache
            const filter1 = (meta: any) => true;
            system.query(queryTags, { filter: filter1 });

            const filter2 = (meta: any) => false;
            const results = system.query(queryTags, { filter: filter2 });
            expect(results).toHaveLength(0);
        });

        test('should handle batch operations with empty arrays', () => {
            // Empty batch add
            system.addItemBatch([]);
            expect(system.getStats().totalItems).toBe(0);

            // Empty batch remove
            system.removeItems([]);
            expect(system.getStats().totalItems).toBe(0);
        });

        test('should handle metadata operations', () => {
            const item: ItemTags = {
                id: 'item1',
                tags: [
                    { category: 'color', value: 'red', confidence: 1.0 }
                ],
                meta: undefined
            };

            // Add item without metadata
            system.addItem(item);

            // Query with filter on undefined metadata
            const filter = (meta: any) => meta.type === 'A';
            const results = system.query([], { filter });
            expect(results).toHaveLength(0);
        });
    });
});
