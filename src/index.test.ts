import { TagVectorSystem, Tag, IndexTag, ItemTags, IFilter, QueryOptions } from './index';

interface MetaType extends Record<string, unknown> {
    type: string;
    tags?: string[];
    value?: string | null;
}

describe('TagVectorSystem', () => {
    let system: TagVectorSystem<MetaType>;

    beforeEach(() => {
        system = new TagVectorSystem<MetaType>();
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

            system.addItem({ id: 'item1', tags: item1Tags, meta: { type: 'test' } });
            system.addItem({ id: 'item2', tags: item2Tags, meta: { type: 'test' } });

            const queryTags: Tag[] = [
                { category: 'color', value: 'red', confidence: 1.0 }
            ];

            const result = system.queryFirst(queryTags);
            expect(result).toBeTruthy();
            expect(result?.id).toBe('item1');
            expect(result?.similarity).toBeGreaterThan(0);
        });

        test('should handle batch operations', () => {
            const items: ItemTags<MetaType>[] = Array.from({ length: 100 }, (_, i) => ({
                id: `item${i}`,
                tags: [
                    { category: 'color', value: 'red', confidence: Math.random() },
                    { category: 'size', value: 'large', confidence: Math.random() }
                ],
                meta: { type: 'test' }
            }));

            system.addItemBatch(items);
            const stats = system.getStats();
            expect(stats.totalItems).toBe(100);
        });

        test('should handle item removal', () => {
            const items: ItemTags<MetaType>[] = [
                {
                    id: 'item1',
                    tags: [{ category: 'color', value: 'red', confidence: 1.0 }],
                    meta: { type: 'test' }
                },
                {
                    id: 'item2',
                    tags: [{ category: 'color', value: 'blue', confidence: 1.0 }],
                    meta: { type: 'test' }
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

            const items: ItemTags<MetaType>[] = [
                {
                    id: 'item1',
                    tags: [
                        { category: 'color', value: 'red', confidence: 1.0 },
                        { category: 'size', value: 'large', confidence: 0.8 }
                    ],
                    meta: { type: 'test' }
                },
                {
                    id: 'item2',
                    tags: [
                        { category: 'color', value: 'blue', confidence: 1.0 },
                        { category: 'size', value: 'large', confidence: 0.9 }
                    ],
                    meta: { type: 'test' }
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
            const items: ItemTags<MetaType>[] = [
                {
                    id: 'item1',
                    tags: [{ category: 'color', value: 'red', confidence: 1.0 }],
                    meta: { type: 'A' }
                },
                {
                    id: 'item2',
                    tags: [{ category: 'color', value: 'red', confidence: 1.0 }],
                    meta: { type: 'B' }
                }
            ];
            system.addItemBatch(items);

            const queryTags: Tag[] = [
                { category: 'color', value: 'red', confidence: 1.0 }
            ];

            // First query with type A filter
            const filterA: IFilter<MetaType> = (meta): boolean => {
                if (!meta) return false;
                return meta?.type === 'A';
            };
            const resultsA = system.query(queryTags, { filter: filterA });
            expect(resultsA.length).toBe(1);
            expect(resultsA[0].id).toBe('item1');

            // Query with type B filter
            const filterB: IFilter<MetaType> = (meta): boolean => {
                if (!meta) return false;
                return meta?.type === 'B';
            };
            const resultsB = system.query(queryTags, { filter: filterB });
            expect(resultsB.length).toBe(1);
            expect(resultsB[0].id).toBe('item2');
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
            const item1: ItemTags<MetaType> = {
                id: 'item1',
                tags: [
                    { category: 'color', value: 'red', confidence: 1.0 }
                ],
                meta: { type: 'test' }
            };
            const item2: ItemTags<MetaType> = {
                id: 'item2',
                tags: [
                    { category: 'color', value: 'red', confidence: 1.0 }
                ],
                meta: { type: 'test' }
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

        test('should handle query hash sorting', () => {
            const queryTags1: Tag[] = [
                { category: 'color', value: 'red', confidence: 1.0 },
                { category: 'size', value: 'large', confidence: 0.8 }
            ];
            const queryTags2: Tag[] = [
                { category: 'size', value: 'large', confidence: 0.8 },
                { category: 'color', value: 'red', confidence: 1.0 }
            ];

            // Test that hash is the same regardless of tag order
            const hash1 = system['generateQueryHash'](queryTags1);
            const hash2 = system['generateQueryHash'](queryTags2);
            expect(hash1).toBe(hash2);

            // Test that cache works with differently ordered tags
            const results1 = system.query(queryTags1);
            const results2 = system.query(queryTags2);
            expect(results1).toEqual(results2);
        });

        test('should handle query with different confidence values', () => {
            const queryTags1: Tag[] = [
                { category: 'color', value: 'red', confidence: 1.0 },
                { category: 'size', value: 'large', confidence: 0.8 }
            ];
            const queryTags2: Tag[] = [
                { category: 'color', value: 'red', confidence: 0.9 },
                { category: 'size', value: 'large', confidence: 0.7 }
            ];

            // Different confidence values should produce different hashes
            const hash1 = system['generateQueryHash'](queryTags1);
            const hash2 = system['generateQueryHash'](queryTags2);
            expect(hash1).not.toBe(hash2);

            // Results should be different due to confidence affecting similarity
            const results1 = system.query(queryTags1);
            const results2 = system.query(queryTags2);
            expect(results1[0].similarity).not.toBe(results2[0].similarity);
        });
    });

    describe('Advanced Query Operations', () => {
        let system: TagVectorSystem<{ type: string }>;

        beforeEach(() => {
            // Build index with some tags
            const tags: IndexTag[] = [
                { category: 'color', value: 'red' },
                { category: 'size', value: 'large' }
            ];
            system = new TagVectorSystem<{ type: string }>();
            system.buildIndex(tags);
        });

        test('should handle query with empty index', () => {
            // Clear the system
            system = new TagVectorSystem<{ type: string }>();

            // Query before building index
            const queryTags: Tag[] = [
                { category: 'color', value: 'red', confidence: 1.0 }
            ];
            const results = system.query(queryTags);
            expect(results).toHaveLength(0);
        });

        test('should handle query with no matching items', () => {
            // Add item with different tag
            const item: ItemTags<{ type: string }> = {
                id: 'item1',
                tags: [
                    { category: 'color', value: 'blue', confidence: 1.0 }
                ],
                meta: { type: 'test' }
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
            // Add item
            const item: ItemTags<{ type: string }> = {
                id: 'item1',
                tags: [
                    { category: 'color', value: 'red', confidence: 1.0 }
                ],
                meta: { type: 'test' }
            };
            system.addItem(item);

            // First query to populate cache
            const queryTags: Tag[] = [
                { category: 'color', value: 'red', confidence: 1.0 }
            ];
            system.query(queryTags);

            // Add another item to invalidate cache
            const item2: ItemTags<{ type: string }> = {
                id: 'item2',
                tags: [
                    { category: 'color', value: 'red', confidence: 1.0 }
                ],
                meta: { type: 'test' }
            };
            system.addItem(item2);

            // Query again should not use invalid cache
            const results = system.query(queryTags);
            expect(results).toHaveLength(2);
        });

        test('should handle query with different filters', () => {
            // Add items with metadata
            const items: ItemTags<{ type: string }>[] = [
                {
                    id: 'item1',
                    tags: [{ category: 'color', value: 'red', confidence: 1.0 }],
                    meta: { type: 'A' }
                },
                {
                    id: 'item2',
                    tags: [{ category: 'color', value: 'red', confidence: 1.0 }],
                    meta: { type: 'B' }
                }
            ];
            system.addItemBatch(items);

            const queryTags: Tag[] = [
                { category: 'color', value: 'red', confidence: 1.0 }
            ];

            // First query with type A filter
            const filterA: IFilter<{ type: string }> = (meta): boolean => {
                if (!meta) return false;
                return meta?.type === 'A';
            };
            const resultsA = system.query(queryTags, { filter: filterA });
            expect(resultsA).toHaveLength(1);
            expect(resultsA[0].id).toBe('item1');

            // Second query with type B filter should not use cache
            const filterB: IFilter<{ type: string }> = (meta): boolean => {
                if (!meta) return false;
                return meta?.type === 'B';
            };
            const resultsB = system.query(queryTags, { filter: filterB });
            expect(resultsB).toHaveLength(1);
            expect(resultsB[0].id).toBe('item2');
        });

        test('should handle query with empty tags', () => {
            // Add item with empty tags
            const item: ItemTags<{ type: string }> = {
                id: 'item1',
                tags: [],
                meta: { type: 'test' }
            };
            system.addItem(item);

            // Query with empty tags
            const results = system.query([]);
            expect(results).toHaveLength(0);

            // Query with tags should not match empty item
            const queryTags: Tag[] = [
                { category: 'color', value: 'red', confidence: 1.0 }
            ];
            const results2 = system.query(queryTags);
            expect(results2).toHaveLength(0);
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

            const item: ItemTags<MetaType> = {
                id: 'item1',
                tags: [
                    { category: 'color', value: 'red', confidence: 1.0 },
                    { category: 'size', value: 'large', confidence: 0.8 }
                ],
                meta: { type: 'test' }
            };
            system.addItem(item);

            // Export data
            const exportedData = system.exportIndex(true);
            expect(exportedData.vectorSize).toBeGreaterThan(0);
            expect(Object.keys(exportedData.categoryMap).length).toBe(2);
            expect(exportedData.itemVectors).toBeDefined();

            // Create new system and import data
            const newSystem = new TagVectorSystem<MetaType>();
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
                { category: 'color', value: 'blue' }
            ];
            system.buildIndex(tags);
            
            // Add some items
            const items: ItemTags<MetaType>[] = [
                {
                    id: 'item1',
                    tags: [{ category: 'color', value: 'red', confidence: 1.0 }],
                    meta: { type: 'test' }
                },
                {
                    id: 'item2',
                    tags: [{ category: 'color', value: 'blue', confidence: 1.0 }],
                    meta: { type: 'test' }
                }
            ];
            system.addItemBatch(items);
            
            // Export without items
            const exported = system.exportIndex(false);
            expect(exported.itemVectors).toBeUndefined();
            
            // Import data without item vectors
            const newSystem = new TagVectorSystem<MetaType>();
            newSystem.importIndex(exported);
            expect(newSystem.getStats().totalItems).toBe(0);
            expect(newSystem.getStats().totalTags).toBe(2);
        });

        test('should handle import with undefined item vectors', () => {
            const exportData = {
                categoryMap: {
                    color: { red: 0, blue: 1 }
                },
                vectorSize: 2,
                categoryWeights: [{ category: 'color', weight: 1 }]
                // itemVectors intentionally omitted
            };

            system.importIndex(exportData);
            expect(system.getStats().totalItems).toBe(0);
            expect(system.getStats().totalTags).toBe(2);
        });
    });

    describe('Vector Operations', () => {
        test('should handle vector similarity edge cases', () => {
            // Build index with some tags
            const tags: IndexTag[] = [
                { category: 'color', value: 'red' },
                { category: 'color', value: 'blue' }
            ];
            system.buildIndex(tags);

            // Add an item with some tags
            const item: ItemTags<MetaType> = {
                id: 'item1',
                tags: [
                    { category: 'color', value: 'red', confidence: 1.0 }
                ],
                meta: { type: 'test' }
            };
            system.addItem(item);

            // Query with empty tags should return no results
            const emptyResults = system.query([]);
            expect(emptyResults).toHaveLength(0);

            // Add an item with empty tags
            const emptyItem: ItemTags<MetaType> = {
                id: 'empty',
                tags: [],
                meta: { type: 'test' }
            };
            system.addItem(emptyItem);

            // Query with tags should not match empty item
            const queryTags: Tag[] = [
                { category: 'color', value: 'red', confidence: 1.0 }
            ];
            const results = system.query(queryTags);
            expect(results).toHaveLength(1);
            expect(results[0].id).toBe('item1');
        });

        test('should handle empty vectors in similarity calculation', () => {
            // Build index with some tags
            const tags: IndexTag[] = [
                { category: 'color', value: 'red' },
                { category: 'size', value: 'large' }
            ];
            system.buildIndex(tags);

            // Add two identical items
            const item1: ItemTags<MetaType> = {
                id: 'item1',
                tags: [
                    { category: 'color', value: 'red', confidence: 1.0 }
                ],
                meta: { type: 'test' }
            };
            const item2: ItemTags<MetaType> = {
                id: 'item2',
                tags: [
                    { category: 'color', value: 'red', confidence: 1.0 }
                ],
                meta: { type: 'test' }
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

        test('should handle vectors with different dimensions', () => {
            // Build index with some tags
            const tags: IndexTag[] = [
                { category: 'color', value: 'red' },
                { category: 'size', value: 'large' }
            ];
            system.buildIndex(tags);

            // Add items with different tag combinations
            const item1: ItemTags<MetaType> = {
                id: 'item1',
                tags: [
                    { category: 'color', value: 'red', confidence: 1.0 }
                ],
                meta: { type: 'test' }
            };
            const item2: ItemTags<MetaType> = {
                id: 'item2',
                tags: [
                    { category: 'size', value: 'large', confidence: 1.0 }
                ],
                meta: { type: 'test' }
            };
            system.addItem(item1);
            system.addItem(item2);

            // Query with color tag
            const queryTags1: Tag[] = [
                { category: 'color', value: 'red', confidence: 1.0 }
            ];
            const results1 = system.query(queryTags1);
            expect(results1).toHaveLength(1);
            expect(results1[0].id).toBe('item1');
            expect(results1[0].similarity).toBe(1);

            // Query with size tag
            const queryTags2: Tag[] = [
                { category: 'size', value: 'large', confidence: 1.0 }
            ];
            const results2 = system.query(queryTags2);
            expect(results2).toHaveLength(1);
            expect(results2[0].id).toBe('item2');
            expect(results2[0].similarity).toBe(1);

            // Query with both tags
            const queryTags3: Tag[] = [
                { category: 'color', value: 'red', confidence: 1.0 },
                { category: 'size', value: 'large', confidence: 1.0 }
            ];
            const results3 = system.query(queryTags3);
            expect(results3).toHaveLength(2);
            // Each item should have partial similarity
            expect(results3[0].similarity).toBeLessThan(1);
            expect(results3[1].similarity).toBeLessThan(1);
        });
    });

    describe('Edge Cases', () => {
        test('should handle invalid cache states', () => {
            const queryTags: Tag[] = [
                { category: 'color', value: 'red', confidence: 1.0 }
            ];

            // Query with invalid filter should not use cache
            const filter1 = (meta: any): boolean => true;
            system.query(queryTags, { filter: filter1 });

            const filter2 = (meta: any): boolean => false;
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
            const item: ItemTags<MetaType> = {
                id: 'item1',
                tags: [
                    { category: 'color', value: 'red', confidence: 1.0 }
                ],
                meta: { type: 'test' }
            };

            // Add item without metadata
            system.addItem(item);

            // Query with filter on undefined metadata
            const filter: IFilter<MetaType> = (meta): boolean => {
                if (!meta) return false;
                return meta?.type === 'A';
            };
            const results = system.query([], { filter });
            expect(results).toHaveLength(0);
        });

        test('should handle undefined filter in query hash', () => {
            const queryTags: Tag[] = [
                { category: 'color', value: 'red', confidence: 1.0 }
            ];
            
            // Test with undefined filter
            const hash1 = system['generateQueryHash'](queryTags);
            const hash2 = system['generateQueryHash'](queryTags, undefined);
            
            expect(hash1).toBe(hash2);
            expect(typeof hash1).toBe('string');
        });

        test('should handle undefined filter in stats', () => {
            const items: ItemTags<MetaType>[] = [
                {
                    id: 'item1',
                    tags: [{ category: 'color', value: 'red', confidence: 1.0 }],
                    meta: { type: 'test' }
                }
            ];
            system.addItemBatch(items);

            // Test with undefined filter
            const stats1 = system.getStats();
            const stats2 = system.getStats(undefined);

            expect(stats1).toEqual(stats2);
            expect(stats1.totalItems).toBe(1);
        });

        test('should handle undefined metadata in filter', () => {
            // Build index with some tags
            const tags: IndexTag[] = [
                { category: 'color', value: 'red' },
                { category: 'size', value: 'large' }
            ];
            system.buildIndex(tags);

            const items: ItemTags<MetaType>[] = [
                {
                    id: 'item1',
                    tags: [{ category: 'color', value: 'red', confidence: 1.0 }]
                },
                {
                    id: 'item2',
                    tags: [{ category: 'color', value: 'red', confidence: 1.0 }],
                    meta: { type: 'A' }
                }
            ];
            system.addItemBatch(items);

            // Query with filter that checks for undefined
            const filter: IFilter<MetaType> = (meta): boolean => {
                if (!meta) return true;
                return false;
            };
            const queryTags: Tag[] = [
                { category: 'color', value: 'red', confidence: 1.0 }
            ];
            const results = system.query(queryTags, { filter });
            expect(results).toHaveLength(1);
            expect(results[0].id).toBe('item1');

            // Get stats with filter
            const stats = system.getStats(filter);
            expect(stats.totalItems).toBe(1);
        });

        test('should handle filter with empty array', () => {
            // Build index with some tags
            const tags: IndexTag[] = [
                { category: 'color', value: 'red' },
                { category: 'size', value: 'large' }
            ];
            system.buildIndex(tags);

            const items: ItemTags<MetaType>[] = [
                {
                    id: 'item1',
                    tags: [{ category: 'color', value: 'red', confidence: 1.0 }],
                    meta: { tags: [], type: 'test' }
                },
                {
                    id: 'item2',
                    tags: [{ category: 'color', value: 'red', confidence: 1.0 }],
                    meta: { tags: ['A'], type: 'test' }
                }
            ];
            system.addItemBatch(items);

            // Query with filter that checks for empty array
            const filter: IFilter<MetaType> = (meta): boolean => {
                if (!meta) return false;
                return Array.isArray(meta.tags) && meta.tags.length === 0;
            };
            const queryTags: Tag[] = [
                { category: 'color', value: 'red', confidence: 1.0 }
            ];
            const results = system.query(queryTags, { filter });
            expect(results).toHaveLength(1);
            expect(results[0].id).toBe('item1');

            // Get stats with filter
            const stats = system.getStats(filter);
            expect(stats.totalItems).toBe(1);
        });

        test('should handle filter with null values', () => {
            // Build index with some tags
            const tags: IndexTag[] = [
                { category: 'color', value: 'red' },
                { category: 'size', value: 'large' }
            ];
            system.buildIndex(tags);

            const items: ItemTags<MetaType>[] = [
                {
                    id: 'item1',
                    tags: [{ category: 'color', value: 'red', confidence: 1.0 }],
                    meta: { value: null, type: 'test' }
                },
                {
                    id: 'item2',
                    tags: [{ category: 'color', value: 'red', confidence: 1.0 }],
                    meta: { value: '42', type: 'test' }
                }
            ];
            system.addItemBatch(items);

            // Query with filter that checks for null
            const filter: IFilter<MetaType> = (meta): boolean => {
                if (!meta) return false;
                return meta?.value === null;
            };
            const queryTags: Tag[] = [
                { category: 'color', value: 'red', confidence: 1.0 }
            ];
            const results = system.query(queryTags, { filter });
            expect(results).toHaveLength(1);
            expect(results[0].id).toBe('item1');

            // Get stats with filter
            const stats = system.getStats(filter);
            expect(stats.totalItems).toBe(1);
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
            const item: ItemTags<MetaType> = {
                id: 'item1',
                tags: [
                    { category: 'color', value: 'red', confidence: 1.0 }
                ],
                meta: { type: 'test' }
            };

            // Add item without metadata
            system.addItem(item);

            // Query with filter on undefined metadata
            const filter: IFilter<MetaType> = (meta): boolean => {
                if (!meta) return false;
                return meta?.type === 'A';
            };
            const results = system.query([], { filter });
            expect(results).toHaveLength(0);
        });
    });
});
