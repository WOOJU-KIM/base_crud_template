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

## 2. 제공하는 3가지 공용 CRUD 템플릿 비교

| 구분 | 1. Table + Slide-over Drawer 폼형 | 2. 스프레드시트(Excel) 대량 I/O형 | 3. 상하 분할 워크벤치 & 좌↔우 셔틀 매핑형 |
| :--- | :--- | :--- | :--- |
| **컴포넌트명** | `<MasterDataCrudTemplate />` | `<SpreadsheetCrudTemplate />` | `<SpecWorkbenchCrudTemplate />` |
| **폴더 경로** | `src/templates/master-crud/` | `src/templates/spreadsheet-crud/` | `src/templates/spec-workbench-crud/` |
| **화면 구성** | **좌측 N단 트리 + 우측 가상화 조회 테이블**<br>(행 클릭 시에만 우측에서 서랍형 Drawer 입력 폼이 열림) | **좌측 N단 트리 + 우측 인라인 편집 스프레드시트**<br>(엑셀처럼 셀 직접 클릭/방향키 편집 & `Ctrl+C/V` 대량 붙여넣기) | **좌측 규격 카탈로그 + 우측 상단 마스터(분석기법/USL/LSL) 폼 & 스펙 게이지 + 우측 하단 좌↔우 아이템 셔틀** |
| **추천 사용처** | 한 아이템에 입력할 속성이 많고(10개 이상), 평소에는 깔끔한 리스트로 조회하다가 건별로 안전하게 상세 조회/수정할 때 | 수백~수천 건의 USL/LSL 수치나 기준값을 엑셀에서 복사·붙여넣기 하거나 그리드 위에서 빠르게 연속 수정할 때 | **분석기법과 기본 USL/LSL 규격**을 상단에서 정의하고, 전체 수천 개 아이템 풀에서 **적용 대상 아이템을 좌↔우로 할당(Mapping)**할 때 |

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
| **`formSchema`** | `CrudFieldSchema<TItem>[]` | O | 행 클릭 또는 `[+ 신규 항목 등록]` 시 우측 Slide-over Drawer에 자동 렌더링할 입력 필드 스키마 (`text`, `number`, `select`, `switch`, `textarea`) |
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

## 5. 주의사항 (Astryx Table Virtualization 규칙)

1번 템플릿(`MasterDataCrudTemplate`)에서 사용한 Astryx의 `useTableRowsVirtualization`은 수천~수만 건의 행을 고정 높이(`rowHeight: 40`)로 고속 윈도윙(Windowing)합니다.
* Astryx `Table`의 고정 높이 가상화가 활성화되려면 **`columns` 정의에 커스텀 `renderCell` 함수를 넣지 않고 순수 데이터 컬럼으로 유지**해야 합니다. (커스텀 `renderCell`이 포함되면 Astryx가 높이 안전을 위해 전체 행 렌더링 모드로 자동 전환합니다.)
* 행 클릭 시 상세 Drawer가 열리는 동작은 `MasterDataCrudTemplate` 내부의 `rowClickDrawerPlugin`(`rowModel: 'flat'`)에 이미 구현되어 있으므로 별도의 액션 버튼 컬럼을 추가할 필요가 없습니다.
