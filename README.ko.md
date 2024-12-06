# 🚀 EmbedDB

[English](README.md) | [繁體中文](README.zh-TW.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Español](README.es.md) | [Français](README.fr.md) | [Deutsch](README.de.md)

안녕하세요! EmbedDB에 오신 것을 환영합니다! TypeScript로 작성된 벡터 기반 태그 시스템입니다. AI 어시스턴트가 검색을 도와주는 것처럼 유사성 검색을 쉽게 할 수 있습니다! 🎯

## ✨ 특징

- 🔍 강력한 벡터 기반 유사성 검색
- ⚖️ 가중치 태그 지원 (중요도에 따른 검색 가능!)
- 🚄 배치 처리 기능 (대량의 데이터를 한 번에 효율적으로 처리!)
- 💾 쿼리 캐시 기능 (반복 검색이 초고속!)
- 📝 완벽한 TypeScript 지원 (타입 안전한 개발 환경!)
- 🎯 효율적인 희소 벡터 구현 (메모리 효율 최적화!)

## 🎮 빠른 시작

먼저, 패키지를 설치합니다:
```bash
npm install embeddb
```

사용 예시를 살펴보겠습니다:

```typescript
import { TagVectorSystem, Tag, IndexTag } from 'embeddb';

// 새로운 시스템 생성
const system = new TagVectorSystem();

// 태그 정의
const tags: IndexTag[] = [
    { category: 'color', value: 'red' },    // 빨간색
    { category: 'color', value: 'blue' },   // 파란색
    { category: 'size', value: 'large' }    // 큰 크기
];

// 태그 인덱스 구축 (중요한 단계입니다!)
system.buildIndex(tags);

// 아이템 추가 (태그와 신뢰도 점수 포함)
const item = {
    id: 'cool-item-1',
    tags: [
        { category: 'color', value: 'red', confidence: 1.0 },   // 확실히 빨간색!
        { category: 'size', value: 'large', confidence: 0.8 }   // 꽤 큰 크기
    ]
};
system.addItem(item);

// 유사 아이템 검색
const queryTags: Tag[] = [
    { category: 'color', value: 'red', confidence: 1.0 }  // 빨간색 찾기
];
const results = system.query(queryTags, { page: 1, pageSize: 10 });
```

## 🛠 API 레퍼런스

### TagVectorSystem 클래스

이것이 주인공입니다! 모든 작업을 처리합니다.

#### 주요 메서드

- 🏗 `buildIndex(tags: IndexTag[])`: 태그 인덱스 구축
  ```typescript
  // 태그 세계 정의!
  system.buildIndex([
    { category: 'color', value: 'red' },
    { category: 'style', value: 'modern' }
  ]);
  ```

- ➕ `addItem(item: ItemTags)`: 단일 아이템 추가
  ```typescript
  // 멋진 아이템 추가
  system.addItem({
    id: 'awesome-item',
    tags: [
      { category: 'color', value: 'red', confidence: 1.0 }
    ]
  });
  ```

- 📦 `addItemBatch(items: ItemTags[], batchSize?: number)`: 배치 아이템 추가
  ```typescript
  // 여러 아이템을 한 번에 추가하여 성능 향상!
  system.addItemBatch([item1, item2, item3], 10);
  ```

- 🔍 `query(tags: Tag[], options?: QueryOptions)`: 유사 아이템 검색
  ```typescript
  // 유사한 것 찾기
  const results = system.query([
    { category: 'style', value: 'modern', confidence: 0.9 }
  ], { page: 1, pageSize: 20 });
  ```

- 🎯 `queryFirst(tags: Tag[])`: 가장 유사한 아이템 검색
  ```typescript
  // 가장 유사한 것만 가져오기
  const bestMatch = system.queryFirst([
    { category: 'color', value: 'red', confidence: 1.0 }
  ]);
  ```

- 📊 `getStats()`: 시스템 통계 조회
  ```typescript
  // 시스템 상태 확인
  const stats = system.getStats();
  console.log(`전체 아이템 수: ${stats.totalItems}`);
  ```

- 🔄 `exportIndex()` & `importIndex()`: 인덱스 내보내기/가져오기
  ```typescript
  // 데이터 저장하고 나중에 재사용
  const data = system.exportIndex();
  // ... 나중에 ...
  system.importIndex(data);
  ```

## 🔧 개발 가이드

개발에 참여하고 싶으신가요? 훌륭합니다! 자주 사용하는 명령어를 소개합니다:

```bash
# 의존성 설치
npm install

# 프로젝트 빌드
npm run build

# 테스트 실행 (테스트 최고!)
npm test

# 코드 스타일 검사
npm run lint

# 코드 포맷팅 (깔끔한 코드로!)
npm run format
```

## 🤔 작동 원리

EmbedDB는 벡터 기술로 유사성 검색을 구현합니다:

1. 🏷 **태그 인덱싱**:
   - 각 카테고리-값 쌍을 고유한 벡터 위치에 매핑
   - 태그를 수치 벡터로 변환 가능하게 함

2. 📊 **벡터 변환**:
   - 아이템의 태그를 희소 벡터로 변환
   - 신뢰도 점수를 벡터의 가중치로 사용

3. 🎯 **유사도 계산**:
   - 코사인 유사도로 벡터 간의 관계 측정
   - 가장 유사한 아이템 발견

4. 🚀 **성능 최적화**:
   - 메모리 효율을 위한 희소 벡터
   - 쿼리 캐시로 속도 향상
   - 배치 처리로 처리량 향상

## 🧪 기술 상세

EmbedDB는 다음 기술을 활용합니다:

1. **희소 벡터 구현**
   - 0이 아닌 값만 저장
   - 메모리 사용량 감소
   - 태그 기반 시스템에 최적

2. **코사인 유사도**
   - 벡터 간의 각도 측정
   - 범위: -1에서 1 (0에서 1로 정규화)
   - 고차원 희소 공간에 이상적

3. **캐시 전략**
   - 쿼리 결과의 메모리 캐시
   - 데이터 변경 시 캐시 무효화
   - 설정 가능한 페이지네이션

4. **타입 안전성**
   - 엄격한 TypeScript 타입
   - 런타임 타입 검사
   - 포괄적인 에러 처리

## 📝 라이선스

MIT 라이선스 - 자유롭게 사용하여 멋진 것을 만드세요!

## 🙋‍♂️ 지원

질문이나 제안이 있으신가요?
- Issue 열기
- PR 보내기

함께 EmbedDB를 더 좋게 만들어요! 🌟

## 🌟 별표를 눌러주세요!

EmbedDB가 유용하다고 생각되시나요? 별표를 눌러주세요! 프로젝트의 발견 가능성이 높아지고 개발 동기부여가 됩니다!