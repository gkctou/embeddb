export interface IndexTag {
    category: string;
    value: string;
}

export interface CategoryWeight {
    category: string;
    weight?: number;
}

export interface Tag extends IndexTag {
    confidence: number;
}

export type MetaValue = Record<string, unknown>;

export interface ItemTags<T = MetaValue> {
    id: string;
    tags: Tag[];
    meta?: T;
}

export type SparseVector = Map<number, number>;
export type IFilter<T = MetaValue> = (meta: T | undefined, similarity: number, tags: Tag[]) => boolean;

export interface QueryOptions<T = MetaValue> {
    page?: number;
    size?: number;
    filter?: IFilter<T>;
}

export interface QueryResult {
    id: string;
    similarity: number;
}

export interface QueryCache<T = MetaValue> {
    queryHash: string;
    sortedResults: QueryResult[];
    filter?: IFilter<T>;
}

export interface ExportedData {
    categoryMap: {
        [category: string]: {
            [value: string]: number;
        };
    };
    vectorSize: number;
    categoryWeights: CategoryWeight[];
    itemVectors?: {
        [id: string]: [number, number][];  // [position, value][]
    };
}

export class TagVectorSystem<T = MetaValue> {
    private categoryMap: Map<string, Map<string, number>>;
    private vectorSize: number;
    private itemVectors: Map<string, SparseVector>;
    private queryCache: QueryCache<T> | null;
    private categoryWeights: Map<string, number>;
    private itemMeta: Map<string, T>;

    constructor() {
        this.categoryMap = new Map();
        this.vectorSize = 0;
        this.itemVectors = new Map();
        this.queryCache = null;
        this.categoryWeights = new Map();
        this.itemMeta = new Map();
    }

    // 匯出索引資料
    exportIndex(includeItems = true): ExportedData {
        const categoryMapObj: { [category: string]: { [value: string]: number } } = {};
        for (const [category, valueMap] of this.categoryMap.entries()) {
            categoryMapObj[category] = {};
            for (const [value, index] of valueMap.entries()) {
                categoryMapObj[category][value] = index;
            }
        }

        const data: ExportedData = {
            categoryMap: categoryMapObj,
            vectorSize: this.vectorSize,
            categoryWeights: Array.from(this.categoryWeights.entries()).map(([category, weight]) => ({
                category,
                weight
            }))
        };

        if (includeItems) {
            const itemVectors: { [id: string]: [number, number][] } = {};
            for (const [id, vector] of this.itemVectors.entries()) {
                itemVectors[id] = Array.from(vector.entries());
            }
            data.itemVectors = itemVectors;
        }

        return data;
    }

    // 從匯出的資料重建索引
    importIndex(data: ExportedData): void {
        // Clear existing data
        this.categoryMap.clear();
        this.itemVectors.clear();
        this.vectorSize = data.vectorSize;

        // Rebuild category map
        for (const [category, valueMap] of Object.entries(data.categoryMap)) {
            const newValueMap = new Map<string, number>();
            for (const [value, index] of Object.entries(valueMap)) {
                newValueMap.set(value, index);
            }
            this.categoryMap.set(category, newValueMap);
        }

        // Set category weights
        this.categoryWeights.clear();
        for (const weight of data.categoryWeights) {
            if (weight.weight !== undefined) {
                this.categoryWeights.set(weight.category, weight.weight);
            }
        }

        // Rebuild item vectors if present
        if (data.itemVectors) {
            for (const [id, vectorEntries] of Object.entries(data.itemVectors)) {
                const vector = new Map<number, number>();
                for (const [position, value] of vectorEntries) {
                    vector.set(position, value);
                }
                this.itemVectors.set(id, vector);
            }
        }
    }

    // 建立標籤索引
    buildIndex(allTags: IndexTag[]): void {
        this.categoryMap.clear();
        this.vectorSize = 0;

        // First pass: collect all unique categories and values
        for (const tag of allTags) {
            if (!this.categoryMap.has(tag.category)) {
                this.categoryMap.set(tag.category, new Map());
            }
            const valueMap = this.categoryMap.get(tag.category);
            if (valueMap && !valueMap.has(tag.value)) {
                valueMap.set(tag.value, this.vectorSize++);
            }
        }
    }

    // 將標籤轉換為稀疏向量
    encodeToSparseVector(tags: Tag[]): SparseVector {
        const vector = new Map<number, number>();
        for (const tag of tags) {
            const valueMap = this.categoryMap.get(tag.category);
            if (!valueMap) continue;

            const index = valueMap.get(tag.value);
            if (index === undefined) continue;

            const weight = this.categoryWeights.get(tag.category) || 1;
            vector.set(index, tag.confidence * weight);
        }
        return vector;
    }

    // 生成查詢雜湊值
    generateQueryHash(queryTags: Tag[], _filter?: IFilter<T>): string {
        // Sort tags by category and value to ensure consistent hash
        const sortedTags = [...queryTags].sort((a, b) => {
            const categoryCompare = a.category.localeCompare(b.category);
            if (categoryCompare !== 0) return categoryCompare;
            return a.value.localeCompare(b.value);
        });

        // Create hash string
        return sortedTags.map(tag => 
            `${tag.category}:${tag.value}:${tag.confidence}`
        ).join('|');
    }

