import { TagVectorSystem, Tag, IndexTag, ItemTags } from './index';

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

            system.removeTenders(['item1']);
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

            const results = system.query(queryTags, { page: 1, pageSize: 1 });
            expect(results.length).toBe(1);
            
            const allResults = system.query(queryTags, { page: 1, pageSize: 10 });
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
});
