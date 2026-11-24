import { Badge } from '@astryxdesign/core/Badge';
import { Card } from '@astryxdesign/core/Card';
import { HStack } from '@astryxdesign/core/HStack';
import { Text } from '@astryxdesign/core/Text';
import { StatusDot } from '@astryxdesign/core/StatusDot';
import { pixel, proportional } from '@astryxdesign/core/Table';
import type {
  BaseRecordItem,
  HierarchyNode,
  MasterDataDomainConfig,
} from '../templates/master-crud';
import type { SpreadsheetDomainConfig } from '../templates/spreadsheet-crud';
import type {
  SpecWorkbenchDomainConfig,
  WorkbenchPoolItem,
} from '../templates/spec-workbench-crud';
import type {
  FlatRecordItem,
  FlatTableDomainConfig,
} from '../templates/flat-table-crud';

/**
 * [예시 1] 다단 계층형 분석/규격 기준정보 (USL / LSL / Target 및 수천 개 적용 대상 아이템)
 * - N단 트리: 공정군(1단) -> 세부 공정(2단) -> 분석 기법(3단) -> 측정 파라미터(4단)
 * - 말단 요소: 해당 분석 기법과 USL/LSL이 적용되는 수천 개의 아이템 리스트
 */
export interface SpecItemRecord extends BaseRecordItem {
  id: string;
  nodeId: string;
  itemCode: string;
  itemName: string;
  analysisMethod: string;
  /** 알고리즘 유형에 따라 입력 폼이 카드 그룹 / 미니 스프레드시트 / 복합 모드로 동적 전환 */
  algorithmType?: 'PEAK_CARD' | 'ZONE_SHEET' | 'SPECTRUM_HYBRID';
  targetValue: number;
  lsl: number;
  usl: number;
  unit: string;
  samplingRule: string;
  status: 'ACTIVE' | 'REVIEW' | 'HOLD';
  remarks?: string;
  // 알고리즘 1 (PEAK_CARD: 카드 그룹형) 전용 파라미터
  edgeThresholdPct?: number;
  smoothingFilter?: string;
  scanFrames?: number;
  autoBaselineCorrection?: boolean;
  // 알고리즘 2 (ZONE_SHEET: 복사·붙여넣기 스프레드시트형) 전용 다중 Zone 테이블
  zoneSpecTable?: Array<Record<string, unknown>>;
  // 알고리즘 3 (SPECTRUM_HYBRID: 카드 + 파장 스프레드시트 복합형) 전용 파라미터
  fittingModel?: string;
  minR2Score?: number;
  wavelengthTable?: Array<Record<string, unknown>>;
}

export interface SpecNodeMeta {
  defaultMethod?: string;
  defaultLsl?: number;
  defaultTarget?: number;
  defaultUsl?: number;
  unit?: string;
}

