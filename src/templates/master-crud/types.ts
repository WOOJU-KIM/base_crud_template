import type { ReactNode } from 'react';
import type { TableColumn } from '@astryxdesign/core/Table';

/**
 * N단 계층형 트리 노드 데이터 구조 (공용)
 * depth에 제한 없이 children 배열을 통해 무한 계층(N-Level)을 구성할 수 있습니다.
 */
export interface HierarchyNode<TMeta = Record<string, unknown>> {
  /** 노드 고유 식별자 */
  id: string;
  /** 상위 노드 ID (최상위 루트 노드는 null) */
  parentId: string | null;
  /** 화면에 표시할 노드 명칭 */
  name: string;
  /** 노드 식별 코드 (예: PROC-ETCH, MET-01) */
  code?: string;
  /** 레벨 구분 라벨 (예: '대분류', '공정', '분석기법', '파라미터') */
  levelLabel?: string;
  /** 노드 부가 설명 */
  description?: string;
  /** 도메인별 커스텀 메타데이터 (예: 기본 USL/LSL, 단위, 담당부서 등) */
  meta?: TMeta;
  /** 초기 펼침 여부 */
  isExpanded?: boolean;
  /** 하위 자식 노드 목록 (N단) */
  children?: HierarchyNode<TMeta>[];
}

/**
 * 말단(또는 선택된) 노드에 귀속되는 기준정보 아이템 기본 인터페이스
 * 수천 건의 데이터를 가상화(Virtualization) 테이블에서 처리하기 위해 id와 nodeId를 필수로 가집니다.
 */
export interface BaseRecordItem extends Record<string, unknown> {
  /** 레코드 고유 ID */
  id: string;
  /** 소속된 트리 노드 ID */
  nodeId: string;
}

/**
 * Slide-over Drawer 및 신규/수정 폼을 자동 생성하기 위한 필드 스키마 정의
 * 새로운 기준정보 페이지를 만들 때 이 배열만 정의하면 입력/수정 Drawer가 자동으로 구성됩니다.
 */
export type CrudFieldType =
  | 'text'
  | 'number'
  | 'select'
  | 'switch'
  | 'textarea';

export interface CrudFieldOption {
  label: string;
  value: string;
}

export interface CrudFieldSchema<TItem extends BaseRecordItem = BaseRecordItem> {
  /** 데이터 객체의 속성 키 */
  key: keyof TItem & string;
  /** 필드 라벨 */
  label: string;
  /** 입력 컨트롤 타입 */
  type: CrudFieldType;
  /** 필수 입력 여부 */
  required?: boolean;
  /** 플레이스홀더 */
  placeholder?: string;
  /** 필드 하단 도움말 설명 */
  description?: string;
  /** 숫자 필드일 때 단위 표시 (예: 'nm', '%', 'ea') */
  units?: string;
  /** 숫자 필드일 때 증감 단위 (예: 0.01, 1) */
  step?: number;
  /** 숫자 필드 최소값 */
  min?: number;
  /** 숫자 필드 최대값 */
  max?: number;
  /** select 타입일 때 선택지 목록 */
  options?: CrudFieldOption[];
  /** 신규 생성 시 기본값 */
  defaultValue?: unknown;
  /** 폼 그룹 섹션 구분 타이틀 (예: '기본 식별 정보', '규격 및 임계치 설정') */
  section?: string;
  /** 수정 시 읽기 전용 여부 (예: Primary Code) */
  readOnlyOnEdit?: boolean;
}

/**
 * 트리 노드 자체의 메타데이터를 추가/수정할 때 사용할 필드 스키마
 */
export interface NodeMetaFieldSchema {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select';
  placeholder?: string;
  units?: string;
  step?: number;
  options?: CrudFieldOption[];
}

/**
 * 공용 MasterDataCrudTemplate 컴포넌트 Props 정의
 */
export interface MasterDataDomainConfig<
  TItem extends BaseRecordItem = BaseRecordItem,
  TNodeMeta = Record<string, unknown>
> {
  /** 기준정보 도메인 고유 키 */
  domainKey: string;
  /** 기준정보 페이지 타이틀 (예: '분석 기준정보 관리', '공통 설비/파라미터 기준정보') */
  title: string;
  /** 기준정보 페이지 부제목/설명 */
  subtitle?: string;
  /** 좌측 트리 영역 헤더 타이틀 */
  treeTitle: string;
  /** N단 트리 초기 데이터 */
  treeData: HierarchyNode<TNodeMeta>[];
  /** 말단 요소(수천 개 가능) 리스트 데이터 */
  items: TItem[];
  /** 우측 테이블에 표시할 핵심 컬럼 정의 (화면이 복잡하지 않게 4~6개 권장) */
  columns: TableColumn<TItem>[];
  /** 우측 Slide-over Drawer에서 편집할 전체 필드 스키마 */
  formSchema: CrudFieldSchema<TItem>[];
  /** 트리 노드 자체에 추가할 커스텀 메타 필드 스키마 (선택) */
  nodeMetaSchema?: NodeMetaFieldSchema[];
  /** 선택된 트리 노드 상단에 요약 배너/메타 카드를 커스텀 렌더링할 함수 (선택) */
  renderNodeSummary?: (node: HierarchyNode<TNodeMeta>, itemCount: number) => ReactNode;
  /** 빠른 상태 필터링에 사용할 필드 키 및 옵션 (선택) */
  statusFilterConfig?: {
    fieldKey: keyof TItem & string;
    options: Array<{ label: string; value: string }>;
  };
  /** 검색창에서 필터링할 대상 필드 키 목록 */
  searchKeys: Array<keyof TItem & string>;
  /** 새 아이템 생성 시 ID/기본값을 생성하는 팩토리 (선택) */
  createDefaultItem?: (selectedNode: HierarchyNode<TNodeMeta>, currentCount: number) => Partial<TItem>;
}
