import type { ReactNode } from 'react';
import type { BaseRecordItem, HierarchyNode, NodeMetaFieldSchema } from '../master-crud/types';

export type SpreadsheetCellType = 'text' | 'number' | 'select';

export interface SpreadsheetColumnOption {
  label: string;
  value: string;
}

/**
 * 스프레드시트 템플릿용 컬럼 스키마 정의
 * 인라인 셀 편집, 클립보드(TSV/CSV) 복사·붙여넣기, 유효성 검증을 지원합니다.
 */
export interface SpreadsheetColumnSchema<TItem extends BaseRecordItem = BaseRecordItem> {
  /** 데이터 필드 키 */
  key: keyof TItem & string;
  /** 컬럼 헤더 표시명 */
  header: string;
  /** 셀 입력 타입 */
  type: SpreadsheetCellType;
  /** 컬럼 너비 (px) */
  width?: number;
  /** 텍스트 정렬 */
  align?: 'start' | 'center' | 'end';
  /** 읽기 전용 여부 (예: 자동 생성 키 또는 수정 불가 컬럼) */
  readOnly?: boolean;
  /** 필수 입력 여부 */
  required?: boolean;
  /** select 타입일 때 선택지 */
  options?: SpreadsheetColumnOption[];
  /** 숫자 타입일 때 증감 단위 (예: 0.1) */
  step?: number;
  /** 숫자 단위 표시 (예: 'nm', 'Å') */
  unit?: string;
  /** 셀 단위 커스텀 유효성 검증 함수 (오류 메시지 반환 시 빨간색 테두리 및 툴팁 표시) */
  validate?: (value: unknown, row: TItem) => string | null;
}

/**
 * 공용 SpreadsheetCrudTemplate 도메인 설정 인터페이스
 */
export interface SpreadsheetDomainConfig<
  TItem extends BaseRecordItem = BaseRecordItem,
  TNodeMeta = Record<string, unknown>
> {
  /** 도메인 고유 키 */
  domainKey: string;
  /** 페이지 타이틀 */
  title: string;
  /** 부제목 / 설명 */
  subtitle?: string;
  /** 좌측 트리 타이틀 */
  treeTitle: string;
  /** N단 트리 데이터 */
  treeData: HierarchyNode<TNodeMeta>[];
  /** 초기 아이템 리스트 (수천 건 가능) */
  items: TItem[];
  /** 스프레드시트 컬럼 정의 목록 */
  columns: SpreadsheetColumnSchema<TItem>[];
  /** 검색 필터 대상 필드 키 */
  searchKeys: Array<keyof TItem & string>;
  /** 트리 노드 메타 스키마 (선택) */
  nodeMetaSchema?: NodeMetaFieldSchema[];
  /** 선택된 노드 상단 요약 배너 렌더러 (선택) */
  renderNodeSummary?: (node: HierarchyNode<TNodeMeta>, itemCount: number) => ReactNode;
  /** 새 행 추가 시 기본 레코드 생성 팩토리 */
  createEmptyRow: (selectedNode: HierarchyNode<TNodeMeta>, nextIndex: number) => TItem;
}
