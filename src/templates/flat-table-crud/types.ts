import type { TableColumn } from '@astryxdesign/core/Table';
import type { CrudFieldOption, CrudFieldSchema } from '../master-crud/types';

/**
 * [템플릿 4: 단일 DB 테이블 조회 · 관리형 (Flat DB Table CRUD Template)]
 * 트리(Hierarchy) 없이 순수하게 단일 DB 테이블(마스터 코드, 설비 목록, 시험법 마스터, 사용자/권한 등)을
 * 다중 조건으로 검색·필터링·정렬·페이징(또는 가상화 스크롤)하고 생성/수정/일괄변경/CSV 내보내기를 수행하는 템플릿입니다.
 */
export interface FlatRecordItem extends Record<string, unknown> {
  /** DB 기본키 (Primary Key) */
  id: string;
}

/**
 * 상단 다중 조건 검색 바(Filter Bar)에 배치할 드롭다운 필터 정의
 */
export interface FlatTableSelectFilter<TItem extends FlatRecordItem = FlatRecordItem> {
  /** 필터링할 컬럼 키 */
  fieldKey: keyof TItem & string;
  /** 필터 라벨 (예: '공정 구분', '장비 제조사') */
  label: string;
  /** 선택지 목록 ('ALL'은 템플릿이 자동 추가) */
  options: CrudFieldOption[];
}

/**
 * 상단 KPI 요약 카드 정의 (선택)
 */
export interface FlatTableStatMetric<TItem extends FlatRecordItem = FlatRecordItem> {
  label: string;
  badgeVariant?: 'neutral' | 'blue' | 'teal' | 'purple' | 'orange' | 'green' | 'red';
  computeValue: (allItems: TItem[], filteredItems: TItem[]) => string;
}

/**
 * 공용 FlatTableCrudTemplate 설정(Config) 인터페이스
 */
export interface FlatTableDomainConfig<TItem extends FlatRecordItem = FlatRecordItem> {
  /** 도메인 고유 키 */
  domainKey: string;
  /** DB 테이블 물리명 또는 논리명 배지 표시 (예: 'TB_ANALYSIS_METHOD_MST') */
  dbTableName?: string;
  /** 페이지 타이틀 */
  title: string;
  /** 페이지 설명 */
  subtitle?: string;
  /** 초기 DB 레코드 목록 */
  items: TItem[];
  /** 테이블 컬럼 정의 */
  columns: TableColumn<TItem>[];
  /** 행 클릭 또는 [+ 신규 레코드 등록] 시 우측 Slide-over Drawer에 렌더링할 입력 폼 스키마 */
  formSchema: CrudFieldSchema<any>[];
  /** 키워드 검색 대상 컬럼 키 목록 */
  searchKeys: Array<keyof TItem & string>;
  /** 상단 다중 드롭다운 필터 목록 (예: 분류, 부서, 등급 등) */
  selectFilters?: FlatTableSelectFilter<TItem>[];
  /** 빠른 상태 세그먼트 필터 설정 (예: 전체 / 사용중 / 점검중 / 폐기) */
  statusFilterConfig?: {
    fieldKey: keyof TItem & string;
    options: CrudFieldOption[];
  };
  /** 상단 요약 지표(KPI) 카드 정의 목록 (선택) */
  statMetrics?: FlatTableStatMetric<TItem>[];
  /** 신규 레코드 생성 시 기본값 팩토리 */
  createDefaultItem?: (currentCount: number) => Partial<TItem>;
}
