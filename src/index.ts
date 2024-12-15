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

export interface ItemTags<T = Record<string, any>> {
    id: string;
    tags: Tag[];
    meta?: T;
}

export type SparseVector = Map<number, number>;
export type IFilter<T = Record<string, any>> = (value: T, index: number, array: T[]) => boolean;

export interface QueryOptions<T = Record<string, any>> {
    page?: number;
    size?: number;
    filter?: IFilter
}

export interface QueryResult {
    id: string;
    similarity: number;
}

// 快取結構
export interface QueryCache<T = Record<string, any>> {
    queryHash: string;              // 查詢的雜湊值
    sortedResults: QueryResult[];   // 排序後的完整結果
    filter?: IFilter<T>;         // 查詢使用的 filter 函數
}

// 匯出資料的介面定義
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

export class TagVectorSystem {
    private categoryMap: Map<string, Map<string, number>>;
    private vectorSize: number;
    private itemVectors: Map<string, SparseVector>;
    private queryCache: QueryCache | null;
    private categoryWeights: Map<string, number>;
    private itemMeta: Map<string, Record<string, any>>;

    constructor() {
        this.categoryMap = new Map();
        this.vectorSize = 0;
        this.itemVectors = new Map();
        this.queryCache = null;
        this.categoryWeights = new Map();
        this.itemMeta = new Map();
    }

    // 匯出索引資料
    exportIndex(includeItems: boolean = true): ExportedData {
        // 轉換 categoryMap
        const exportedCategoryMap: { [key: string]: { [key: string]: number } } = {};
        this.categoryMap.forEach((valueMap, category) => {
            exportedCategoryMap[category] = {};
            valueMap.forEach((position, value) => {
                exportedCategoryMap[category][value] = position;
            });
        });

        // 基本匯出資料
        const exportData: ExportedData = {
            categoryMap: exportedCategoryMap,
            vectorSize: this.vectorSize,
            categoryWeights: Array.from(this.categoryWeights.entries()).map(([category, weight]) => ({ category, weight }))
        };

        // 如果需要包含項目向量
        if (includeItems) {
            const exportedItemVectors: { [key: string]: [number, number][] } = {};
            this.itemVectors.forEach((vector, id) => {
                exportedItemVectors[id] = Array.from(vector.entries());
            });
            exportData.itemVectors = exportedItemVectors;
        }

        return exportData;
    }

    // 從匯出的資料重建索引
    importIndex(data: ExportedData): void {
        // 重建 categoryMap
        this.categoryMap = new Map();
        Object.entries(data.categoryMap).forEach(([category, valueMap]) => {
            const newValueMap = new Map();
            Object.entries(valueMap).forEach(([value, position]) => {
                newValueMap.set(value, position);
            });
            this.categoryMap.set(category, newValueMap);
        });

        // 設定 vectorSize
        this.vectorSize = data.vectorSize;

        // 設定 categoryWeights
        this.categoryWeights = new Map();
        data.categoryWeights.forEach(({ category, weight }) => {
            this.categoryWeights.set(category, weight || 1);
        });

        // 重建 itemVectors（如果有提供的話）
        this.itemVectors = new Map();
        if (data.itemVectors) {
            Object.entries(data.itemVectors).forEach(([id, vectors]) => {
                const sparseVector = new Map(vectors);
                this.itemVectors.set(id, sparseVector);
            });
        }

        // 清除快取
        this.queryCache = null;
    }

    // 建立標籤索引
    buildIndex(allTags: IndexTag[]) {
        let position = 0;
        allTags.forEach(tag => {
            if (!this.categoryMap.has(tag.category)) {
                this.categoryMap.set(tag.category, new Map());
            }
            const valueMap = this.categoryMap.get(tag.category)!;
            if (!valueMap.has(tag.value)) {
                valueMap.set(tag.value, position++);
            }
        });
        this.vectorSize = position;
    }

    // 將標籤轉換為稀疏向量
    private encodeToSparseVector(tags: Tag[]): SparseVector {
        const sparseVector = new Map();
        tags.forEach(tag => {
            const valueMap = this.categoryMap.get(tag.category);
            if (valueMap && valueMap.has(tag.value)) {
                const position = valueMap.get(tag.value)!;
                if (tag.confidence > 0) {
                    sparseVector.set(position, tag.confidence * (this.categoryWeights.get(tag.category) || 1));
                }
            }
        });
        return sparseVector;
    }

    // 生成查詢雜湊值
    private generateQueryHash(queryTags: Tag[], filter?: IFilter<any>): string {
        // 只需要處理 tags 的部分，filter 會用指標比較
        return JSON.stringify(queryTags.sort((a, b) =>
            a.category.localeCompare(b.category) ||
            a.value.localeCompare(b.value) ||
            a.confidence - b.confidence
        ));
    }

    // 檢查快取是否匹配
    private isCacheValid(queryHash: string, filter?: IFilter<any>): boolean {
        if (!this.queryCache) return false;
        
        // 使用指標相等來比較 filter
        // 如果快取和查詢都沒有 filter，視為相等
        // 如果其中一個有 filter 而另一個沒有，視為不相等
        // 如果都有 filter，比較是否為同一個物件
        return this.queryCache.queryHash === queryHash && 
               ((!filter && !this.queryCache.filter) || 
                (filter && this.queryCache.filter && filter === this.queryCache.filter)) as boolean;
    }

