import { TagVectorSystem, Tag, IndexTag, ItemTags, IFilter } from './index';

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
        { category: 'size', value: 'large' },
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
        { category: 'size', value: 'large' },
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
      { category: 'size', value: 'small' },
    ];

    beforeEach(() => {
      system.buildIndex(baseTags);
    });

    test('should add items correctly', () => {
      const item1Tags: Tag[] = [
        { category: 'color', value: 'red', confidence: 1.0 },
        { category: 'size', value: 'large', confidence: 0.8 },
      ];
      const item2Tags: Tag[] = [
        { category: 'color', value: 'blue', confidence: 1.0 },
        { category: 'size', value: 'large', confidence: 0.9 },
      ];

      system.addItem({ id: 'item1', tags: item1Tags, meta: { type: 'test' } });
      system.addItem({ id: 'item2', tags: item2Tags, meta: { type: 'test' } });

      const stats = system.getStats();
      expect(stats.totalItems).toBe(2);
    });

    test('should handle batch operations', () => {
      const items: ItemTags<MetaType>[] = Array.from(
        { length: 100 },
        (_, i) => ({
          id: `item${i}`,
          tags: [
            { category: 'color', value: 'red', confidence: Math.random() },
            { category: 'size', value: 'large', confidence: Math.random() },
          ],
          meta: { type: 'test' },
        }),
      );

      system.addItemBatch(items);
      const stats = system.getStats();
      expect(stats.totalItems).toBe(100);
    });

    test('should handle item removal', () => {
      const items: ItemTags<MetaType>[] = [
        {
          id: 'item1',
          tags: [{ category: 'color', value: 'red', confidence: 1.0 }],
          meta: { type: 'test' },
        },
        {
          id: 'item2',
          tags: [{ category: 'color', value: 'blue', confidence: 1.0 }],
          meta: { type: 'test' },
        },
      ];

      system.addItemBatch(items);
      expect(system.getStats().totalItems).toBe(2);

      system.removeItems(['item1']);
      expect(system.getStats().totalItems).toBe(1);
    });
  });

  describe('Vector Query Operations', () => {
    beforeEach(() => {
      // Build index with test tags
      const tags: IndexTag[] = [
        { category: 'color', value: 'red' },
        { category: 'color', value: 'blue' },
        { category: 'size', value: 'large' },
        { category: 'size', value: 'small' },
      ];
      system.buildIndex(tags);

      // Add test items
      const items: ItemTags<MetaType>[] = [
        {
          id: 'item1',
          tags: [
            { category: 'color', value: 'red', confidence: 1.0 },
            { category: 'size', value: 'large', confidence: 0.8 },
          ],
          meta: { type: 'A' },
        },
        {
          id: 'item2',
          tags: [
            { category: 'color', value: 'blue', confidence: 1.0 },
            { category: 'size', value: 'small', confidence: 0.9 },
          ],
          meta: { type: 'B' },
        },
      ];
      system.addItemBatch(items);
    });

    test('should return all items with similarity scores when no filter', () => {
      const queryTags: Tag[] = [
        { category: 'color', value: 'red', confidence: 1.0 },
      ];
      
      const results = system.query(queryTags);
      expect(results).toHaveLength(2); // Should return both items
      expect(results[0].id).toBe('item1'); // Most similar first
      expect(results[0].similarity).toBeGreaterThan(results[1].similarity);
    });

    test('should handle empty query tags', () => {
      const results = system.query([]);
      expect(results).toHaveLength(2); // Should return all items
      // Empty query = equal similarity
      expect(results[0].similarity).toBe(results[1].similarity);
    });

    test('should handle pagination without affecting similarity scores', () => {
      const queryTags: Tag[] = [
        { category: 'color', value: 'red', confidence: 1.0 },
      ];
      
      // Add more items to test pagination
      system.addItem({
        id: 'item3',
        tags: [{ category: 'color', value: 'red', confidence: 0.5 }],
        meta: { type: 'C' },
      });
      
      const page1 = system.query(queryTags, { page: 1, size: 2 });
      const page2 = system.query(queryTags, { page: 2, size: 2 });
      
      expect(page1).toHaveLength(2);
      expect(page2).toHaveLength(1);
      expect(page1[0].similarity).toBeGreaterThan(page1[1].similarity);
      expect(page1[1].similarity).toBeGreaterThan(page2[0].similarity);
    });

    test('should handle queryFirst correctly', () => {
      const queryTags: Tag[] = [
        { category: 'color', value: 'red', confidence: 1.0 },
      ];

      const result = system.queryFirst(queryTags);
      expect(result).toBeTruthy();
      expect(result?.id).toBe('item1');
      expect(result?.similarity).toBeGreaterThan(0);
    });
  });

  describe('Filter Query Operations', () => {
    beforeEach(() => {
      // Same setup as above
      const tags: IndexTag[] = [
        { category: 'color', value: 'red' },
        { category: 'color', value: 'blue' },
        { category: 'size', value: 'large' },
        { category: 'size', value: 'small' },
      ];
      system.buildIndex(tags);

      const items: ItemTags<MetaType>[] = [
        {
          id: 'item1',
          tags: [
            { category: 'color', value: 'red', confidence: 1.0 },
            { category: 'size', value: 'large', confidence: 0.8 },
          ],
          meta: { type: 'A' },
        },
        {
          id: 'item2',
          tags: [
            { category: 'color', value: 'blue', confidence: 1.0 },
            { category: 'size', value: 'small', confidence: 0.9 },
          ],
          meta: { type: 'B' },
        },
      ];
      system.addItemBatch(items);
    });

    test('should filter results by metadata', () => {
      const queryTags: Tag[] = [
        { category: 'color', value: 'red', confidence: 1.0 },
      ];
      
      const filterA: IFilter<MetaType> = (meta) => meta?.type === 'A';
      const resultsA = system.query(queryTags, { filter: filterA });
      expect(resultsA).toHaveLength(1);
      expect(resultsA[0].id).toBe('item1');
      
      const filterB: IFilter<MetaType> = (meta) => meta?.type === 'B';
      const resultsB = system.query(queryTags, { filter: filterB });
      expect(resultsB).toHaveLength(1);
      expect(resultsB[0].id).toBe('item2');
    });

    test('should handle filter that matches no items', () => {
      const queryTags: Tag[] = [
        { category: 'color', value: 'red', confidence: 1.0 },
      ];
      
      const filterNone: IFilter<MetaType> = (meta) => meta?.type === 'C';
      const results = system.query(queryTags, { filter: filterNone });
      expect(results).toHaveLength(0);
    });

    test('should combine vector similarity and filter', () => {
      const queryTags: Tag[] = [
        { category: 'color', value: 'red', confidence: 1.0 },
      ];
      
      const filterA: IFilter<MetaType> = (meta) => meta?.type === 'A';
      const results = system.query(queryTags, { filter: filterA });
      
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('item1');
      expect(results[0].similarity).toBeGreaterThan(0);
    });

    test('should handle undefined metadata in filter', () => {
      const queryTags: Tag[] = [
        { category: 'color', value: 'red', confidence: 1.0 },
      ];
      
      const filter: IFilter<MetaType> = (meta) => meta === undefined;
      const results = system.query(queryTags, { filter });
      expect(results).toHaveLength(0);
    });
  });

  describe('Index Import/Export', () => {
    const baseTags: IndexTag[] = [
      { category: 'color', value: 'red' },
      { category: 'color', value: 'blue' },
      { category: 'size', value: 'large' },
    ];

    beforeEach(() => {
      system.buildIndex(baseTags);
      system.setCategoryWeight('color', 2.0);
    });

    test('should export index data correctly', () => {
      const exportedData = system.exportIndex(true);
      
      expect(exportedData.vectorSize).toBe(3);
      expect(Object.keys(exportedData.categoryMap)).toHaveLength(2);
      expect(exportedData.categoryWeights).toHaveLength(1);
      expect(exportedData.categoryWeights[0]).toEqual({
        category: 'color',
        weight: 2.0,
      });
    });

    test('should export index data without items', () => {
      const exportedData = system.exportIndex(false);
      expect(exportedData.itemVectors).toBeUndefined();
    });

    test('should import index data correctly', () => {
      // First export
      const item: ItemTags<MetaType> = {
        id: 'test1',
        tags: [
          { category: 'color', value: 'red', confidence: 1.0 },
          { category: 'size', value: 'large', confidence: 0.8 },
        ],
        meta: { type: 'test' },
      };
      system.addItem(item);
      const exportedData = system.exportIndex(true);

      // Create new system and import
      const newSystem = new TagVectorSystem<MetaType>();
      newSystem.importIndex(exportedData);

      // Verify imported data
      expect(newSystem.getStats().totalTags).toBe(3);
      expect(newSystem.getCategoryWeight('color')).toBe(2.0);
      
      // Query should work on imported system
      const results = newSystem.query([
        { category: 'color', value: 'red', confidence: 1.0 },
      ]);
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('test1');
    });

    test('should import index data without items', () => {
      const exportedData = system.exportIndex(false);
      const newSystem = new TagVectorSystem<MetaType>();
      newSystem.importIndex(exportedData);

      expect(newSystem.getStats().totalTags).toBe(3);
      expect(newSystem.getCategoryWeight('color')).toBe(2.0);
      expect(newSystem.getStats().totalItems).toBe(0);
    });
  });

  describe('Cache Operations', () => {
    test('should use cache for same query without filter', () => {
      // Setup same as above
      const tags: IndexTag[] = [
        { category: 'test', value: 'value' },
      ];
      system.buildIndex(tags);

      const items: ItemTags<MetaType>[] = [
        {
          id: 'item1',
          tags: [{ category: 'test', value: 'value', confidence: 1.0 }],
          meta: { type: 'A' },
        },
      ];
      system.addItemBatch(items);

      const queryTags: Tag[] = [
        { category: 'test', value: 'value', confidence: 1.0 },
      ];
      
      const firstResults = system.query(queryTags);
      const cachedResults = system.query(queryTags);
      
      expect(firstResults).toEqual(cachedResults);
    });

    test('should not use cache when filter changes', () => {
      // Same setup
      const tags: IndexTag[] = [
        { category: 'type', value: 'test' },
      ];
      system.buildIndex(tags);

      const items: ItemTags<MetaType>[] = [
        {
          id: 'item1',
          tags: [{ category: 'type', value: 'test', confidence: 1.0 }],
          meta: { type: 'A' },
        },
      ];
      system.addItemBatch(items);

      const queryTags: Tag[] = [
        { category: 'type', value: 'test', confidence: 1.0 },
      ];
      
      const filterA: IFilter<MetaType> = (meta) => meta?.type === 'A';
      const filterB: IFilter<MetaType> = (meta) => meta?.type === 'B';
      
      const resultsA = system.query(queryTags, { filter: filterA });
      const resultsB = system.query(queryTags, { filter: filterB });
      
      expect(resultsA).toHaveLength(1);
      expect(resultsB).toHaveLength(0);
    });

    test('should clear cache after item changes', () => {
      const tags: IndexTag[] = [
        { category: 'test', value: 'value' },
      ];
      system.buildIndex(tags);

      const queryTags: Tag[] = [
        { category: 'test', value: 'value', confidence: 1.0 },
      ];

      // Initial query
      const initialResults = system.query(queryTags);
      expect(initialResults).toHaveLength(0);

      // Add an item
      system.addItem({
        id: 'item1',
        tags: [{ category: 'test', value: 'value', confidence: 1.0 }],
        meta: { type: 'A' },
      });

      // Query again - should not use cache
      const resultsAfterAdd = system.query(queryTags);
      expect(resultsAfterAdd).toHaveLength(1);

      // Remove the item
      system.removeItems(['item1']);

      // Query again - should not use cache
      const resultsAfterRemove = system.query(queryTags);
      expect(resultsAfterRemove).toHaveLength(0);
    });
  });

  describe('Edge Cases', () => {
    test('should handle zero vectors in similarity calculation', () => {
      system.buildIndex([{ category: 'test', value: 'value' }]);
      
      const emptyTags: Tag[] = [];
      const nonEmptyTags: Tag[] = [
        { category: 'test', value: 'value', confidence: 1.0 },
      ];

      system.addItem({ id: 'empty', tags: emptyTags });
      system.addItem({ id: 'nonempty', tags: nonEmptyTags });

      const results = system.query(nonEmptyTags);
      expect(results).toHaveLength(2);
      expect(results[0].id).toBe('nonempty');
      expect(results[1].id).toBe('empty');
      expect(results[1].similarity).toBe(0);
    });

    test('should handle stats with filter', () => {
      system.buildIndex([{ category: 'type', value: 'test' }]);
      
      system.addItem({
        id: 'item1',
        tags: [{ category: 'type', value: 'test', confidence: 1.0 }],
        meta: { type: 'A' },
      });
      system.addItem({
        id: 'item2',
        tags: [{ category: 'type', value: 'test', confidence: 1.0 }],
        meta: { type: 'B' },
      });

      const filterA: IFilter<MetaType> = (meta, _similarity, _tags) => 
        meta?.type === 'A';
      const stats = system.getStats(filterA);
      
      expect(stats.totalItems).toBe(1);
      expect(stats.totalTags).toBe(1);
    });

    test('should handle category weights operations', () => {
      // Test getting non-existent weight
      expect(system.getCategoryWeight('nonexistent')).toBe(1);

      // Test setting and getting weights
      system.setCategoryWeight('test', 2.0);
      expect(system.getCategoryWeight('test')).toBe(2.0);

      // Test getting all weights
      const weights = system.getAllCategoryWeights();
      expect(weights).toHaveLength(1);
      expect(weights[0]).toEqual({ category: 'test', weight: 2.0 });

      // Test batch setting weights
      system.setCategoryWeights([
        { category: 'test1', weight: 1.5 },
        { category: 'test2', weight: 2.5 },
        { category: 'test3' }, // undefined weight should be skipped
      ]);

      const allWeights = system.getAllCategoryWeights();
      expect(allWeights).toHaveLength(3); // Including the previous 'test' weight
      expect(allWeights.find(w => w.category === 'test')?.weight).toBe(2.0);
      expect(allWeights.find(w => w.category === 'test1')?.weight).toBe(1.5);
      expect(allWeights.find(w => w.category === 'test2')?.weight).toBe(2.5);
      expect(allWeights.find(w => w.category === 'test3')).toBeUndefined();
    });
  });
});
