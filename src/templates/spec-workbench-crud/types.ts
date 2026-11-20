import type { CrudFieldOption } from '../master-crud/types';

/**
 * [템플릿 3: Split Spec Workbench & Item Shuttle Mapping 형식]
 * - 좌측: N단 컬럼/카탈로그 탐색기 (Category -> Rule/Spec 목록)
 * - 우측 상단: 선택한 기준정보(예: 분석기법 & USL/Target/LSL 규격) 마스터 폼 + 실시간 스펙 게이지 프리뷰
 * - 우측 하단: Dual-List Shuttle (좌: 전체 아이템 풀 수천 개 <-> 우: 이 규격에 적용된 아이템 수천 개 매핑/예외 스펙 오버라이드)
 */

export interface WorkbenchSpecRule extends Record<string, unknown> {
  /** 규격/기준정보 고유 ID */
  id: string;
  /** 소속 상위 카테고리(공정/분류) ID */
  categoryId: string;
  /** 규격 코드 */
  ruleCode: string;
  /** 규격 명칭 */
  ruleName: string;
  /** 적용 분석 기법 */
  analysisMethod: string;
  /** 하한 규격 (LSL) */
  lsl: number;
  /** 목표 중심값 (Target) */
  target: number;
  /** 상한 규격 (USL) */
  usl: number;
  /** 경고 하한 (LCL / Warning Low - 선택) */
  lcl?: number;
  /** 경고 상한 (UCL / Warning High - 선택) */
  ucl?: number;
  /** 측정 단위 */
  unit: string;
  /** 운영 상태 */
  status: 'ACTIVE' | 'DRAFT' | 'DEPRECATED';
  /** 설명 및 비고 */
  description?: string;
}

export interface WorkbenchCategory {
  id: string;
  name: string;
  code: string;
  groupName: string;
}

export interface WorkbenchPoolItem {
  id: string;
  itemCode: string;
  itemName: string;
  productFamily: string;
  waferType: string;
  /** 아이템별 예외(Override) LSL (지정하지 않으면 상단 마스터 규격의 LSL을 따름) */
  overrideLsl?: number | null;
  /** 아이템별 예외(Override) USL (지정하지 않으면 상단 마스터 규격의 USL을 따름) */
  overrideUsl?: number | null;
}

export interface SpecWorkbenchDomainConfig {
  domainKey: string;
  title: string;
  subtitle?: string;
  /** 좌측 분류 카테고리 목록 */
  categories: WorkbenchCategory[];
  /** 분석기법/규격 마스터 목록 */
  rules: WorkbenchSpecRule[];
  /** 수천 개의 전체 아이템 마스터 풀 */
  allPoolItems: WorkbenchPoolItem[];
  /** 규격 ID -> 매핑된 아이템 ID 배열 (초기 매핑 상태) */
  initialRuleItemMap: Record<string, string[]>;
  /** 분석 기법 선택 옵션 */
  methodOptions: CrudFieldOption[];
  /** 단위 선택 옵션 */
  unitOptions: CrudFieldOption[];
  /** 제품군 필터 옵션 */
  productFamilyOptions: CrudFieldOption[];
}