    // 檢查快取是否匹配
    isCacheValid(queryHash: string, filter?: IFilter<T>): boolean {
        if (!this.queryCache) return false;
        if (this.queryCache.queryHash !== queryHash) return false;
        if (filter !== this.queryCache.filter) return false;
        return true;
    }

    // 分頁查詢相似標案（帶快取）
    query(queryTags: Tag[], options: QueryOptions<T> = {}): QueryResult[] {
        const { page = 1, size = 10, filter } = options;

        // 檢查快取是否有效
        const queryHash = this.generateQueryHash(queryTags, filter);
        if (this.isCacheValid(queryHash, filter)) {
            return this.queryCache?.sortedResults.slice((page - 1) * size, page * size) ?? [];
        }

        // 如果快取無效，重新計算
        const queryVector = this.encodeToSparseVector(queryTags);
        const similarities = Array.from(this.itemVectors.entries())
            .filter(([id]) => !filter || filter(this.itemMeta.get(id), 0, []))
            .map(([id, vector]) => ({
                id,
                similarity: this.cosineSimilarity(queryVector, vector)
            }))
            .filter(result => result.similarity > 0)
            .sort((a, b) => b.similarity - a.similarity);

        // 更新快取
        this.queryCache = {
            queryHash,
            sortedResults: similarities,
            filter
        };

        return similarities.slice((page - 1) * size, page * size);
    }

    // 批次添加標案
    addItemBatch(tenders: ItemTags<T>[]): void {
        for (const tender of tenders) {
            const vector = this.encodeToSparseVector(tender.tags);
            this.itemVectors.set(tender.id, vector);
            if (tender.meta !== undefined) {
                this.itemMeta.set(tender.id, tender.meta);
            }
        }
        this.clearQueryCache();
    }

    // 添加單個標案
    addItem(tender: ItemTags<T>): void {
        const vector = this.encodeToSparseVector(tender.tags);
        this.itemVectors.set(tender.id, vector);
        if (tender.meta !== undefined && tender.meta !== null) {
            this.itemMeta.set(tender.id, tender.meta);
        }
        this.clearQueryCache();
    }

    // 計算稀疏向量的餘弦相似度
    cosineSimilarity(vec1: SparseVector, vec2: SparseVector): number {
        let dotProduct = 0;
        let norm1 = 0;
        let norm2 = 0;

        // Calculate dot product and first vector's norm
        for (const [index, value1] of vec1.entries()) {
            norm1 += value1 * value1;
            const value2 = vec2.get(index);
            if (value2 !== undefined) {
                dotProduct += value1 * value2;
            }
        }

        // Calculate second vector's norm
        for (const value2 of vec2.values()) {
            norm2 += value2 * value2;
        }

        // Handle zero vectors
        if (norm1 === 0 || norm2 === 0) return 0;

        return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
    }

    // 查詢最相似的一個標案
    queryFirst(queryTags: Tag[], filter?: IFilter<T>): QueryResult | null {
        const results = this.query(queryTags, { size: 1, filter });
        return results.length > 0 ? results[0] : null;
    }

    // 取得系統統計資訊
    getStats(filter?: IFilter<T>): { 
        totalItems: number;
        totalTags: number;
        memoryUsage: {
            categoryMapSize: number;
            hasCachedQuery: boolean;
        };
    } {
        const matchingItems = filter 
            ? Array.from(this.itemVectors.keys()).filter(id => filter(this.itemMeta.get(id), 0, []))
            : Array.from(this.itemVectors.keys());

        let totalTags = 0;
        for (const valueMap of this.categoryMap.values()) {
            totalTags += valueMap.size;
        }

        return {
            totalItems: matchingItems.length,
            totalTags,
            memoryUsage: {
                categoryMapSize: this.categoryMap.size,
                hasCachedQuery: this.queryCache !== null
            }
        };
    }

    // 清理指定標案
    removeItems(itemIds: string[]): void {
        for (const id of itemIds) {
            this.itemVectors.delete(id);
            this.itemMeta.delete(id);
        }
        this.clearQueryCache();
    }

    // 手動清除查詢快取
    clearQueryCache(): void {
        this.queryCache = null;
    }

    // 設置類型權重
    setCategoryWeight(category: string, weight: number): void {
        this.categoryWeights.set(category, weight);
        this.clearQueryCache();
    }

    // 批次設置類型權重
    setCategoryWeights(weights: CategoryWeight[]): void {
        for (const weight of weights) {
            if (weight.weight !== undefined) {
                this.categoryWeights.set(weight.category, weight.weight);
            }
        }
        this.clearQueryCache();
    }

    // 獲取類型權重
    getCategoryWeight(category: string): number {
        return this.categoryWeights.get(category) || 1;
    }

    // 獲取所有類型權重
    getAllCategoryWeights(): CategoryWeight[] {
        return Array.from(this.categoryWeights.entries()).map(([category, weight]) => ({
            category,
            weight
        }));
    }
}
