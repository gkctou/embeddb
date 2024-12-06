export interface IndexTag {
    category: string;
    value: string;
}
export interface Tag extends IndexTag {
    confidence: number;
}

export interface ItemTags {
    id: string;
    tags: Tag[];
}

export type SparseVector = Map<number, number>;

export interface QueryOptions {
    page?: number;
    pageSize?: number;
}

export interface QueryResult {
    id: string;
    similarity: number;
}

// 快取結構
export interface QueryCache {
    queryHash: string;              // 查詢的雜湊值
    sortedResults: QueryResult[];   // 排序後的完整結果
}

// 匯出資料的介面定義
export interface ExportedData {
    categoryMap: {
        [category: string]: {
            [value: string]: number;
        };
    };
    vectorSize: number;
    itemVectors?: {
        [id: string]: [number, number][];  // [position, value][]
    };
}

export class TagVectorSystem {
    private categoryMap: Map<string, Map<string, number>>;
    private vectorSize: number;
    private itemVectors: Map<string, SparseVector>;
    private queryCache: QueryCache | null;

    constructor() {
        this.categoryMap = new Map();
        this.vectorSize = 0;
        this.itemVectors = new Map();
        this.queryCache = null;
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
            vectorSize: this.vectorSize
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
            const newValueMap = new Map<string, number>();
            Object.entries(valueMap).forEach(([value, position]) => {
                newValueMap.set(value, position);
            });
            this.categoryMap.set(category, newValueMap);
        });

        // 設定 vectorSize
        this.vectorSize = data.vectorSize;

        // 重建 itemVectors（如果有提供的話）
        this.itemVectors = new Map();
        if (data.itemVectors) {
            Object.entries(data.itemVectors).forEach(([id, vectors]) => {
                const sparseVector = new Map<number, number>(vectors);
                this.itemVectors.set(id, sparseVector);
            });
        }

        // 清除快取
        this.queryCache = null;
    }

    // 建立標籤索引
    buildIndex(allTags: IndexTag[]): void {
        let position = 0;
        allTags.forEach(tag => {
            if (!this.categoryMap.has(tag.category)) {
                this.categoryMap.set(tag.category, new Map<string, number>());
            }
            const valueMap = this.categoryMap.get(tag.category);
            if (valueMap && !valueMap.has(tag.value)) {
                valueMap.set(tag.value, position++);
            }
        });
        this.vectorSize = position;
    }

    // 將標籤轉換為稀疏向量
    private encodeToSparseVector(tags: Tag[]): SparseVector {
        const sparseVector = new Map<number, number>();
        let hasValidTags = false;
        tags.forEach(tag => {
            const valueMap = this.categoryMap.get(tag.category);
            if (valueMap && valueMap.has(tag.value)) {
                const position = valueMap.get(tag.value);
                if (position !== undefined && tag.confidence > 0) {
                    sparseVector.set(position, tag.confidence);
                    hasValidTags = true;
                }
            }
        });
        return hasValidTags ? sparseVector : new Map<number, number>();
    }

    // 生成查詢雜湊值
    private generateQueryHash(tags: Tag[]): string {
        return JSON.stringify(tags.sort((a, b) =>
            a.category.localeCompare(b.category) ||
            a.value.localeCompare(b.value) ||
            a.confidence - b.confidence
        ));
    }

    // 檢查快取是否匹配
    private isCacheValid(queryHash: string): boolean {
        return this.queryCache !== null && this.queryCache.queryHash === queryHash;
    }

    // 批次添加標案
    addItemBatch(tenders: ItemTags[], batchSize = 1000): void {
        for (let i = 0; i < tenders.length; i += batchSize) {
            const batch = tenders.slice(i, i + batchSize);
            batch.forEach(tender => {
                const sparseVector = this.encodeToSparseVector(tender.tags);
                this.itemVectors.set(tender.id, sparseVector);
            });
        }
        // 清除快取，因為資料已更新
        this.queryCache = null;
    }

    // 添加單個標案
    addItem(tender: ItemTags): void {
        this.addItemBatch([tender]);
    }

    // 計算稀疏向量的餘弦相似度
    private cosineSimilarity(vec1: SparseVector, vec2: SparseVector): number {
        let dotProduct = 0;
        let norm1 = 0;
        let norm2 = 0;

        for (const [pos, val1] of vec1.entries()) {
            const val2 = vec2.get(pos) ?? 0;
            dotProduct += val1 * val2;
            norm1 += val1 * val1;
        }

        for (const val2 of vec2.values()) {
            norm2 += val2 * val2;
        }

        norm1 = Math.sqrt(norm1);
        norm2 = Math.sqrt(norm2);

        return norm1 && norm2 ? dotProduct / (norm1 * norm2) : 0;
    }

    // 查詢最相似的一個標案
    queryFirst(queryTags: Tag[]): QueryResult | null {
        const queryVector = this.encodeToSparseVector(queryTags);
        if (queryVector.size === 0) return null;

        let maxSimilarity = -1;
        let bestMatch: QueryResult | null = null;

        for (const [id, vector] of this.itemVectors.entries()) {
            const similarity = this.cosineSimilarity(queryVector, vector);
            if (similarity > maxSimilarity) {
                maxSimilarity = similarity;
                bestMatch = { id, similarity };
            }
        }

        return bestMatch && maxSimilarity > 0 ? bestMatch : null;
    }

    // 分頁查詢相似標案（帶快取）
    query(queryTags: Tag[], options: QueryOptions = {}): QueryResult[] {
        const queryVector = this.encodeToSparseVector(queryTags);
        if (queryVector.size === 0) return [];

        const { page = 1, pageSize = 10 } = options;
        const queryHash = this.generateQueryHash(queryTags);

        // 檢查快取是否可用
        if (this.isCacheValid(queryHash)) {
            const cache = this.queryCache;
            if (cache) {
                const startIndex = (page - 1) * pageSize;
                const endIndex = startIndex + pageSize;
                return cache.sortedResults.slice(startIndex, endIndex);
            }
        }

        // 如果快取無效，重新計算
        const similarities = Array.from(this.itemVectors.entries())
            .map(([id, vector]) => ({
                id,
                similarity: this.cosineSimilarity(queryVector, vector)
            }))
            .filter(result => result.similarity > 0)
            .sort((a, b) => b.similarity - a.similarity);

        // 更新快取
        this.queryCache = {
            queryHash,
            sortedResults: similarities
        };

        // 返回請求的分頁
        const startIndex = (page - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        return similarities.slice(startIndex, endIndex);
    }

    // 取得系統統計資訊
    getStats(): { totalItems: number; totalTags: number; memoryUsage: { categoryMapSize: number; vectorsSize: number; hasCachedQuery: boolean; } } {
        return {
            totalItems: this.itemVectors.size,
            totalTags: this.vectorSize,
            memoryUsage: {
                categoryMapSize: this.categoryMap.size,
                vectorsSize: this.itemVectors.size,
                hasCachedQuery: this.queryCache !== null
            }
        };
    }

    // 清理指定標案
    removeTenders(itemIds: string[]): void {
        itemIds.forEach(id => {
            this.itemVectors.delete(id);
        });
        // 清除快取，因為資料已更新
        this.queryCache = null;
    }

    // 手動清除查詢快取
    clearQueryCache(): void {
        this.queryCache = null;
    }
}
