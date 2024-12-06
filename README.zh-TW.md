# 🚀 EmbedDB

[English](README.md) | [繁體中文](README.zh-TW.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Español](README.es.md) | [Français](README.fr.md) | [Deutsch](README.de.md)

嘿！歡迎來到 EmbedDB！這是一個超酷的向量化標籤系統，用 TypeScript 寫成的。它能讓你輕鬆地進行相似度搜尋，就像有個AI助手在幫你找東西一樣！ 🎯

## ✨ 特色功能

- 🔍 超強的向量化相似度搜尋
- ⚖️ 支援帶權重的標籤（你說這個標籤很重要，那它就很重要！）
- 🚄 批次處理功能（一次處理一堆資料，效能棒棒！）
- 💾 內建查詢快取（重複的查詢？快得跟閃電一樣！）
- 📝 完整的 TypeScript 支援（型別安全，開發安心！）
- 🎯 高效的稀疏向量實現（省記憶體的好幫手）

## 🎮 快速開始

首先，安裝套件：
```bash
npm install embeddb
```

來看看怎麼使用：

```typescript
import { TagVectorSystem, Tag, IndexTag } from 'embeddb';

// 建立一個新系統
const system = new TagVectorSystem();

// 先定義我們的標籤集合
const tags: IndexTag[] = [
    { category: 'color', value: 'red' },    // 紅色
    { category: 'color', value: 'blue' },   // 藍色
    { category: 'size', value: 'large' }    // 大尺寸
];

// 建立標籤索引（這步很重要！）
system.buildIndex(tags);

// 添加一個項目，帶著它的標籤和信心分數
const item = {
    id: 'cool-item-1',
    tags: [
        { category: 'color', value: 'red', confidence: 1.0 },   // 我很確定它是紅色的！
        { category: 'size', value: 'large', confidence: 0.8 }   // 八成確定它很大
    ]
};
system.addItem(item);

// 來找找看有什麼相似的東西
const queryTags: Tag[] = [
    { category: 'color', value: 'red', confidence: 1.0 }  // 我想找紅色的東西
];
const results = system.query(queryTags, { page: 1, pageSize: 10 });
```

## 🛠 API 說明

### TagVectorSystem 類別

這是我們的主角！它負責處理所有的操作。

#### 主要方法

- 🏗 `buildIndex(tags: IndexTag[])`: 建立標籤索引
  ```typescript
  // 定義你的標籤世界！
  system.buildIndex([
    { category: 'color', value: 'red' },
    { category: 'style', value: 'modern' }
  ]);
  ```

- ➕ `addItem(item: ItemTags)`: 添加單個項目
  ```typescript
  // 添加一個很酷的項目
  system.addItem({
    id: 'awesome-item',
    tags: [
      { category: 'color', value: 'red', confidence: 1.0 }
    ]
  });
  ```

- 📦 `addItemBatch(items: ItemTags[], batchSize?: number)`: 批次添加項目
  ```typescript
  // 一次添加一堆項目，效能更好！
  system.addItemBatch([item1, item2, item3], 10);
  ```

- 🔍 `query(tags: Tag[], options?: QueryOptions)`: 搜尋相似項目
  ```typescript
  // 找找看有什麼相似的
  const results = system.query([
    { category: 'style', value: 'modern', confidence: 0.9 }
  ], { page: 1, pageSize: 20 });
  ```

- 🎯 `queryFirst(tags: Tag[])`: 找出最相似的一個
  ```typescript
  // 只要最相似的那個就好
  const bestMatch = system.queryFirst([
    { category: 'color', value: 'red', confidence: 1.0 }
  ]);
  ```

- 📊 `getStats()`: 取得系統統計資訊
  ```typescript
  // 來看看系統的狀態如何
  const stats = system.getStats();
  console.log(`總共有 ${stats.totalItems} 個項目`);
  ```

- 🔄 `exportIndex()` & `importIndex()`: 匯出/匯入索引資料
  ```typescript
  // 把資料保存下來，之後可以重新載入
  const data = system.exportIndex();
  // ... 之後 ...
  system.importIndex(data);
  ```

## 🔧 開發指南

想要參與開發？太棒了！這裡有一些常用的指令：

```bash
# 安裝依賴
npm install

# 建置專案
npm run build

# 執行測試（我們超愛測試！）
npm test

# 程式碼風格檢查
npm run lint

# 格式化程式碼（讓程式碼變得更漂亮）
npm run format
```

## 🤔 運作原理

EmbedDB 使用向量化技術來實現相似度搜尋：

1. 🏷 **標籤索引化**：
   - 每個標籤類別-值對都會被映射到一個唯一的向量位置
   - 這讓我們可以將標籤轉換成數值向量

2. 📊 **向量化轉換**：
   - 項目的標籤會被轉換成稀疏向量
   - 信心分數會被用作向量中的權重值

3. 🎯 **相似度計算**：
   - 使用餘弦相似度來計算向量間的相似程度
   - 這讓我們能找出最相似的項目

4. 🚀 **效能優化**：
   - 使用稀疏向量來節省記憶體
   - 實作查詢快取來加速重複查詢
   - 支援批次操作來提升效能

## 🧪 技術細節

在底層，EmbedDB 使用了一些巧妙的技術：

1. **稀疏向量實現**
   - 只儲存非零值
   - 減少記憶體使用量
   - 完美適合標籤式系統，因為大多數值都是零

2. **餘弦相似度**
   - 測量向量之間的角度
   - 範圍：-1 到 1（我們將其正規化為 0 到 1）
   - 非常適合高維度稀疏空間

3. **快取策略**
   - 查詢結果的記憶體快取
   - 資料變更時的快取失效
   - 可配置的分頁功能

4. **型別安全**
   - 嚴格的 TypeScript 型別
   - 執行時型別檢查
   - 全面的錯誤處理

## 📝 授權條款

MIT 授權 - 盡情使用，打造酷東西！

## 🙋‍♂️ 需要幫助？

有任何問題或建議？歡迎：
- 開 Issue
- 發 PR

讓我們一起把 EmbedDB 變得更棒！ 🌟

## 🌟 給個星星！

如果你覺得 EmbedDB 很有用，給我們一顆星星吧！這能幫助其他人發現這個專案，也能激勵我們繼續改進它！