const specTreeData: HierarchyNode<SpecNodeMeta>[] = [
  {
    id: 'root-feol',
    parentId: null,
    name: 'FEOL (전공정 기준정보)',
    code: 'FEOL',
    levelLabel: '1단: 공정군',
    isExpanded: true,
    children: [
      {
        id: 'proc-litho',
        parentId: 'root-feol',
        name: 'Photo / Lithography',
        code: 'LITHO',
        levelLabel: '2단: 공정',
        isExpanded: true,
        children: [
          {
            id: 'method-cdsem',
            parentId: 'proc-litho',
            name: 'CD-SEM (임계치수 주사전자현미경)',
            code: 'M-CDSEM',
            levelLabel: '3단: 분석기법',
            isExpanded: true,
            meta: {
              defaultMethod: 'CD-SEM',
              defaultLsl: 12.5,
              defaultTarget: 14.0,
              defaultUsl: 15.5,
              unit: 'nm',
            },
            children: [
              {
                id: 'param-gate-cd',
                parentId: 'method-cdsem',
                name: 'Gate Line Width CD',
                code: 'P-GATE-CD',
                levelLabel: '4단: 측정항목',
                description: 'Gate 패턴 형성 후 Bottom CD 측정 기준정보',
                meta: {
                  defaultMethod: 'CD-SEM',
                  defaultLsl: 13.2,
                  defaultTarget: 14.0,
                  defaultUsl: 14.8,
                  unit: 'nm',
                },
              },
              {
                id: 'param-fin-pitch',
                parentId: 'method-cdsem',
                name: 'Fin Pitch Uniformity',
                code: 'P-FIN-PITCH',
                levelLabel: '4단: 측정항목',
                description: 'FinFET 구조 Pitch 간격 균일도 분석',
                meta: {
                  defaultMethod: 'CD-SEM',
                  defaultLsl: 22.0,
                  defaultTarget: 24.0,
                  defaultUsl: 26.0,
                  unit: 'nm',
                },
              },
            ],
          },
          {
            id: 'method-overlay',
            parentId: 'proc-litho',
            name: 'Optical Overlay (정렬도 분석)',
            code: 'M-OVL',
            levelLabel: '3단: 분석기법',
            isExpanded: true,
            meta: {
              defaultMethod: 'IBO-Overlay',
              defaultLsl: -2.5,
              defaultTarget: 0.0,
              defaultUsl: 2.5,
              unit: 'nm',
            },
            children: [
              {
                id: 'param-ovl-xy',
                parentId: 'method-overlay',
                name: 'X/Y Shift Misalignment',
                code: 'P-OVL-XY',
                levelLabel: '4단: 측정항목',
                meta: {
                  defaultMethod: 'IBO-Overlay',
                  defaultLsl: -2.0,
                  defaultTarget: 0.0,
                  defaultUsl: 2.0,
                  unit: 'nm',
                },
              },
            ],
          },
        ],
      },
      {
        id: 'proc-thinfilm',
        parentId: 'root-feol',
        name: 'Thin Film / Deposition',
        code: 'TF-DEP',
        levelLabel: '2단: 공정',
        isExpanded: true,
        children: [
          {
            id: 'method-xrr',
            parentId: 'proc-thinfilm',
            name: 'XRR / Ellipsometry (박막 두께 분석)',
            code: 'M-XRR',
            levelLabel: '3단: 분석기법',
            isExpanded: true,
            meta: {
              defaultMethod: 'Spectroscopic Ellipsometry',
              defaultLsl: 18.0,
              defaultTarget: 20.0,
              defaultUsl: 22.0,
              unit: 'Å',
            },
            children: [
              {
                id: 'param-hk-thk',
                parentId: 'method-xrr',
                name: 'High-K Dielectric Thickness',
                code: 'P-HK-THK',
                levelLabel: '4단: 측정항목',
                meta: {
                  defaultMethod: 'Spectroscopic Ellipsometry',
                  defaultLsl: 18.5,
                  defaultTarget: 20.0,
                  defaultUsl: 21.5,
                  unit: 'Å',
                },
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'root-beol',
    parentId: null,
    name: 'BEOL (배선 및 금속 오염 분석)',
    code: 'BEOL',
    levelLabel: '1단: 공정군',
    isExpanded: true,
    children: [
      {
        id: 'proc-cmp',
        parentId: 'root-beol',
        name: 'Cu Interconnect & CMP',
        code: 'CU-CMP',
        levelLabel: '2단: 공정',
        isExpanded: true,
        children: [
          {
            id: 'method-icpms',
            parentId: 'proc-cmp',
            name: 'VPD-ICP-MS (극미량 금속오염 분석)',
            code: 'M-ICPMS',
            levelLabel: '3단: 분석기법',
            isExpanded: true,
            children: [
              {
                id: 'param-trace-cu',
                parentId: 'method-icpms',
                name: 'Surface Trace Cu/Fe Concentration',
                code: 'P-TRACE-MT',
                levelLabel: '4단: 측정항목',
                meta: {
                  defaultMethod: 'VPD-ICP-MS',
                  defaultLsl: 0.0,
                  defaultTarget: 0.5,
                  defaultUsl: 5.0,
                  unit: 'E9 atoms/cm²',
                },
              },
            ],
          },
        ],
      },
    ],
  },
];

// 초기 말단 노드 수천 건 시뮬레이션 데이터 생성 (2,500건)
function generateInitialSpecItems(): SpecItemRecord[] {
  const leafConfigs = [
    {
      nodeId: 'param-gate-cd',
      prefix: 'D5-16G-GATE',
      namePrefix: 'DDR5 16Gb Gate Wafer Item',
      method: 'CD-SEM',
      lsl: 13.2,
      target: 14.0,
      usl: 14.8,
      unit: 'nm',
      count: 1400,
    },
    {
      nodeId: 'param-fin-pitch',
      prefix: 'AP-3NM-FIN',
      namePrefix: '3nm Logic FinFET Item',
      method: 'CD-SEM',
      lsl: 22.0,
      target: 24.0,
      usl: 26.0,
      unit: 'nm',
      count: 600,
    },
    {
      nodeId: 'param-ovl-xy',
      prefix: 'HBM3E-OVL',
      namePrefix: 'HBM3E TSV Overlay Target Item',
      method: 'IBO-Overlay',
      lsl: -2.0,
      target: 0.0,
      usl: 2.0,
      unit: 'nm',
      count: 300,
    },
    {
      nodeId: 'param-hk-thk',
      prefix: 'HK-OX-ITEM',
      namePrefix: 'High-K HfO2 Film Monitor Item',
      method: 'Ellipsometry',
      lsl: 18.5,
      target: 20.0,
      usl: 21.5,
      unit: 'Å',
      count: 150,
    },
    {
      nodeId: 'param-trace-cu',
      prefix: 'BEOL-CLN',
      namePrefix: 'Post-CMP Clean Monitor Item',
      method: 'VPD-ICP-MS',
      lsl: 0.0,
      target: 0.5,
      usl: 5.0,
      unit: 'E9 atoms/cm²',
      count: 100,
    },
  ];

  const samplingRules = ['매 Lot 5매 (5 Wafer/Lot)', '전수 검사 (100%)', 'Skip Lot (1/3 Lot)'];
  const statuses: Array<'ACTIVE' | 'REVIEW' | 'HOLD'> = ['ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'REVIEW', 'HOLD'];
  const algoTypes: Array<'PEAK_CARD' | 'ZONE_SHEET' | 'SPECTRUM_HYBRID'> = [
    'PEAK_CARD',
    'ZONE_SHEET',
    'SPECTRUM_HYBRID',
  ];

  const defaultZoneRows = [
    { zoneId: 'Z1-CENTER', radiusMm: 0, lsl: 13.2, target: 14.0, usl: 14.8, weight: 1.0 },
    { zoneId: 'Z2-MIDDLE', radiusMm: 75, lsl: 13.1, target: 14.0, usl: 14.9, weight: 1.0 },
    { zoneId: 'Z3-EDGE', radiusMm: 140, lsl: 13.0, target: 14.0, usl: 15.0, weight: 0.8 },
    { zoneId: 'Z4-EXTREME', radiusMm: 148, lsl: 12.8, target: 14.0, usl: 15.2, weight: 0.5 },
  ];

  const defaultWaveRows = [
    { bandName: 'UV-Band-1', wavelengthNm: 248, refIndexN: 1.92, extinctionK: 0.04, tolerancePct: 1.5 },
    { bandName: 'VIS-Band-2', wavelengthNm: 450, refIndexN: 1.85, extinctionK: 0.01, tolerancePct: 1.2 },
    { bandName: 'NIR-Band-3', wavelengthNm: 780, refIndexN: 1.79, extinctionK: 0.00, tolerancePct: 1.0 },
  ];

  const list: SpecItemRecord[] = [];
  for (const cfg of leafConfigs) {
    for (let i = 1; i <= cfg.count; i++) {
      const codeNum = String(i).padStart(4, '0');
      const itemCode = `${cfg.prefix}-${codeNum}`;
      const offset = i % 15 === 0 ? 0.2 : 0;
      const algo =
        cfg.method === 'IBO-Overlay'
          ? 'ZONE_SHEET'
          : cfg.method === 'Ellipsometry'
            ? 'SPECTRUM_HYBRID'
            : algoTypes[(i - 1) % algoTypes.length];

      list.push({
        id: itemCode,
        nodeId: cfg.nodeId,
        itemCode,
        itemName: `${cfg.namePrefix} #${codeNum}`,
        analysisMethod: cfg.method,
        algorithmType: algo,
        lsl: Number((cfg.lsl + offset).toFixed(2)),
        targetValue: cfg.target,
        usl: Number((cfg.usl - offset).toFixed(2)),
        unit: cfg.unit,
        samplingRule: samplingRules[i % samplingRules.length],
        status: statuses[i % statuses.length],
        remarks: i % 15 === 0 ? '고객사 특별 규격(Tight Spec) 적용 항목' : '표준 양산 기준정보 적용',
        edgeThresholdPct: 75,
        smoothingFilter: 'GAUSSIAN_3PT',
        scanFrames: 32,
        autoBaselineCorrection: true,
        zoneSpecTable: defaultZoneRows,
        fittingModel: 'CAUCHY_3TERM',
        minR2Score: 0.995,
        wavelengthTable: defaultWaveRows,
      });
    }
  }
  return list;
}

export const analysisSpecDomainConfig: MasterDataDomainConfig<
  SpecItemRecord,
  SpecNodeMeta
> = {
  domainKey: 'analysis-spec',
  title: '분석 기법 및 규격(USL/LSL) 기준정보',
  subtitle: 'N단 공정/분석기법 트리 및 수천 개 적용 아이템의 상·하한 규격(USL/LSL) 관리',
  treeTitle: '공정 · 분석기법 분류',
  treeData: specTreeData,
  items: generateInitialSpecItems(),
  searchKeys: ['itemCode', 'itemName', 'analysisMethod', 'samplingRule'],
  statusFilterConfig: {
    fieldKey: 'status',
    options: [
      { label: '양산 적용(Active)', value: 'ACTIVE' },
      { label: '검토중(Review)', value: 'REVIEW' },
      { label: '보류(Hold)', value: 'HOLD' },
    ],
  },
  nodeMetaSchema: [
    {
      key: 'defaultMethod',
      label: '기본 분석 기법 (Analysis Method)',
      type: 'select',
      options: [
        { label: 'CD-SEM', value: 'CD-SEM' },
        { label: 'IBO-Overlay', value: 'IBO-Overlay' },
        { label: 'Spectroscopic Ellipsometry', value: 'Spectroscopic Ellipsometry' },
        { label: 'XRR / XRD', value: 'XRR / XRD' },
        { label: 'VPD-ICP-MS', value: 'VPD-ICP-MS' },
        { label: 'TEM / EDX', value: 'TEM / EDX' },
      ],
    },
    { key: 'defaultLsl', label: '노드 기본 LSL (하한)', type: 'number', step: 0.1 },
    { key: 'defaultTarget', label: '노드 기본 Target (목표값)', type: 'number', step: 0.1 },
    { key: 'defaultUsl', label: '노드 기본 USL (상한)', type: 'number', step: 0.1 },
    { key: 'unit', label: '측정 단위 (Unit)', type: 'text', placeholder: 'nm, Å, %, ppm 등' },
  ],
  renderNodeSummary: (node, itemCount) => {
    const meta = node.meta;
    return (
      <Card variant="muted" padding={2}>
        <HStack gap={4} vAlign="center" hAlign="between">
          <HStack gap={3} vAlign="center">
            <Text type="supporting" color="secondary">
              기본 분석기법:{' '}
              <strong>{meta?.defaultMethod || '하위 노드별 지정'}</strong>
            </Text>
            {meta?.defaultLsl !== undefined && meta?.defaultUsl !== undefined && (
              <HStack gap={2} vAlign="center">
                <Badge
                  variant="teal"
                  label={`기본 규격: LSL ${meta.defaultLsl} / Target ${meta.defaultTarget ?? '-'} / USL ${meta.defaultUsl} (${meta.unit ?? ''})`}
                />
              </HStack>
            )}
            {node.description && (
              <Text type="supporting" color="secondary">
                · {node.description}
              </Text>
            )}
          </HStack>
          <Text type="supporting" color="secondary">
            매핑된 대상 아이템 <strong>{itemCount.toLocaleString()}</strong>개
          </Text>
        </HStack>
      </Card>
    );
  },
  // 가상화(Virtualization) 성능을 극대화하면서 한눈에 들어오도록 핵심 컬럼만 간결하게 표시
  drawerWidth: 720,
  columns: [
    {
      key: 'itemCode',
      header: '아이템 코드',
      width: pixel(170),
      sortable: true,
    },
    {
      key: 'itemName',
      header: '적용 아이템 명칭',
      width: proportional(1.5, { minWidth: 180 }),
      sortable: true,
    },
    {
      key: 'analysisMethod',
      header: '분석 기법',
      width: pixel(120),
      sortable: true,
    },
    {
      key: 'algorithmType',
      header: '입력 알고리즘 유형',
      width: pixel(155),
      sortable: true,
    },
    {
      key: 'lsl',
      header: 'LSL (하한)',
      width: pixel(95),
      align: 'end',
      sortable: true,
    },
    {
      key: 'targetValue',
      header: 'Target',
      width: pixel(90),
      align: 'end',
      sortable: true,
    },
    {
      key: 'usl',
      header: 'USL (상한)',
      width: pixel(95),
      align: 'end',
      sortable: true,
    },
    {
      key: 'unit',
      header: '단위',
      width: pixel(75),
      align: 'center',
    },
    {
      key: 'status',
      header: '적용 상태',
      width: pixel(105),
      align: 'center',
      sortable: true,
    },
  ],
  formSchema: [
    // =========================================================================
    // [섹션 1] 공통 식별 정보 & 알고리즘 유형 선택기 (선택에 따라 아래 UI가 동적으로 바뀜)
    // =========================================================================
    {
      key: 'itemCode',
      label: '아이템 코드 (Item ID)',
      type: 'text',
      required: true,
      readOnlyOnEdit: true,
      gridSpan: 'half',
      cardGroup: '기본 식별 및 적용 알고리즘 선택',
      placeholder: '예: D5-16G-GATE-2501',
      section: '1. 대상 아이템 및 알고리즘 선택',
    },
    {
      key: 'analysisMethod',
      label: '적용 분석 기법 (Method)',
      type: 'select',
      required: true,
      gridSpan: 'half',
      cardGroup: '기본 식별 및 적용 알고리즘 선택',
      options: [
        { label: 'CD-SEM (임계치수 전자현미경)', value: 'CD-SEM' },
        { label: 'IBO-Overlay (광학 정렬도 분석)', value: 'IBO-Overlay' },
        { label: 'Ellipsometry (박막 두께 분석)', value: 'Ellipsometry' },
        { label: 'XRR / XRD (박막 밀도/결정성)', value: 'XRR / XRD' },
        { label: 'VPD-ICP-MS (금속 오염 분석)', value: 'VPD-ICP-MS' },
      ],
      section: '1. 대상 아이템 및 알고리즘 선택',
    },
    {
      key: 'itemName',
      label: '아이템 명칭',
      type: 'text',
      required: true,
      gridSpan: 'full',
      cardGroup: '기본 식별 및 적용 알고리즘 선택',
      placeholder: '예: DDR5 16Gb Gate Wafer Item #2501',
      section: '1. 대상 아이템 및 알고리즘 선택',
    },
    {
      key: 'algorithmType',
      label: '🔥 분석 알고리즘 & 입력 UI 템플릿 유형 (변경해 보세요!)',
      type: 'select',
      required: true,
      gridSpan: 'full',
      cardGroup: '기본 식별 및 적용 알고리즘 선택',
      description:
        '선택한 알고리즘에 따라 아래 섹션이 [카드 그룹형], [복사·붙여넣기 스프레드시트형], [카드+시트 복합형]으로 실시간 전환됩니다.',
      options: [
        {
          label: '① [PEAK_CARD] 단일 피크 검출 알고리즘 ➔ 2단 카드 그룹(Card Group) 입력',
          value: 'PEAK_CARD',
        },
        {
          label: '② [ZONE_SHEET] 다중 Zone 웨이퍼 맵 알고리즘 ➔ 인라인 스프레드시트(Ctrl+C/V) 입력',
          value: 'ZONE_SHEET',
        },
        {
          label: '③ [SPECTRUM_HYBRID] 스펙트럼 피팅 알고리즘 ➔ 모델 카드 + 파장 스프레드시트 복합 입력',
          value: 'SPECTRUM_HYBRID',
        },
      ],
      section: '1. 대상 아이템 및 알고리즘 선택',
    },

    // =========================================================================
    // [유형 ①: PEAK_CARD 선택 시] -> 카드 그룹(Card Group) 2개로 나뉘어 렌더링
    // =========================================================================
    {
      key: 'lsl',
      label: 'LSL (하한 규격)',
      type: 'number',
      required: true,
      step: 0.1,
      gridSpan: 'third',
      cardGroup: '카드 A: 상·하한 규격 임계치 (Spec Limits Card)',
      visibleWhen: { field: 'algorithmType', in: ['PEAK_CARD', 'SPECTRUM_HYBRID'] },
      section: '2. 알고리즘 전용 파라미터 입력 (동적 UI)',
    },
    {
      key: 'targetValue',
      label: 'Target (목표값)',
      type: 'number',
      required: true,
      step: 0.1,
      gridSpan: 'third',
      cardGroup: '카드 A: 상·하한 규격 임계치 (Spec Limits Card)',
      visibleWhen: { field: 'algorithmType', in: ['PEAK_CARD', 'SPECTRUM_HYBRID'] },
      section: '2. 알고리즘 전용 파라미터 입력 (동적 UI)',
    },
    {
      key: 'usl',
      label: 'USL (상한 규격)',
      type: 'number',
      required: true,
      step: 0.1,
      gridSpan: 'third',
      cardGroup: '카드 A: 상·하한 규격 임계치 (Spec Limits Card)',
      visibleWhen: { field: 'algorithmType', in: ['PEAK_CARD', 'SPECTRUM_HYBRID'] },
      section: '2. 알고리즘 전용 파라미터 입력 (동적 UI)',
    },
    {
      key: 'edgeThresholdPct',
      label: 'Edge 검출 임계치',
      type: 'number',
      units: '%',
      step: 5,
      min: 10,
      max: 95,
      gridSpan: 'third',
      cardGroup: '카드 B: 전자빔 스캔 & 피크 검출 알고리즘 카드',
      visibleWhen: { field: 'algorithmType', equals: 'PEAK_CARD' },
      section: '2. 알고리즘 전용 파라미터 입력 (동적 UI)',
    },
    {
      key: 'scanFrames',
      label: 'Frame 적분 횟수',
      type: 'number',
      units: 'frames',
      step: 8,
      gridSpan: 'third',
      cardGroup: '카드 B: 전자빔 스캔 & 피크 검출 알고리즘 카드',
      visibleWhen: { field: 'algorithmType', equals: 'PEAK_CARD' },
      section: '2. 알고리즘 전용 파라미터 입력 (동적 UI)',
    },
    {
      key: 'smoothingFilter',
      label: '노이즈 스무딩 필터',
      type: 'select',
      gridSpan: 'third',
      cardGroup: '카드 B: 전자빔 스캔 & 피크 검출 알고리즘 카드',
      options: [
        { label: 'Gaussian 3-Point', value: 'GAUSSIAN_3PT' },
        { label: 'Savitzky-Golay 5-Pt', value: 'SAVGOL_5PT' },
        { label: 'Median Filter', value: 'MEDIAN' },
      ],
      visibleWhen: { field: 'algorithmType', equals: 'PEAK_CARD' },
      section: '2. 알고리즘 전용 파라미터 입력 (동적 UI)',
    },
    {
      key: 'autoBaselineCorrection',
      label: '자동 Baseline Drift 보정 활성화',
      type: 'switch',
      gridSpan: 'full',
      cardGroup: '카드 B: 전자빔 스캔 & 피크 검출 알고리즘 카드',
      visibleWhen: { field: 'algorithmType', equals: 'PEAK_CARD' },
      section: '2. 알고리즘 전용 파라미터 입력 (동적 UI)',
    },

    // =========================================================================
    // [유형 ②: ZONE_SHEET 선택 시] -> 복사·붙여넣기가 가능한 미니 스프레드시트 렌더링
    // =========================================================================
    {
      key: 'zoneSpecTable',
      label: '웨이퍼 Zone별 다중 USL / LSL 매트릭스 시트',
      type: 'spreadsheet',
      gridSpan: 'full',
      cardGroup: '다중 Zone 스프레드시트 입력 (엑셀 Ctrl+C / Ctrl+V 지원)',
      visibleWhen: { field: 'algorithmType', equals: 'ZONE_SHEET' },
      section: '2. 알고리즘 전용 파라미터 입력 (동적 UI)',
      spreadsheetConfig: {
        helperText:
          '웨이퍼 반경(Radius) 구간별로 서로 다른 LSL / Target / USL 및 가중치를 엑셀에서 복사해 붙여넣거나 직접 수정하세요.',
        columns: [
          { key: 'zoneId', header: 'Zone 코드', type: 'text', width: 120 },
          { key: 'radiusMm', header: '반경', type: 'number', unit: 'mm', align: 'end', step: 1, width: 85 },
          { key: 'lsl', header: 'LSL', type: 'number', unit: 'nm', align: 'end', step: 0.1, width: 85 },
          { key: 'target', header: 'Target', type: 'number', unit: 'nm', align: 'end', step: 0.1, width: 85 },
          { key: 'usl', header: 'USL', type: 'number', unit: 'nm', align: 'end', step: 0.1, width: 85 },
          { key: 'weight', header: '가중치', type: 'number', align: 'end', step: 0.1, width: 75 },
        ],
        defaultRows: [
          { zoneId: 'Z1-CENTER', radiusMm: 0, lsl: 13.2, target: 14.0, usl: 14.8, weight: 1.0 },
          { zoneId: 'Z2-MIDDLE', radiusMm: 75, lsl: 13.1, target: 14.0, usl: 14.9, weight: 1.0 },
          { zoneId: 'Z3-EDGE', radiusMm: 140, lsl: 13.0, target: 14.0, usl: 15.0, weight: 0.8 },
        ],
        samplePasteRows: [
          { zoneId: 'Z1-CORE', radiusMm: 0, lsl: 13.5, target: 14.0, usl: 14.5, weight: 1.0 },
          { zoneId: 'Z2-INNER', radiusMm: 45, lsl: 13.4, target: 14.0, usl: 14.6, weight: 1.0 },
          { zoneId: 'Z3-MID', radiusMm: 90, lsl: 13.3, target: 14.0, usl: 14.7, weight: 0.9 },
          { zoneId: 'Z4-OUTER', radiusMm: 125, lsl: 13.1, target: 14.0, usl: 14.9, weight: 0.8 },
          { zoneId: 'Z5-BEVEL', radiusMm: 147, lsl: 12.9, target: 14.0, usl: 15.1, weight: 0.5 },
        ],
      },
    },

    // =========================================================================
    // [유형 ③: SPECTRUM_HYBRID 선택 시] -> 광학 분산 모델 카드 + 파장별 스프레드시트 복합 렌더링
    // =========================================================================
    {
      key: 'fittingModel',
      label: '광학 분산 피팅 모델 (Dispersion Model)',
      type: 'select',
      gridSpan: 'half',
      cardGroup: '카드 B: 광학 스펙트럼 피팅 모델 설정',
      options: [
        { label: 'Cauchy 3-Term Dispersion', value: 'CAUCHY_3TERM' },
        { label: 'Tauc-Lorentz Oscillator', value: 'TAUC_LORENTZ' },
        { label: 'Forouhi-Bloomer Model', value: 'FOROUHI_BLOOMER' },
      ],
      visibleWhen: { field: 'algorithmType', equals: 'SPECTRUM_HYBRID' },
      section: '2. 알고리즘 전용 파라미터 입력 (동적 UI)',
    },
    {
      key: 'minR2Score',
      label: '최소 Goodness-of-Fit (R² 하한)',
      type: 'number',
      step: 0.001,
      min: 0.8,
      max: 1.0,
      gridSpan: 'half',
      cardGroup: '카드 B: 광학 스펙트럼 피팅 모델 설정',
      visibleWhen: { field: 'algorithmType', equals: 'SPECTRUM_HYBRID' },
      section: '2. 알고리즘 전용 파라미터 입력 (동적 UI)',
    },
    {
      key: 'wavelengthTable',
      label: '파장 대역별 굴절률(n, k) & 허용 오차 스프레드시트',
      type: 'spreadsheet',
      gridSpan: 'full',
      cardGroup: '카드 C: 파장(Wavelength) 스펙트럼 테이블 (복사·붙여넣기)',
      visibleWhen: { field: 'algorithmType', equals: 'SPECTRUM_HYBRID' },
      section: '2. 알고리즘 전용 파라미터 입력 (동적 UI)',
      spreadsheetConfig: {
        helperText:
          '파장(nm)별 기준 굴절률(n), 소광계수(k), 허용 오차(%) 테이블입니다. 엑셀에서 복사해 붙여넣을 수 있습니다.',
        columns: [
          { key: 'bandName', header: '파장 대역', type: 'text', width: 115 },
          { key: 'wavelengthNm', header: '파장', type: 'number', unit: 'nm', align: 'end', step: 1, width: 90 },
          { key: 'refIndexN', header: '굴절률(n)', type: 'number', align: 'end', step: 0.01, width: 95 },
          { key: 'extinctionK', header: '소광계수(k)', type: 'number', align: 'end', step: 0.01, width: 95 },
          { key: 'tolerancePct', header: '허용오차', type: 'number', unit: '%', align: 'end', step: 0.1, width: 95 },
        ],
        defaultRows: [
          { bandName: 'UV-Band-1', wavelengthNm: 248, refIndexN: 1.92, extinctionK: 0.04, tolerancePct: 1.5 },
          { bandName: 'VIS-Band-2', wavelengthNm: 450, refIndexN: 1.85, extinctionK: 0.01, tolerancePct: 1.2 },
          { bandName: 'NIR-Band-3', wavelengthNm: 780, refIndexN: 1.79, extinctionK: 0.00, tolerancePct: 1.0 },
        ],
        samplePasteRows: [
          { bandName: 'DUV-193', wavelengthNm: 193, refIndexN: 2.05, extinctionK: 0.12, tolerancePct: 2.0 },
          { bandName: 'UV-248', wavelengthNm: 248, refIndexN: 1.92, extinctionK: 0.04, tolerancePct: 1.5 },
          { bandName: 'I-Line-365', wavelengthNm: 365, refIndexN: 1.88, extinctionK: 0.02, tolerancePct: 1.2 },
          { bandName: 'VIS-532', wavelengthNm: 532, refIndexN: 1.82, extinctionK: 0.00, tolerancePct: 1.0 },
          { bandName: 'NIR-850', wavelengthNm: 850, refIndexN: 1.77, extinctionK: 0.00, tolerancePct: 0.8 },
        ],
      },
    },

    // =========================================================================
    // [섹션 3] 공통 운영 정책 및 비고 카드
    // =========================================================================
    {
      key: 'unit',
      label: '기본 측정 단위',
      type: 'select',
      required: true,
      gridSpan: 'third',
      cardGroup: '운영 정책 및 샘플링 설정',
      options: [
        { label: 'nm (나노미터)', value: 'nm' },
        { label: 'Å (옹스트롬)', value: 'Å' },
        { label: 'µm (마이크로미터)', value: 'µm' },
        { label: 'E9 atoms/cm²', value: 'E9 atoms/cm²' },
        { label: '% (퍼센트)', value: '%' },
      ],
      section: '3. 공통 운영 정책 및 비고',
    },
    {
      key: 'samplingRule',
      label: '샘플링 주기',
      type: 'select',
      gridSpan: 'third',
      cardGroup: '운영 정책 및 샘플링 설정',
      options: [
        { label: '매 Lot 5매 (5 Wafer/Lot)', value: '매 Lot 5매 (5 Wafer/Lot)' },
        { label: '전수 검사 (100%)', value: '전수 검사 (100%)' },
        { label: 'Skip Lot (1/3 Lot)', value: 'Skip Lot (1/3 Lot)' },
      ],
      section: '3. 공통 운영 정책 및 비고',
    },
    {
      key: 'status',
      label: '운영 상태',
      type: 'select',
      required: true,
      gridSpan: 'third',
      cardGroup: '운영 정책 및 샘플링 설정',
      options: [
        { label: 'ACTIVE (양산 적용)', value: 'ACTIVE' },
        { label: 'REVIEW (엔지니어 검토중)', value: 'REVIEW' },
        { label: 'HOLD (적용 보류)', value: 'HOLD' },
      ],
      section: '3. 공통 운영 정책 및 비고',
    },
    {
      key: 'remarks',
      label: '비고 / 특이사항',
      type: 'textarea',
      gridSpan: 'full',
      cardGroup: '운영 정책 및 샘플링 설정',
      placeholder: '예외 규격 사유 또는 변경 이력을 메모하세요.',
      section: '3. 공통 운영 정책 및 비고',
    },
  ],
  createDefaultItem: (selectedNode, currentCount) => {
    const seq = String(currentCount + 1).padStart(4, '0');
    const codePrefix = selectedNode.code || 'ITEM';
    const meta = selectedNode.meta;
    return {
      id: `${codePrefix}-${seq}`,
      itemCode: `${codePrefix}-${seq}`,
      itemName: `${selectedNode.name} 적용 아이템 #${seq}`,
      analysisMethod: meta?.defaultMethod ?? 'CD-SEM',
      algorithmType: 'ZONE_SHEET',
      lsl: meta?.defaultLsl ?? 10.0,
      targetValue: meta?.defaultTarget ?? 12.0,
      usl: meta?.defaultUsl ?? 14.0,
      unit: meta?.unit ?? 'nm',
      samplingRule: '매 Lot 5매 (5 Wafer/Lot)',
      status: 'ACTIVE',
      edgeThresholdPct: 75,
      smoothingFilter: 'GAUSSIAN_3PT',
      scanFrames: 32,
      autoBaselineCorrection: true,
      fittingModel: 'CAUCHY_3TERM',
      minR2Score: 0.995,
      remarks: '',
    };
  },
};

/**
 * [예시 2] 다른 페이지에 동일 템플릿을 그대로 재사용한 사례:
 * 계측 설비 · 챔버 · 센서 파라미터 기준정보 (Config만 교체하여 동일 레이아웃 재사용)
 */
export interface EquipmentSensorRecord extends BaseRecordItem {
  id: string;
  nodeId: string;
  sensorCode: string;
  sensorName: string;
  dataType: string;
  pollingIntervalSec: number;
  calibrationCycleDays: number;
  status: 'ONLINE' | 'MAINT' | 'OFFLINE';
  description?: string;
}

const equipmentTreeData: HierarchyNode[] = [
  {
    id: 'fab-m16',
    parentId: null,
    name: 'FAB Line 1 (양산 1라인)',
    code: 'FAB-L1',
    levelLabel: '1단: FAB 라인',
    isExpanded: true,
    children: [
      {
        id: 'bay-metrology',
        parentId: 'fab-m16',
        name: 'Bay A-04 (계측/분석 장비 구역)',
        code: 'BAY-A04',
        levelLabel: '2단: Bay',
        isExpanded: true,
        children: [
          {
            id: 'eqp-cdsem-01',
            parentId: 'bay-metrology',
            name: 'CD-SEM 호기 #01 (CG6300)',
            code: 'EQP-SEM01',
            levelLabel: '3단: 설비(EQP)',
            isExpanded: true,
            children: [
              {
                id: 'mod-e-gun',
                parentId: 'eqp-cdsem-01',
                name: 'Electron Optics Column',
                code: 'MOD-COL',
                levelLabel: '4단: 모듈/유닛',
              },
              {
                id: 'mod-vac-chamber',
                parentId: 'eqp-cdsem-01',
                name: 'High Vacuum Sample Chamber',
                code: 'MOD-VAC',
                levelLabel: '4단: 모듈/유닛',
              },
            ],
          },
        ],
      },
    ],
  },
];

function generateInitialEquipmentItems(): EquipmentSensorRecord[] {
  const list: EquipmentSensorRecord[] = [];
  const statuses: Array<'ONLINE' | 'MAINT' | 'OFFLINE'> = ['ONLINE', 'ONLINE', 'ONLINE', 'MAINT', 'OFFLINE'];

  for (let i = 1; i <= 400; i++) {
    const num = String(i).padStart(4, '0');
    const isColumn = i % 2 === 0;
    list.push({
      id: `SNS-${num}`,
      nodeId: isColumn ? 'mod-e-gun' : 'mod-vac-chamber',
      sensorCode: `SNS-${num}`,
      sensorName: isColumn
        ? `Beam Acceleration Voltage Sensor #${num}`
        : `Chamber Turbo Pump Pressure Gauge #${num}`,
      dataType: isColumn ? 'FLOAT (kV)' : 'FLOAT (Torr)',
      pollingIntervalSec: isColumn ? 1 : 5,
      calibrationCycleDays: 90,
      status: statuses[i % statuses.length],
      description: 'FDC 실시간 수집 대상 센서 채널',
    });
  }
  return list;
}

export const equipmentMasterDomainConfig: MasterDataDomainConfig<EquipmentSensorRecord> = {
  domainKey: 'equipment-sensor',
  title: '계측 설비 · 모듈 · 센서 채널 기준정보',
  subtitle: '동일한 MasterDataCrudTemplate에 설정(Config)만 교체하여 다른 기준정보 페이지를 구성한 예시',
  treeTitle: '라인 · 설비 · 모듈 트리',
  treeData: equipmentTreeData,
  items: generateInitialEquipmentItems(),
  searchKeys: ['sensorCode', 'sensorName', 'dataType'],
  statusFilterConfig: {
    fieldKey: 'status',
    options: [
      { label: '수집중(Online)', value: 'ONLINE' },
      { label: '점검(Maint)', value: 'MAINT' },
      { label: '중지(Offline)', value: 'OFFLINE' },
    ],
  },
  columns: [
    { key: 'sensorCode', header: '센서 채널 코드', width: pixel(150), sortable: true },
    {
      key: 'sensorName',
      header: '센서 / 파라미터 명칭',
      width: proportional(1.6, { minWidth: 200 }),
      sortable: true,
    },
    { key: 'dataType', header: '데이터 타입', width: pixel(130), sortable: true },
    {
      key: 'pollingIntervalSec',
      header: '수집 주기(초)',
      width: pixel(120),
      align: 'end',
      sortable: true,
    },
    {
      key: 'calibrationCycleDays',
      header: '교정 주기(일)',
      width: pixel(120),
      align: 'end',
      sortable: true,
    },
    { key: 'status', header: '상태', width: pixel(110), align: 'center', sortable: true },
  ],
  formSchema: [
    {
      key: 'sensorCode',
      label: '센서 채널 코드',
      type: 'text',
      required: true,
      readOnlyOnEdit: true,
      section: '1. 센서 기본 식별 정보',
    },
    {
      key: 'sensorName',
      label: '센서 명칭',
      type: 'text',
      required: true,
      section: '1. 센서 기본 식별 정보',
    },
    {
      key: 'dataType',
      label: '데이터 수집 타입',
      type: 'select',
      required: true,
      options: [
        { label: 'FLOAT (kV)', value: 'FLOAT (kV)' },
        { label: 'FLOAT (Torr)', value: 'FLOAT (Torr)' },
        { label: 'INTEGER (RPM)', value: 'INTEGER (RPM)' },
      ],
      section: '2. 수집 및 교정 정책',
    },
    {
      key: 'pollingIntervalSec',
      label: 'FDC 수집 주기',
      type: 'number',
      units: 'sec',
      step: 1,
      min: 1,
      required: true,
      section: '2. 수집 및 교정 정책',
    },
    {
      key: 'calibrationCycleDays',
      label: '정기 교정 주기',
      type: 'number',
      units: 'days',
      step: 30,
      min: 1,
      required: true,
      section: '2. 수집 및 교정 정책',
    },
    {
      key: 'status',
      label: '채널 상태',
      type: 'select',
      required: true,
      options: [
        { label: 'ONLINE (수집중)', value: 'ONLINE' },
        { label: 'MAINT (예방점검)', value: 'MAINT' },
        { label: 'OFFLINE (비활성)', value: 'OFFLINE' },
      ],
      section: '2. 수집 및 교정 정책',
    },
    {
      key: 'description',
      label: '설명',
      type: 'textarea',
      section: '2. 수집 및 교정 정책',
    },
  ],
  createDefaultItem: (selectedNode, currentCount) => {
    const seq = String(currentCount + 1).padStart(4, '0');
    return {
      id: `SNS-${seq}`,
      sensorCode: `SNS-${seq}`,
      sensorName: `${selectedNode.name} 센서 채널 #${seq}`,
      dataType: 'FLOAT (kV)',
      pollingIntervalSec: 1,
      calibrationCycleDays: 90,
      status: 'ONLINE',
      description: '',
    };
  },
};

/**
 * [예시 3] 스프레드시트 입출력(Spreadsheet I/O) 전용 템플릿 설정 예시
 * - 메인 화면에서 바로 엑셀처럼 셀 클릭/방향키로 USL, LSL, Target, 분석기법을 대량 편집하고
 *   엑셀 복사·붙여넣기(TSV/CSV) 및 열 일괄 채우기를 수행하는 페이지
 */
export const analysisSpreadsheetDomainConfig: SpreadsheetDomainConfig<
  SpecItemRecord,
  SpecNodeMeta
> = {
  domainKey: 'analysis-spec-sheet',
  title: '분석기법 · USL/LSL 스프레드시트 대량 입출력',
  subtitle:
    '메인 그리드에서 엑셀처럼 직접 셀을 편집하고 Ctrl+C / Ctrl+V로 수천 건의 규격(USL/LSL)을 일괄 입출력하는 템플릿',
  treeTitle: '공정 · 분석기법 분류',
  treeData: specTreeData,
  items: generateInitialSpecItems(),
  searchKeys: ['itemCode', 'itemName', 'analysisMethod', 'samplingRule'],
  nodeMetaSchema: analysisSpecDomainConfig.nodeMetaSchema,
  columns: [
    {
      key: 'itemCode',
      header: '아이템 코드',
      type: 'text',
      width: 170,
      required: true,
    },
    {
      key: 'itemName',
      header: '적용 아이템 명칭',
      type: 'text',
      width: 240,
      required: true,
    },
    {
      key: 'analysisMethod',
      header: '분석 기법',
      type: 'select',
      width: 145,
      required: true,
      options: [
        { label: 'CD-SEM', value: 'CD-SEM' },
        { label: 'IBO-Overlay', value: 'IBO-Overlay' },
        { label: 'Ellipsometry', value: 'Ellipsometry' },
        { label: 'XRR / XRD', value: 'XRR / XRD' },
        { label: 'VPD-ICP-MS', value: 'VPD-ICP-MS' },
        { label: 'TEM-EDX', value: 'TEM-EDX' },
      ],
    },
    {
      key: 'lsl',
      header: 'LSL (하한)',
      type: 'number',
      width: 110,
      align: 'end',
      step: 0.1,
      required: true,
      validate: (val, row) => {
        if (Number(val) > Number(row.usl)) {
          return '하한(LSL)이 상한(USL)보다 클 수 없습니다.';
        }
        return null;
      },
    },
    {
      key: 'targetValue',
      header: 'Target',
      type: 'number',
      width: 105,
      align: 'end',
      step: 0.1,
      required: true,
      validate: (val, row) => {
        const num = Number(val);
        if (num < Number(row.lsl) || num > Number(row.usl)) {
          return 'Target 값은 LSL과 USL 사이여야 합니다.';
        }
        return null;
      },
    },
    {
      key: 'usl',
      header: 'USL (상한)',
      type: 'number',
      width: 110,
      align: 'end',
      step: 0.1,
      required: true,
      validate: (val, row) => {
        if (Number(val) < Number(row.lsl)) {
          return '상한(USL)이 하한(LSL)보다 작을 수 없습니다.';
        }
        return null;
      },
    },
    {
      key: 'unit',
      header: '단위',
      type: 'select',
      width: 95,
      align: 'center',
      options: [
        { label: 'nm', value: 'nm' },
        { label: 'Å', value: 'Å' },
        { label: 'µm', value: 'µm' },
        { label: 'E9 atoms/cm²', value: 'E9 atoms/cm²' },
        { label: '%', value: '%' },
      ],
    },
    {
      key: 'samplingRule',
      header: '샘플링 주기',
      type: 'select',
      width: 165,
      options: [
        { label: '매 Lot 5매 (5 Wafer/Lot)', value: '매 Lot 5매 (5 Wafer/Lot)' },
        { label: '전수 검사 (100%)', value: '전수 검사 (100%)' },
        { label: 'Skip Lot (1/3 Lot)', value: 'Skip Lot (1/3 Lot)' },
      ],
    },
    {
      key: 'status',
      header: '적용 상태',
      type: 'select',
      width: 105,
      align: 'center',
      options: [
        { label: 'ACTIVE', value: 'ACTIVE' },
        { label: 'REVIEW', value: 'REVIEW' },
        { label: 'HOLD', value: 'HOLD' },
      ],
    },
  ],
  createEmptyRow: (selectedNode, nextIndex) => {
    const seq = String(nextIndex).padStart(4, '0');
    const prefix = selectedNode.code || 'ITEM';
    const code = `${prefix}-NEW-${seq}`;
    const meta = selectedNode.meta;
    return {
      id: code,
      nodeId: selectedNode.id,
      itemCode: code,
      itemName: `${selectedNode.name} 신규 아이템 #${seq}`,
      analysisMethod: meta?.defaultMethod ?? 'CD-SEM',
      lsl: meta?.defaultLsl ?? 13.0,
      targetValue: meta?.defaultTarget ?? 14.0,
      usl: meta?.defaultUsl ?? 15.0,
      unit: meta?.unit ?? 'nm',
      samplingRule: '매 Lot 5매 (5 Wafer/Lot)',
      status: 'ACTIVE',
      remarks: '',
    };
  },
};

/**
 * [예시 3] 템플릿 3: 상하 분할 마스터 워크벤치 & Dual-List 아이템 셔틀 매핑 설정
 * - 좌측: 분석 규격 카탈로그
 * - 우측 상단: 어떤 분석기법을 쓸지, 그 분석기법의 USL / Target / LSL 은 무엇인지 직접 입력 + 스펙 게이지
 * - 우측 하단: 전체 수천 개 아이템 풀에서 해당 규격을 사용할 아이템들을 좌<->우 셔틀로 대량 매핑
 */
function generateWorkbenchPoolItems(total = 3200): WorkbenchPoolItem[] {
  const families = ['DDR5', 'HBM3E', 'LPDDR5X', '3nm-Logic'];
  const list: WorkbenchPoolItem[] = [];
  for (let i = 1; i <= total; i++) {
    const fam = families[i % families.length];
    const num = String(i).padStart(4, '0');
    list.push({
      id: `ITEM-${fam}-${num}`,
      itemCode: `${fam}-WAF-${num}`,
      itemName: `${fam} Production Wafer Lot Target #${num}`,
      productFamily: fam,
      waferType: i % 3 === 0 ? 'Monitor Wafer' : 'Product Wafer',
      overrideLsl: i % 25 === 0 ? 13.4 : null,
      overrideUsl: i % 25 === 0 ? 14.6 : null,
    });
  }
  return list;
}

const initialPool = generateWorkbenchPoolItems(3200);

export const specWorkbenchDomainConfig: SpecWorkbenchDomainConfig = {
  domainKey: 'spec-workbench',
  title: '분석기법 · USL/LSL 마스터 워크벤치 & 대상 아이템 매핑',
  subtitle:
    '상단에서 분석기법과 USL/LSL을 설정하고, 하단 셔틀에서 적용할 수천 개의 아이템을 좌↔우로 할당하는 템플릿',
  categories: [
    { id: 'cat-litho', name: 'Photo / Litho', code: 'LITHO', groupName: 'FEOL' },
    { id: 'cat-etch', name: 'Dry Etch', code: 'ETCH', groupName: 'FEOL' },
    { id: 'cat-tf', name: 'Thin Film', code: 'THINFILM', groupName: 'FEOL' },
    { id: 'cat-cmp', name: 'Cu / CMP', code: 'CMP', groupName: 'BEOL' },
  ],
  rules: [
    {
      id: 'rule-gate-cd',
      categoryId: 'cat-litho',
      ruleCode: 'SPEC-LITHO-001',
      ruleName: 'Gate Bottom CD 정밀 계측 규격',
      analysisMethod: 'CD-SEM',
      lsl: 13.2,
      target: 14.0,
      usl: 14.8,
      unit: 'nm',
      status: 'ACTIVE',
    },
    {
      id: 'rule-ovl-tsv',
      categoryId: 'cat-litho',
      ruleCode: 'SPEC-LITHO-002',
      ruleName: 'HBM3E TSV Layer Overlay 정렬도 규격',
      analysisMethod: 'IBO-Overlay',
      lsl: -2.0,
      target: 0.0,
      usl: 2.0,
      unit: 'nm',
      status: 'ACTIVE',
    },
    {
      id: 'rule-etch-depth',
      categoryId: 'cat-etch',
      ruleCode: 'SPEC-ETCH-001',
      ruleName: 'STI Trench Etch Depth & Profile 규격',
      analysisMethod: 'OCD / Scatterometry',
      lsl: 145.0,
      target: 150.0,
      usl: 155.0,
      unit: 'nm',
      status: 'ACTIVE',
    },
    {
      id: 'rule-hk-thk',
      categoryId: 'cat-tf',
      ruleCode: 'SPEC-TF-001',
      ruleName: 'High-K HfO2 유전막 두께 분석 규격',
      analysisMethod: 'Spectroscopic Ellipsometry',
      lsl: 18.5,
      target: 20.0,
      usl: 21.5,
      unit: 'Å',
      status: 'ACTIVE',
    },
    {
      id: 'rule-cmp-trace',
      categoryId: 'cat-cmp',
      ruleCode: 'SPEC-CMP-001',
      ruleName: 'Post-CMP 표면 극미량 금속 오염도 규격',
      analysisMethod: 'VPD-ICP-MS',
      lsl: 0.0,
      target: 0.5,
      usl: 5.0,
      unit: 'E9 atoms/cm²',
      status: 'DRAFT',
    },
  ],
  allPoolItems: initialPool,
  initialRuleItemMap: {
    'rule-gate-cd': initialPool.slice(0, 1250).map((i) => i.id),
    'rule-ovl-tsv': initialPool.slice(1250, 1900).map((i) => i.id),
    'rule-etch-depth': initialPool.slice(1900, 2400).map((i) => i.id),
    'rule-hk-thk': initialPool.slice(2400, 2750).map((i) => i.id),
    'rule-cmp-trace': initialPool.slice(2750, 2900).map((i) => i.id),
  },
  methodOptions: [
    { label: 'CD-SEM (임계치수 주사전자현미경)', value: 'CD-SEM' },
    { label: 'IBO-Overlay (광학 정렬도 분석)', value: 'IBO-Overlay' },
    { label: 'OCD / Scatterometry (3D 형상 광학계측)', value: 'OCD / Scatterometry' },
    { label: 'Spectroscopic Ellipsometry (박막 두께)', value: 'Spectroscopic Ellipsometry' },
    { label: 'XRR / XRD (박막 밀도·결정성)', value: 'XRR / XRD' },
    { label: 'VPD-ICP-MS (극미량 금속오염)', value: 'VPD-ICP-MS' },
    { label: 'TEM-EDX (단면 원자구조 분석)', value: 'TEM-EDX' },
  ],
  unitOptions: [
    { label: 'nm', value: 'nm' },
    { label: 'Å', value: 'Å' },
    { label: 'µm', value: 'µm' },
    { label: 'E9 atoms/cm²', value: 'E9 atoms/cm²' },
    { label: '%', value: '%' },
  ],
  productFamilyOptions: [
    { label: 'DDR5', value: 'DDR5' },
    { label: 'HBM3E', value: 'HBM3E' },
    { label: 'LPDDR5X', value: 'LPDDR5X' },
    { label: '3nm-Logic', value: '3nm-Logic' },
  ],
};

/**
 * [예시 4] 템플릿 4: 트리 구조 없이 단순 DB 마스터 테이블을 직접 조회/필터링/페이징/관리하는 설정 예시
 * (DB 테이블명: TB_ANALYSIS_METHOD_MST - 분석 기법 및 계측 장비 마스터 테이블)
 */
export interface FlatAnalysisMethodRecord extends FlatRecordItem {
  id: string;
  methodCode: string;
  methodName: string;
  processArea: string;
  equipmentModel: string;
  vendor: string;
  defaultUnit: string;
  standardTatHours: number;
  ownerTeam: string;
  updatedAt: string;
  status: 'ACTIVE' | 'CALIBRATION' | 'INACTIVE';
  description?: string;
}

function generateFlatDbTableRecords(count = 340): FlatAnalysisMethodRecord[] {
  const processAreas = ['LITHO (노광)', 'ETCH (식각)', 'THIN-FILM (박막)', 'CMP (연마)', 'CLEAN (세정)'];
  const vendors = ['Hitachi High-Tech', 'KLA Corporation', 'Applied Materials', 'ASML', 'Thermo Fisher', 'Bruker'];
  const models = ['CG6300 CD-SEM', 'Archer 700 Overlay', 'SpectraFilm F1', 'VeritySEM 5i', 'iCAP RQ ICP-MS', 'Talos F200X TEM'];
  const units = ['nm', 'Å', 'µm', 'E9 atoms/cm²', '%'];
  const teams = ['선행계측기술팀', '소자분석1팀', '수율분석파트', '품질보증분석팀'];
  const statuses: Array<'ACTIVE' | 'CALIBRATION' | 'INACTIVE'> = [
    'ACTIVE',
    'ACTIVE',
    'ACTIVE',
    'ACTIVE',
    'CALIBRATION',
    'INACTIVE',
  ];

  const list: FlatAnalysisMethodRecord[] = [];
  for (let i = 1; i <= count; i++) {
    const seq = String(i).padStart(4, '0');
    const area = processAreas[i % processAreas.length];
    const model = models[i % models.length];
    const vendor = vendors[i % vendors.length];
    const unit = units[i % units.length];
    const team = teams[i % teams.length];
    const status = statuses[i % statuses.length];

    list.push({
      id: `MTH-${seq}`,
      methodCode: `MTH-${seq}`,
      methodName: `${area.split(' ')[0]} ${model.split(' ')[0]} 표준 분석법 #${seq}`,
      processArea: area,
      equipmentModel: model,
      vendor,
      defaultUnit: unit,
      standardTatHours: (i % 8) + 2,
      ownerTeam: team,
      updatedAt: `2026-11-${String((i % 20) + 1).padStart(2, '0')}`,
      status,
      description: `${vendor} ${model} 장비를 활용한 양산 표준 분석 프로토콜`,
    });
  }
  return list;
}

export const flatDbTableDomainConfig: FlatTableDomainConfig<FlatAnalysisMethodRecord> = {
  domainKey: 'flat-db-analysis-method',
  dbTableName: 'TB_ANALYSIS_METHOD_MST',
  title: '분석 기법 · 계측 장비 DB 마스터 테이블 관리',
  subtitle:
    '트리 구조 없이 단일 RDB 테이블을 다중 조건(공정 구분, 제조사, 담당팀, 상태)으로 조회·페이징·일괄 관리하는 표준 CRUD 템플릿',
  items: generateFlatDbTableRecords(340),
  searchKeys: ['methodCode', 'methodName', 'equipmentModel', 'vendor', 'ownerTeam'],
  selectFilters: [
    {
      fieldKey: 'processArea',
      label: '공정 구분',
      options: [
        { label: 'LITHO (노광)', value: 'LITHO (노광)' },
        { label: 'ETCH (식각)', value: 'ETCH (식각)' },
        { label: 'THIN-FILM (박막)', value: 'THIN-FILM (박막)' },
        { label: 'CMP (연마)', value: 'CMP (연마)' },
        { label: 'CLEAN (세정)', value: 'CLEAN (세정)' },
      ],
    },
    {
      fieldKey: 'vendor',
      label: '장비 제조사',
      options: [
        { label: 'Hitachi High-Tech', value: 'Hitachi High-Tech' },
        { label: 'KLA Corporation', value: 'KLA Corporation' },
        { label: 'Applied Materials', value: 'Applied Materials' },
        { label: 'ASML', value: 'ASML' },
        { label: 'Thermo Fisher', value: 'Thermo Fisher' },
        { label: 'Bruker', value: 'Bruker' },
      ],
    },
    {
      fieldKey: 'ownerTeam',
      label: '담당 부서',
      options: [
        { label: '선행계측기술팀', value: '선행계측기술팀' },
        { label: '소자분석1팀', value: '소자분석1팀' },
        { label: '수율분석파트', value: '수율분석파트' },
        { label: '품질보증분석팀', value: '품질보증분석팀' },
      ],
    },
  ],
  statusFilterConfig: {
    fieldKey: 'status',
    options: [
      { label: '사용중(Active)', value: 'ACTIVE' },
      { label: '교정중(Calib)', value: 'CALIBRATION' },
      { label: '미사용(Inactive)', value: 'INACTIVE' },
    ],
  },
  statMetrics: [
    {
      label: '전체 레코드',
      badgeVariant: 'neutral',
      computeValue: (all) => `${all.length.toLocaleString()}건`,
    },
    {
      label: '사용중(Active)',
      badgeVariant: 'teal',
      computeValue: (all) =>
        `${all.filter((r) => r.status === 'ACTIVE').length.toLocaleString()}건`,
    },
    {
      label: '교정중(Calib)',
      badgeVariant: 'orange',
      computeValue: (all) =>
        `${all.filter((r) => r.status === 'CALIBRATION').length.toLocaleString()}건`,
    },
  ],
  columns: [
    {
      key: 'methodCode',
      header: '분석기법 코드 (PK)',
      width: pixel(150),
      sortable: true,
    },
    {
      key: 'methodName',
      header: '표준 분석기법 명칭',
      width: proportional(1.6, { minWidth: 220 }),
      sortable: true,
    },
    {
      key: 'processArea',
      header: '공정 구분',
      width: pixel(140),
      sortable: true,
    },
    {
      key: 'equipmentModel',
      header: '표준 계측 장비 모델',
      width: proportional(1.1, { minWidth: 160 }),
      sortable: true,
    },
    {
      key: 'vendor',
      header: '제조사',
      width: pixel(145),
      sortable: true,
    },
    {
      key: 'defaultUnit',
      header: '기본 단위',
      width: pixel(95),
      align: 'center',
    },
    {
      key: 'standardTatHours',
      header: '표준 TAT(시간)',
      width: pixel(115),
      align: 'end',
      sortable: true,
    },
    {
      key: 'ownerTeam',
      header: '담당 부서',
      width: pixel(130),
      sortable: true,
    },
    {
      key: 'updatedAt',
      header: '최종 수정일',
      width: pixel(110),
      align: 'center',
      sortable: true,
    },
    {
      key: 'status',
      header: '사용 상태',
      width: pixel(115),
      align: 'center',
      sortable: true,
    },
  ],
  formSchema: [
    {
      key: 'methodCode',
      label: '분석기법 코드 (Primary Key)',
      type: 'text',
      required: true,
      readOnlyOnEdit: true,
      placeholder: '예: MTH-0341',
      section: '1. DB 레코드 식별 정보',
    },
    {
      key: 'methodName',
      label: '표준 분석기법 명칭',
      type: 'text',
      required: true,
      placeholder: '예: LITHO CG6300 표준 분석법',
      section: '1. DB 레코드 식별 정보',
    },
    {
      key: 'processArea',
      label: '적용 공정 구분',
      type: 'select',
      required: true,
      options: [
        { label: 'LITHO (노광)', value: 'LITHO (노광)' },
        { label: 'ETCH (식각)', value: 'ETCH (식각)' },
        { label: 'THIN-FILM (박막)', value: 'THIN-FILM (박막)' },
        { label: 'CMP (연마)', value: 'CMP (연마)' },
        { label: 'CLEAN (세정)', value: 'CLEAN (세정)' },
      ],
      section: '1. DB 레코드 식별 정보',
    },
    {
      key: 'equipmentModel',
      label: '표준 계측 장비 모델명',
      type: 'text',
      required: true,
      placeholder: '예: CG6300 CD-SEM',
      section: '2. 계측 장비 및 단위 스펙',
    },
    {
      key: 'vendor',
      label: '장비 제조사 (Vendor)',
      type: 'select',
      required: true,
      options: [
        { label: 'Hitachi High-Tech', value: 'Hitachi High-Tech' },
        { label: 'KLA Corporation', value: 'KLA Corporation' },
        { label: 'Applied Materials', value: 'Applied Materials' },
        { label: 'ASML', value: 'ASML' },
        { label: 'Thermo Fisher', value: 'Thermo Fisher' },
        { label: 'Bruker', value: 'Bruker' },
      ],
      section: '2. 계측 장비 및 단위 스펙',
    },
    {
      key: 'defaultUnit',
      label: '기본 측정 단위',
      type: 'select',
      required: true,
      options: [
        { label: 'nm', value: 'nm' },
        { label: 'Å', value: 'Å' },
        { label: 'µm', value: 'µm' },
        { label: 'E9 atoms/cm²', value: 'E9 atoms/cm²' },
        { label: '%', value: '%' },
      ],
      section: '2. 계측 장비 및 단위 스펙',
    },
    {
      key: 'standardTatHours',
      label: '표준 분석 소요시간 (TAT)',
      type: 'number',
      units: '시간(hr)',
      step: 1,
      min: 1,
      required: true,
      section: '2. 계측 장비 및 단위 스펙',
    },
    {
      key: 'ownerTeam',
      label: '관리 담당 부서',
      type: 'select',
      required: true,
      options: [
        { label: '선행계측기술팀', value: '선행계측기술팀' },
        { label: '소자분석1팀', value: '소자분석1팀' },
        { label: '수율분석파트', value: '수율분석파트' },
        { label: '품질보증분석팀', value: '품질보증분석팀' },
      ],
      section: '3. 운영 부서 및 상태',
    },
    {
      key: 'status',
      label: '사용 상태',
      type: 'select',
      required: true,
      options: [
        { label: 'ACTIVE (정상 사용)', value: 'ACTIVE' },
        { label: 'CALIBRATION (교정/점검중)', value: 'CALIBRATION' },
        { label: 'INACTIVE (사용 중지)', value: 'INACTIVE' },
      ],
      section: '3. 운영 부서 및 상태',
    },
    {
      key: 'description',
      label: '상세 설명 / 비고',
      type: 'textarea',
      section: '3. 운영 부서 및 상태',
    },
  ],
  createDefaultItem: (currentCount) => {
    const seq = String(currentCount + 1).padStart(4, '0');
    return {
      id: `MTH-${seq}`,
      methodCode: `MTH-${seq}`,
      methodName: `신규 표준 분석기법 #${seq}`,
      processArea: 'LITHO (노광)',
      equipmentModel: 'CG6300 CD-SEM',
      vendor: 'Hitachi High-Tech',
      defaultUnit: 'nm',
      standardTatHours: 4,
      ownerTeam: '선행계측기술팀',
      updatedAt: '2026-11-21',
      status: 'ACTIVE',
      description: '',
    };
  },
};



