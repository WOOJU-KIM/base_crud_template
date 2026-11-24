# Base CRUD Template (Built with Meta Astryx)

Meta가 오픈소스로 공개한 엔터프라이즈 디자인 시스템 **[Astryx (`@astryxdesign/core`)](https://github.com/meta/astryx)** 및 **React 19 + StyleX + Vite** 기반으로 구축한 **대용량·계층형 기준정보(Master Data) 공용 CRUD 템플릿 모음**입니다.

반도체 분석 기준정보(분석기법, USL/Target/LSL 규격, 수천 개의 적용 대상 아이템)처럼 **N단 트리 구조**와 **수천 건의 말단 요소**가 결합된 복잡한 기준정보를 화면이 답답하거나 복잡(Busy)하지 않게 처리할 수 있도록, 실무에서 가장 많이 쓰이는 **3가지 서로 다른 UI/UX 형식의 공용 템플릿**을 제공합니다.

새로운 기준정보 페이지를 만들 때 레이아웃이나 그리드·드로어·셔틀 로직을 다시 구현할 필요 없이, 원하는 템플릿을 `import`한 뒤 **`config` 설정 객체만 주입**하면 즉시 페이지가 완성됩니다.

---

## 1. 빠른 시작 (Getting Started)

```bash
# 의존성 설치 (React 19 + @astryxdesign/core)
npm install

# 로컬 개발 서버 실행 (http://localhost:5173)
npm run dev

# TypeScript 검증 및 프로덕션 빌드
npm run build

# Astryx CLI로 컴포넌트/문서 조회
npm run astryx -- component --list
npm run astryx -- component Table
```

---

## 2. 제공하는 4가지 공용 CRUD 템플릿 비교

| 구분 | 1. 트리 + Slide-over Drawer 폼형 | 2. 트리 + 스프레드시트(Excel) 대량 I/O형 | 3. 상하 분할 워크벤치 & 좌↔우 셔틀 매핑형 | 4. 단순 DB 테이블 조회 · 관리형 (Tree 없음) |
| :--- | :--- | :--- | :--- | :--- |
| **컴포넌트명** | `<MasterDataCrudTemplate />` | `<SpreadsheetCrudTemplate />` | `<SpecWorkbenchCrudTemplate />` | `<FlatTableCrudTemplate />` |
| **폴더 경로** | `src/templates/master-crud/` | `src/templates/spreadsheet-crud/` | `src/templates/spec-workbench-crud/` | `src/templates/flat-table-crud/` |
| **화면 구성** | **좌측 N단 트리 + 우측 가상화 조회 테이블**<br>(행 클릭 시에만 우측에서 서랍형 Drawer 입력 폼이 열림) | **좌측 N단 트리 + 우측 인라인 편집 스프레드시트**<br>(엑셀처럼 셀 직접 클릭/방향키 편집 & `Ctrl+C/V` 대량 붙여넣기) | **좌측 규격 카탈로그 + 우측 상단 마스터(분석기법/USL/LSL) 폼 & 스펙 게이지 + 우측 하단 좌↔우 아이템 셔틀** | **좌측 트리 없는 전체 화면(Full-width) DB 그리드**<br>(상단 다중 컬럼 드롭다운 필터 + 페이지네이션/가상스크롤 전환 + 우측 Drawer 편집) |
| **추천 사용처** | 계층 분류(N단 트리)가 있고 한 아이템에 입력할 속성이 많아 건별로 안전하게 상세 조회/수정할 때 | 수백~수천 건의 USL/LSL 수치나 기준값을 엑셀에서 복사·붙여넣기 하거나 그리드 위에서 빠르게 연속 수정할 때 | **분석기법과 기본 USL/LSL 규격**을 상단에서 정의하고, 전체 수천 개 아이템 풀에서 **적용 대상 아이템을 좌↔우로 할당(Mapping)**할 때 | **계층(Tree) 없이 단일 RDB 마스터 테이블**(분석기법 코드표, 설비 마스터, 공통코드 등)을 다중 WHERE 조건으로 조회·페이징·관리할 때 |

---

## 3. 디렉터리 구조

```text
src/
├── App.tsx                                 # 상단 TopNav(3종 템플릿 탭 전환 및 다크모드 전환)
├── index.css                               # Astryx 기본 CSS 레이어 및 템플릿 공통 스타일
├── examples/
│   └── mockMasterDomains.tsx               # 3종 템플릿에 주입된 반도체 분석기법/USL·LSL 실제 config 예시
└── templates/
    ├── master-crud/                        # [템플릿 1] N단 트리 + 가상화 테이블 + Slide-over Drawer 폼
    │   ├── MasterDataCrudTemplate.tsx
    │   ├── RecordFormDrawer.tsx
    │   ├── NodeFormDialog.tsx
    │   ├── treeUtils.ts
    │   ├── types.ts
    │   └── index.ts
    ├── spreadsheet-crud/                   # [템플릿 2] N단 트리 + 가상화 인라인 스프레드시트 + 엑셀 I/O
    │   ├── SpreadsheetCrudTemplate.tsx
    │   ├── types.ts
    │   └── index.ts
    └── spec-workbench-crud/                # [템플릿 3] 상하 분할 규격 워크벤치 + 좌↔우 아이템 셔틀 매핑
        ├── SpecWorkbenchCrudTemplate.tsx
        ├── types.ts
        └── index.ts
    └── flat-table-crud/                    # [템플릿 4] 트리 없는 단순 RDB 테이블 다중 조건 조회·페이징·관리
        ├── FlatTableCrudTemplate.tsx
        ├── types.ts
        └── index.ts
```

---

## 4. 템플릿별 `config` 상세 명세 및 사용법

### ① `[템플릿 1]` MasterDataCrudTemplate (`Table + Slide-over Drawer 폼형`)

* **Import 경로:** `import { MasterDataCrudTemplate } from './templates/master-crud';`
* **타입 정의:** `src/templates/master-crud/types.ts` (`MasterDataDomainConfig<TItem, TNodeMeta>`)

#### `config` 속성 명세표

| 속성명 | 타입 | 필수 | 설명 |
| :--- | :--- | :---: | :--- |
| `domainKey` | `string` | O | 도메인 고유 키 (좌측 트리 패널 리사이즈 너비 자동 저장 키로 활용) |
| `title` | `string` | O | 페이지 기본 타이틀 |
| `subtitle` | `string` | X | 페이지 부제목/설명 |
| `treeTitle` | `string` | O | 좌측 N단 트리 패널 상단 헤더 제목 |
| **`treeData`** | `HierarchyNode<TNodeMeta>[]` | O | 좌측 N단 계층형 트리 데이터 (`id`, `parentId`, `name`, `code`, `levelLabel`, `meta`, `children`) |
| **`items`** | `TItem[]` | O | 말단 노드에 귀속된 수천 개의 아이템 배열 (`id`, `nodeId` 필수 포함) |
| **`columns`** | `TableColumn<TItem>[]` | O | 우측 테이블에 노출할 컬럼 배열 (가상화 성능을 위해 핵심 5~8개 컬럼 권장) |
| **`formSchema`** | `CrudFieldSchema<TItem>[]` | O | 행 클릭 또는 `[+ 신규 항목 등록]` 시 우측 Slide-over Drawer에 자동 렌더링할 입력 필드 스키마 (`text`, `number`, `select`, `switch`, `textarea`, **`spreadsheet`**) |
| `drawerWidth` | `number \| string` | X | 우측 Drawer 폭 (기본 480px, 카드 그룹이나 인라인 스프레드시트가 포함되면 자동으로 680px~720px Wide Drawer로 확장) |
| `searchKeys` | `Array<keyof TItem & string>` | O | 상단 검색창에서 실시간 필터링할 데이터 필드 키 배열 |
| `statusFilterConfig` | `{ fieldKey, options }` | X | 상단 세그먼트 버튼(예: 전체 / 양산 / 검토중 / 보류) 빠른 필터 설정 |
| `nodeMetaSchema` | `NodeMetaFieldSchema[]` | X | 좌측 트리 노드 자체를 추가/수정할 때 입력받을 커스텀 메타데이터 필드 정의 |
| `renderNodeSummary` | `(node, count) => ReactNode` | X | 트리 노드 선택 시 테이블 상단에 해당 노드의 요약 정보(예: 기본 분석기법, 기본 USL/LSL 배지)를 렌더링하는 함수 |
| `createDefaultItem` | `(node, count) => Partial<TItem>` | X | 신규 등록 시 선택된 노드의 기본값을 기반으로 초기 레코드를 만들어주는 팩토리 함수 |

#### 새 페이지 적용 코드 예시

```tsx
import { MasterDataCrudTemplate } from './templates/master-crud';
import { pixel, proportional } from '@astryxdesign/core/Table';

export function MyAnalysisMasterPage() {
  return (
    <MasterDataCrudTemplate
      config={{
        domainKey: 'my-analysis-master',
        title: '분석기법 및 규격 기준정보',
        treeTitle: '공정 · 분석기법 트리',
        treeData: myHierarchyTreeData,
        items: myThousandsOfItems,
        searchKeys: ['itemCode', 'itemName', 'analysisMethod'],
        columns: [
          { key: 'itemCode', header: '아이템 코드', width: pixel(170), sortable: true },
          { key: 'itemName', header: '아이템 명칭', width: proportional(1.5), sortable: true },
          { key: 'analysisMethod', header: '분석 기법', width: pixel(140), sortable: true },
          { key: 'lsl', header: 'LSL (하한)', width: pixel(100), align: 'end', sortable: true },
          { key: 'usl', header: 'USL (상한)', width: pixel(100), align: 'end', sortable: true },
        ],
        formSchema: [
          { key: 'itemCode', label: '아이템 코드', type: 'text', required: true, readOnlyOnEdit: true, section: '1. 기본 정보' },
          { key: 'itemName', label: '아이템 명칭', type: 'text', required: true, section: '1. 기본 정보' },
          {
            key: 'analysisMethod',
            label: '분석 기법',
            type: 'select',
            required: true,
            options: [
              { label: 'CD-SEM', value: 'CD-SEM' },
              { label: 'IBO-Overlay', value: 'IBO-Overlay' },
            ],
            section: '1. 기본 정보',
          },
          { key: 'lsl', label: 'LSL (하한 규격)', type: 'number', step: 0.1, units: 'nm', required: true, section: '2. USL / LSL 규격' },
          { key: 'usl', label: 'USL (상한 규격)', type: 'number', step: 0.1, units: 'nm', required: true, section: '2. USL / LSL 규격' },
        ],
      }}
      onItemsChange={(nextItems) => {
        // 백엔드 API 저장 연동
      }}
    />
  );
}
```

#### 알고리즘별 동적 입력 폼 (`cardGroup`, `gridSpan`, `visibleWhen`, `type: 'spreadsheet'`) 설정

1번 템플릿의 `formSchema`는 선택한 알고리즘이나 기법에 따라 **카드 그룹(Card Group)** 또는 **복사·붙여넣기(`Ctrl+C/V`)가 가능한 인라인 미니 스프레드시트(`EmbeddedMiniSpreadsheet`)**로 입력창 디자인이 실시간 전환되는 기능을 지원합니다.

| `CrudFieldSchema` 확장 옵션 | 설명 | 예시 |
| :--- | :--- | :--- |
| **`cardGroup`** | 동일한 `cardGroup` 문자열을 가진 연속된 필드들을 하나의 시각적 `<Card>` 컨테이너로 묶어 표시합니다. | `cardGroup: '카드 B: 전자빔 스캔 & 피크 검출 카드'` |
| **`gridSpan`** | 카드 내부 6열 그리드에서 필드가 차지할 너비 (`'full'`: 1열 전체, `'half'`: 2열 반쪽, `'third'`: 3열 1/3폭) | `gridSpan: 'third'` (LSL / Target / USL 나란히 배치) |
| **`visibleWhen`** | 특정 필드 값(예: 선택된 알고리즘)이 조건과 일치할 때만 해당 필드/카드/스프레드시트를 화면에 노출합니다. | `visibleWhen: { field: 'algorithmType', equals: 'ZONE_SHEET' }` |
| **`type: 'spreadsheet'`** | `spreadsheetConfig: { columns, defaultRows, samplePasteRows }`와 함께 지정하면 Drawer 내부에 **엑셀 복사·붙여넣기(`Ctrl+C/V`) 및 행 추가/삭제가 가능한 미니 스프레드시트**를 렌더링합니다. | 웨이퍼 Zone별 다중 USL/LSL 테이블, 파장(Wavelength)별 굴절률 테이블 등 |

---

### ② `[템플릿 2]` SpreadsheetCrudTemplate (`스프레드시트 인라인 편집 & 엑셀 I/O형`)

* **Import 경로:** `import { SpreadsheetCrudTemplate } from './templates/spreadsheet-crud';`
* **타입 정의:** `src/templates/spreadsheet-crud/types.ts` (`SpreadsheetDomainConfig<TItem, TNodeMeta>`)

#### `config` 속성 명세표

| 속성명 | 타입 | 필수 | 설명 |
| :--- | :--- | :---: | :--- |
| `domainKey`, `title`, `treeTitle` | `string` | O | 페이지 및 좌측 트리 패널 제목 |
| **`treeData`** | `HierarchyNode<TNodeMeta>[]` | O | 좌측 N단 계층형 트리 데이터 |
| **`items`** | `TItem[]` | O | 스프레드시트에 표시할 전체 아이템 배열 |
| **`columns`** | `SpreadsheetColumnSchema<TItem>[]` | O | 인라인 편집 타입(`'text' \| 'number' \| 'select'`), 단위(`unit`), 옵션(`options`), **셀 유효성 검증 함수(`validate`)**가 포함된 컬럼 정의 |
| `searchKeys` | `Array<keyof TItem & string>` | O | 시트 내 실시간 검색 대상 필드 키 배열 |
| **`createEmptyRow`** | `(node, nextIndex) => TItem` | O | `[+ 빈 행 추가]` 또는 엑셀 복사·붙여넣기(Paste)로 신규 행이 추가될 때 기본 객체를 생성하는 함수 |

#### 컬럼별 실시간 유효성 검증(`validate`) 설정 예시

```tsx
{
  key: 'lsl',
  header: 'LSL (하한)',
  type: 'number',
  width: 110,
  align: 'end',
  step: 0.1,
  required: true,
  // 셀 직접 수정 또는 엑셀 붙여넣기 시 즉시 실행되어 오류 셀을 빨간색으로 하이라이트합니다.
  validate: (val, row) => {
    if (Number(val) > Number(row.usl)) {
      return '하한(LSL)이 상한(USL)보다 클 수 없습니다.';
    }
    return null;
  },
}
```

---

### ③ `[템플릿 3]` SpecWorkbenchCrudTemplate (`상하 분할 워크벤치 & 좌↔우 아이템 셔틀 매핑형`)

* **Import 경로:** `import { SpecWorkbenchCrudTemplate } from './templates/spec-workbench-crud';`
* **타입 정의:** `src/templates/spec-workbench-crud/types.ts` (`SpecWorkbenchDomainConfig`)

#### `config` 속성 명세표

| 속성명 | 타입 | 필수 | 설명 |
| :--- | :--- | :---: | :--- |
| `domainKey`, `title`, `subtitle` | `string` | O | 페이지 식별자 및 제목 |
| **`categories`** | `WorkbenchCategory[]` | O | 좌측 상단 공정군 세그먼트 탭 목록 (예: `LITHO`, `ETCH`, `THINFILM`, `CMP`) |
| **`rules`** | `WorkbenchSpecRule[]` | O | 좌측 카탈로그 및 우측 상단 마스터 폼에서 편집할 **분석기법 및 USL/Target/LSL 규격 마스터 리스트** |
| **`allPoolItems`** | `WorkbenchPoolItem[]` | O | 우측 하단 셔틀에서 좌↔우로 할당/해제할 **수천 개의 전체 아이템 마스터 풀** (`overrideLsl`, `overrideUsl` 예외 규격 속성 지원) |
| **`initialRuleItemMap`** | `Record<string, string[]>` | O | 각 규격 ID(`ruleId`)별로 매핑된 아이템 ID 배열 (`{ 'rule-01': ['ITEM-0001', 'ITEM-0002', ...] }`) |
| `methodOptions` | `CrudFieldOption[]` | O | 분석기법 선택 드롭다운 옵션 목록 (`CD-SEM`, `IBO-Overlay`, `Ellipsometry` 등) |
| `unitOptions` | `CrudFieldOption[]` | O | 측정 단위 선택 드롭다운 옵션 목록 (`nm`, `Å`, `µm`, `%` 등) |
| `productFamilyOptions` | `CrudFieldOption[]` | O | 하단 미할당 아이템 풀의 제품군 빠른 필터 옵션 (`DDR5`, `HBM3E` 등) |

---

### ④ `[템플릿 4]` FlatTableCrudTemplate (`단순 DB 테이블 조회 · 관리형 - Tree 없음`)

* **Import 경로:** `import { FlatTableCrudTemplate } from './templates/flat-table-crud';`
* **타입 정의:** `src/templates/flat-table-crud/types.ts` (`FlatTableDomainConfig<TItem>`)

#### `config` 속성 명세표

| 속성명 | 타입 | 필수 | 설명 |
| :--- | :--- | :---: | :--- |
| `domainKey`, `title`, `subtitle` | `string` | O | 페이지 식별자 및 제목 |
| `dbTableName` | `string` | X | 상단 헤더에 배지로 표시할 실제 DB 물리 테이블명 (예: `'TB_ANALYSIS_METHOD_MST'`) |
| **`items`** | `TItem[]` | O | DB 테이블 레코드 목록 (`id` 기본키 필수) |
| **`columns`** | `TableColumn<TItem>[]` | O | 전체 화면 테이블에 표시할 컬럼 정의 (`sortable: true` 정렬 지원) |
| **`formSchema`** | `CrudFieldSchema[]` | O | 행 클릭 또는 `[+ 신규 레코드 등록]` 시 우측 Slide-over Drawer에 자동 생성할 입력 폼 스키마 |
| `searchKeys` | `Array<keyof TItem & string>` | O | 키워드 검색창에서 검색할 대상 컬럼 키 배열 |
| **`selectFilters`** | `FlatTableSelectFilter<TItem>[]` | X | 상단 검색 바에 나란히 배치할 **다중 컬럼 드롭다운 필터** 목록 (예: 공정 구분, 장비 제조사, 담당 부서 등) |
| `statusFilterConfig` | `{ fieldKey, options }` | X | 상단 상태 세그먼트 빠른 필터 (예: 전체 / 사용중 / 교정중 / 미사용) |
| `statMetrics` | `FlatTableStatMetric<TItem>[]` | X | 우측 상단에 실시간 집계 배지로 표시할 KPI 요약 지표 목록 |
| `createDefaultItem` | `(count) => Partial<TItem>` | X | 신규 레코드 생성 시 초기 기본값을 반환하는 함수 |

---

## 5. 주의사항 (Astryx Table Virtualization 규칙)

1번 템플릿(`MasterDataCrudTemplate`)에서 사용한 Astryx의 `useTableRowsVirtualization`은 수천~수만 건의 행을 고정 높이(`rowHeight: 40`)로 고속 윈도윙(Windowing)합니다.
* Astryx `Table`의 고정 높이 가상화가 활성화되려면 **`columns` 정의에 커스텀 `renderCell` 함수를 넣지 않고 순수 데이터 컬럼으로 유지**해야 합니다. (커스텀 `renderCell`이 포함되면 Astryx가 높이 안전을 위해 전체 행 렌더링 모드로 자동 전환합니다.)
* 행 클릭 시 상세 Drawer가 열리는 동작은 `MasterDataCrudTemplate` 내부의 `rowClickDrawerPlugin`(`rowModel: 'flat'`)에 이미 구현되어 있으므로 별도의 액션 버튼 컬럼을 추가할 필요가 없습니다.