    /**
     * 分頁查詢相似標案（帶快取）
     * 注意：如果要使用 filter 快取功能，請先創建 filter 物件再傳入，例如：
     * const myFilter = (meta: MyType) => meta.someField === 'value';
     * system.query(tags, { filter: myFilter });
     * 
     * 不建議使用 inline 宣告的 filter，這會導致快取失效，例如：
     * // 這樣會導致每次查詢都建立新的 filter 物件，使快取失效
     * system.query(tags, { filter: (meta) => meta.someField === 'value' });
     */
    query<T extends Record<string, any> = Record<string, any>>(queryTags: Tag[], options: QueryOptions<T> = {}): QueryResult[] {
        const { page = 1, size = 10, filter } = options;

        // 檢查快取是否有效
        const queryHash = this.generateQueryHash(queryTags, filter);
        if (this.isCacheValid(queryHash, filter)) {
            return this.queryCache!.sortedResults.slice((page - 1) * size, page * size);
        }

        // 如果快取無效，重新計算
        const queryVector = this.encodeToSparseVector(queryTags);
        const similarities = Array.from(this.itemVectors.entries())
            .filter(([id]) => !filter || filter((this.itemMeta.get(id) || {}) as T, 0, []))
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
    addItemBatch(tenders: ItemTags[], batchSize: number = 1000) {
        for (let i = 0; i < tenders.length; i += batchSize) {
            const batch = tenders.slice(i, i + batchSize);
            batch.forEach(tender => {
                const sparseVector = this.encodeToSparseVector(tender.tags);
                this.itemVectors.set(tender.id, sparseVector);
                if (tender.meta) {
                    this.itemMeta.set(tender.id, tender.meta);
                }
            });
        }
        // 清除快取，因為資料已更新
        this.queryCache = null;
    }

    // 添加單個標案
    addItem(tender: ItemTags) {
        this.addItemBatch([tender]);
    }

    // 計算稀疏向量的餘弦相似度
    private cosineSimilarity(vec1: SparseVector, vec2: SparseVector): number {
        let dotProduct = 0;
        let norm1 = 0;
        let norm2 = 0;

        for (const [pos, val1] of vec1.entries()) {
            const val2 = vec2.get(pos) || 0;
            dotProduct += val1 * val2;
            norm1 += val1 * val1;
        }

        for (const [_, val2] of vec2.entries()) {
            norm2 += val2 * val2;
        }

        norm1 = Math.sqrt(norm1);
        norm2 = Math.sqrt(norm2);

        return norm1 && norm2 ? dotProduct / (norm1 * norm2) : 0;
    }

    /**
     * 查詢最相似的一個標案
     * 注意：如果要使用 filter 快取功能，請先創建 filter 物件再傳入
     */
    queryFirst<T extends Record<string, any> = Record<string, any>>(queryTags: Tag[], filter?: IFilter<T>): QueryResult | null {
        const queryVector = this.encodeToSparseVector(queryTags);
        let maxSimilarity = -1;
        let bestMatch: QueryResult | null = null;

        for (const [id, vector] of this.itemVectors.entries()) {
            // 如果有 filter，檢查是否符合條件
            if (filter && !filter((this.itemMeta.get(id) || {}) as T, 0, [])) {
                continue;
            }
            const similarity = this.cosineSimilarity(queryVector, vector);
            if (similarity > maxSimilarity && similarity > 0) {
                maxSimilarity = similarity;
                bestMatch = { id, similarity };
            }
        }

        return bestMatch;
    }

    // 取得系統統計資訊
    getStats<T = Record<string, any>>(filter?: IFilter<T>) {
        const matchingItems = filter 
            ? Array.from(this.itemVectors.keys()).filter(id => filter((this.itemMeta.get(id) || {}) as T, 0, []))
            : Array.from(this.itemVectors.keys());

        return {
            totalItems: matchingItems.length,
            totalTags: this.vectorSize,
            memoryUsage: {
                categoryMapSize: this.categoryMap.size,
                vectorsSize: this.itemVectors.size,
                hasCachedQuery: this.queryCache !== null
            }
        };
    }

    // 清理指定標案
    removeItems(itemIds: string[]) {
        itemIds.forEach(id => {
            this.itemVectors.delete(id);
            this.itemMeta.delete(id);
        });
        // 清除快取，因為資料已更新
        this.queryCache = null;
    }

    // 手動清除查詢快取
    clearQueryCache() {
        this.queryCache = null;
    }

    // 設置類型權重
    setCategoryWeight(category: string, weight: number) {
        this.categoryWeights.set(category, weight);
        // 清除快取，因為權重變更會影響相似度計算
        this.queryCache = null;
    }

    // 批次設置類型權重
    setCategoryWeights(weights: CategoryWeight[]) {
        weights.forEach(({ category, weight }) => {
            this.categoryWeights.set(category, weight || 1);
        });
        // 清除快取，因為權重變更會影響相似度計算
        this.queryCache = null;
    }

    // 獲取類型權重
    getCategoryWeight(category: string): number {
        return this.categoryWeights.get(category) || 1;
    }

    // 獲取所有類型權重
    getAllCategoryWeights(): CategoryWeight[] {
        return Array.from(this.categoryWeights.entries())
            .map(([category, weight]) => ({ category, weight }));
    }
}
