# 🚀 EmbedDB

[English](README.md) | [繁體中文](README.zh-TW.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Español](README.es.md) | [Français](README.fr.md) | [Deutsch](README.de.md)

こんにちは！EmbedDBへようこそ！TypeScriptで書かれたベクトルベースのタグシステムです。AIアシスタントが検索をお手伝いするように、類似性検索が簡単にできます！🎯

## ✨ 特徴

- 🔍 パワフルなベクトルベース類似性検索
- ⚖️ 重み付きタグのサポート（重要度に応じた検索が可能！）
- 📈 カテゴリーの重み付け（カテゴリーの重要度を細かく制御！）
- 🚄 バッチ処理機能（大量のデータを一度に効率的に処理！）
- 💾 クエリキャッシュ機能（繰り返しの検索が超高速！）
- 📝 完全なTypeScriptサポート（型安全な開発環境！）
- 🎯 効率的なスパースベクトル実装（メモリ効率の最適化！）
- 🔄 インポート/エクスポート機能（インデックスの保存と復元！）
- 📊 フィルター優先のページネーションサポート（フィルター適用後の結果を分割取得！）
- 🔬 高度なフィルタリングシステム（フィルター適用後に類似度でソート！）

## 🎮 クイックスタート

まず、パッケージをインストールします：
```bash
npm install embeddb
```

使用例を見てみましょう：

```typescript
import { TagVectorSystem, Tag, IndexTag } from 'embeddb';

// 新しいシステムを作成
const system = new TagVectorSystem();

// タグの定義
const tags: IndexTag[] = [
    { category: 'color', value: 'red' },    // 赤
    { category: 'color', value: 'blue' },   // 青
    { category: 'size', value: 'large' }    // 大きい
];

// タグインデックスの構築（重要なステップです！）
system.buildIndex(tags);

// アイテムの追加（タグと信頼度スコア付き）
const item = {
    id: 'cool-item-1',
    tags: [
        { category: 'color', value: 'red', confidence: 1.0 },   // 赤色確実！
        { category: 'size', value: 'large', confidence: 0.8 }   // かなり大きい
    ]
};
system.addItem(item);

// カテゴリーの重み付けを設定してカラーマッチを優先
system.setCategoryWeight('color', 2.0); // カラーマッチの重要度を2倍に

// 類似アイテムを検索してみましょう
const query = {
    tags: [
        { category: 'color', value: 'red', confidence: 0.9 }
    ]
};

// ページネーション付きクエリ
const results = system.query(query.tags, { page: 1, size: 10 }); // 最初の10件を取得

// インデックスをエクスポート
const exportedData = system.exportIndex();

// 別のインスタンスでインポート
const newSystem = new TagVectorSystem();
newSystem.importIndex(exportedData);

## 🛠 API リファレンス

### TagVectorSystem クラス

これが主役です！すべての操作を処理します。

#### 主要メソッド

- 🏗 `buildIndex(tags: IndexTag[])`: タグインデックスの構築
  ```typescript
  // タグワールドの定義！
  system.buildIndex([
    { category: 'color', value: 'red' },
    { category: 'style', value: 'modern' }
  ]);
  ```

- ➕ `addItem(item: ItemTags)`: 単一アイテムの追加
  ```typescript
  // クールなアイテムを追加
  system.addItem({
    id: 'awesome-item',
    tags: [
      { category: 'color', value: 'red', confidence: 1.0 }
    ]
  });
  ```

- 📦 `addItemBatch(items: ItemTags[], batchSize?: number)`: バッチアイテム追加
  ```typescript
  // 複数アイテムを一度に追加でパフォーマンス向上！
  system.addItemBatch([item1, item2, item3], 10);
  ```

- 🔍 `query(tags: Tag[], options?: QueryOptions)`: 類似アイテムの検索
  ```typescript
  // 類似アイテムを探す
  const results = system.query([
    { category: 'style', value: 'modern', confidence: 0.9 }
  ], { page: 1, pageSize: 20 });
  ```

- 🎯 `queryFirst(tags: Tag[])`: 最も類似したアイテムの検索
  ```typescript
  // 最も類似したものだけ取得
  const bestMatch = system.queryFirst([
    { category: 'color', value: 'red', confidence: 1.0 }
  ]);
  ```

- 📊 `getStats()`: システム統計の取得
  ```typescript
  // システムの状態を確認
  const stats = system.getStats();
  console.log(`総アイテム数: ${stats.totalItems}`);
  ```

- 🔄 `exportIndex()` & `importIndex()`: インデックスのエクスポート/インポート
  ```typescript
  // データを保存して後で再利用
  const data = system.exportIndex();
  // ... 後で ...
  system.importIndex(data);
  ```

- 📈 `setCategoryWeight(category: string, weight: number)`: カテゴリーの重み付け
  ```typescript
  // カラーマッチの重要度を2倍に
  system.setCategoryWeight('color', 2.0);
  ```

## 🔧 開発ガイド

開発に参加したいですか？素晴らしい！よく使うコマンドをご紹介します：

```bash
# 依存関係のインストール
npm install

# プロジェクトのビルド
npm run build

# テストの実行（テスト大好き！）
npm test

# コードスタイルチェック
npm run lint

# コードフォーマット（きれいなコードに！）
npm run format
```

## 🤔 仕組み

EmbedDBはベクトル技術で類似性検索を実現します：

1. 🏷 **タグインデックス化**：
   - 各カテゴリー-値ペアを一意のベクトル位置にマッピング
   - タグを数値ベクトルに変換可能に

2. 📊 **ベクトル変換**：
   - アイテムのタグをスパースベクトルに変換
   - 信頼度スコアをベクトルの重みとして使用

3. 🎯 **類似度計算**：
   - コサイン類似度でベクトル間の関係を測定
   - フィルタリング後の結果に対してのみ適用
   - 最も類似したアイテムを発見

4. 🚀 **パフォーマンス最適化**：
   - メモリ効率のためのスパースベクトル
   - クエリキャッシュで高速化
   - バッチ処理でスループット向上

## 🧪 技術詳細

EmbedDBは以下の技術を活用しています：

1. **スパースベクトル実装**
   - 非ゼロ値のみを保存
   - メモリ使用量を削減
   - タグベースシステムに最適

2. **コサイン類似度**
   - ベクトル間の角度を測定
   - 範囲：-1から1（0から1に正規化）
   - フィルタリングではなく、ソートにのみ使用

## 📝 ライセンス

MITライセンス - 自由に使って素晴らしいものを作ってください！

## 🙋‍♂️ サポート

質問や提案がありますか？
- Issueを開く
- PRを送る

一緒にEmbedDBをより良いものにしましょう！ 🌟

## 🌟 スターをください！

EmbedDBが役立つと思ったら、スターをください！プロジェクトの発見可能性が高まり、開発のモチベーションになります！
