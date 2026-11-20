import { useState, useMemo } from 'react';
import {
  Layout,
  LayoutPanel,
  LayoutContent,
} from '@astryxdesign/core/Layout';
import { useResizable, ResizeHandle } from '@astryxdesign/core/Resizable';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { Badge } from '@astryxdesign/core/Badge';
import { TextInput } from '@astryxdesign/core/TextInput';
import { NumberInput } from '@astryxdesign/core/NumberInput';
import { Selector } from '@astryxdesign/core/Selector';
import {
  SegmentedControl,
  SegmentedControlItem,
} from '@astryxdesign/core/SegmentedControl';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { StackItem } from '@astryxdesign/core/Stack';
import { Card } from '@astryxdesign/core/Card';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { useToast } from '@astryxdesign/core/Toast';
import {
  Sliders,
  Plus,
  Save,
  Trash2,
  ArrowRight,
  ArrowLeft,
  ChevronsRight,
  ChevronsLeft,
  CheckCircle2,
  AlertCircle,
  Layers,
} from 'lucide-react';

import type {
  SpecWorkbenchDomainConfig,
  WorkbenchSpecRule,
  WorkbenchPoolItem,
} from './types';

export interface SpecWorkbenchCrudTemplateProps {
  config: SpecWorkbenchDomainConfig;
}

const SHUTTLE_ROW_HEIGHT = 36;
const SHUTTLE_OVERSCAN = 10;

/**
 * [템플릿 3: 마스터-디테일 상하 분할 워크벤치 & 대량 아이템 셔틀(Dual-List Shuttle) 매핑 템플릿]
 * 1, 2번(좌측 트리 + 우측 단일 테이블)과 완전히 다른 형식의 레이아웃입니다.
 * - 좌측 패널: 공정 카테고리 필터 + 분석 규격(Spec Rule) 카드 카탈로그 리스트
 * - 우측 상단(Master Form & Visual Spec Gauge):
 *   선택한 분석기법/규격 자체의 마스터 정보(분석기법, LSL, Target, USL, 단위, 상태)를 즉시 편집하고
 *   실시간 허용 오차 밴드(Spec Tolerance Gauge)로 시각화
 * - 우측 하단(Dual-List Item Shuttle):
 *   좌측의 '전체 미할당 아이템 풀(수천 개)'과 우측의 '현재 규격에 적용된 아이템(수천 개)' 사이에서
 *   검색 필터링 후 [할당 ➔] / [⬅ 해제] 및 특정 아이템의 예외(Override) USL/LSL을 지정
 */
export function SpecWorkbenchCrudTemplate({
  config,
}: SpecWorkbenchCrudTemplateProps) {
  const toast = useToast();

  // 1. 좌측 규격 카탈로그 상태
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('ALL');
  const [catalogSearch, setCatalogSearch] = useState<string>('');
  const [rules, setRules] = useState<WorkbenchSpecRule[]>(config.rules);
  const [selectedRuleId, setSelectedRuleId] = useState<string>(
    config.rules[0]?.id ?? ''
  );

  // 2. 우측 상단: 현재 선택된 규격(Rule) 마스터 편집 Draft 상태
  const currentRule = useMemo(
    () => rules.find((r) => r.id === selectedRuleId) ?? null,
    [rules, selectedRuleId]
  );

  // 3. 전체 아이템 풀(수천 개) 및 규격별 매핑(RuleId -> Set<ItemId>) 상태
  const [poolItems, setPoolItems] = useState<WorkbenchPoolItem[]>(
    config.allPoolItems
  );
  const [ruleItemMap, setRuleItemMap] = useState<Record<string, Set<string>>>(
    () => {
      const next: Record<string, Set<string>> = {};
      for (const [rId, itemIds] of Object.entries(config.initialRuleItemMap)) {
        next[rId] = new Set(itemIds);
      }
      return next;
    }
  );

  // 4. 하단 Dual-List Shuttle 검색 및 체크박스 선택 상태
  const [unassignedSearch, setUnassignedSearch] = useState('');
  const [unassignedFamilyFilter, setUnassignedFamilyFilter] = useState('ALL');
  const [assignedSearch, setAssignedSearch] = useState('');

  const [checkedUnassignedIds, setCheckedUnassignedIds] = useState<Set<string>>(
    new Set()
  );
  const [checkedAssignedIds, setCheckedAssignedIds] = useState<Set<string>>(
    new Set()
  );

  // 5. 좌/우 셔틀 리스트 가상 스크롤(Virtualization) 상태
  const [leftScrollTop, setLeftScrollTop] = useState(0);
  const [rightScrollTop, setRightScrollTop] = useState(0);
  const shuttleViewportHeight = 320;

  // 좌측 카탈로그 패널 리사이즈
  const catalogResizable = useResizable({
    defaultSize: 330,
    minSize: 260,
    maxSize: 460,
    collapsible: true,
    autoSaveId: `wb-catalog-${config.domainKey}`,
  });

  // 좌측 규격 카탈로그 필터링
  const filteredRules = useMemo(() => {
    const q = catalogSearch.trim().toLowerCase();
    return rules.filter((r) => {
      if (selectedCategoryId !== 'ALL' && r.categoryId !== selectedCategoryId) {
        return false;
      }
      if (q) {
        return (
          r.ruleCode.toLowerCase().includes(q) ||
          r.ruleName.toLowerCase().includes(q) ||
          r.analysisMethod.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [rules, selectedCategoryId, catalogSearch]);

  // 현재 선택된 규격에 할당된 아이템 Set
  const currentAssignedSet = useMemo(
    () => ruleItemMap[selectedRuleId] ?? new Set<string>(),
    [ruleItemMap, selectedRuleId]
  );

  // 좌측 셔틀: 미할당(Unassigned) 아이템 목록 필터링
  const unassignedItems = useMemo(() => {
    const q = unassignedSearch.trim().toLowerCase();
    return poolItems.filter((item) => {
      if (currentAssignedSet.has(item.id)) return false;
      if (
        unassignedFamilyFilter !== 'ALL' &&
        item.productFamily !== unassignedFamilyFilter
      ) {
        return false;
      }
      if (q) {
        return (
          item.itemCode.toLowerCase().includes(q) ||
          item.itemName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [poolItems, currentAssignedSet, unassignedSearch, unassignedFamilyFilter]);

  // 우측 셔틀: 현재 규격에 할당된(Assigned) 아이템 목록 필터링
  const assignedItems = useMemo(() => {
    const q = assignedSearch.trim().toLowerCase();
    return poolItems.filter((item) => {
      if (!currentAssignedSet.has(item.id)) return false;
      if (q) {
        return (
          item.itemCode.toLowerCase().includes(q) ||
          item.itemName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [poolItems, currentAssignedSet, assignedSearch]);

  // 좌측 셔틀 가상 스크롤 슬라이싱
  const leftStartIdx = Math.max(
    0,
    Math.floor(leftScrollTop / SHUTTLE_ROW_HEIGHT) - SHUTTLE_OVERSCAN
  );
  const leftEndIdx = Math.min(
    unassignedItems.length,
    Math.ceil((leftScrollTop + shuttleViewportHeight) / SHUTTLE_ROW_HEIGHT) +
      SHUTTLE_OVERSCAN
  );
  const leftWindowRows = unassignedItems.slice(leftStartIdx, leftEndIdx);

  // 우측 셔틀 가상 스크롤 슬라이싱
  const rightStartIdx = Math.max(
    0,
    Math.floor(rightScrollTop / SHUTTLE_ROW_HEIGHT) - SHUTTLE_OVERSCAN
  );
  const rightEndIdx = Math.min(
    assignedItems.length,
    Math.ceil((rightScrollTop + shuttleViewportHeight) / SHUTTLE_ROW_HEIGHT) +
      SHUTTLE_OVERSCAN
  );
  const rightWindowRows = assignedItems.slice(rightStartIdx, rightEndIdx);

  // 상단 마스터 규격 필드 즉시 업데이트
  const handleUpdateCurrentRuleField = <K extends keyof WorkbenchSpecRule>(
    key: K,
    value: WorkbenchSpecRule[K]
  ) => {
    if (!currentRule) return;
    setRules((prev) =>
      prev.map((r) => (r.id === currentRule.id ? { ...r, [key]: value } : r))
    );
  };

  // 신규 분석기법 규격(Spec Rule) 추가
  const handleCreateNewRule = () => {
    const seq = String(rules.length + 1).padStart(2, '0');
    const newId = `rule-${Date.now()}`;
    const defaultCat =
      selectedCategoryId !== 'ALL'
        ? selectedCategoryId
        : config.categories[0]?.id ?? 'cat-feol';

    const newRule: WorkbenchSpecRule = {
      id: newId,
      categoryId: defaultCat,
      ruleCode: `SPEC-NEW-${seq}`,
      ruleName: `신규 분석 규격 #${seq}`,
      analysisMethod: config.methodOptions[0]?.value ?? 'CD-SEM',
      lsl: 12.0,
      target: 14.0,
      usl: 16.0,
      unit: config.unitOptions[0]?.value ?? 'nm',
      status: 'DRAFT',
      description: '신규 생성된 분석 기법 및 상·하한 규격 마스터',
    };

    setRules((prev) => [newRule, ...prev]);
    setRuleItemMap((prev) => ({ ...prev, [newId]: new Set() }));
    setSelectedRuleId(newId);
    toast({
      body: `신규 분석 규격 [${newRule.ruleCode}]이 생성되었습니다. 우측 상단에서 USL/LSL을 설정하고 하단에서 대상 아이템을 할당하세요.`,
    });
  };

  // 현재 규격 삭제
  const handleDeleteCurrentRule = () => {
    if (!currentRule) return;
    const next = rules.filter((r) => r.id !== currentRule.id);
    setRules(next);
    if (next[0]) setSelectedRuleId(next[0].id);
    toast({
      body: `분석 규격 [${currentRule.ruleCode}]이 삭제되었습니다.`,
    });
  };

  // 셔틀 액션 1: 선택한 미할당 아이템 -> 현재 규격에 할당 (Assign Selected)
  const handleAssignSelected = () => {
    if (!currentRule || checkedUnassignedIds.size === 0) return;
    const count = checkedUnassignedIds.size;
    setRuleItemMap((prev) => {
      const nextSet = new Set(prev[currentRule.id] ?? []);
      checkedUnassignedIds.forEach((id) => nextSet.add(id));
      return { ...prev, [currentRule.id]: nextSet };
    });
    setCheckedUnassignedIds(new Set());
    toast({
      body: `${count.toLocaleString()}개 아이템이 [${currentRule.ruleName}] 적용 대상으로 할당되었습니다.`,
    });
  };

  // 셔틀 액션 2: 현재 필터링된 미할당 아이템 전체 -> 일괄 할당 (Assign All Filtered)
  const handleAssignAllFiltered = () => {
    if (!currentRule || unassignedItems.length === 0) return;
    const count = unassignedItems.length;
    setRuleItemMap((prev) => {
      const nextSet = new Set(prev[currentRule.id] ?? []);
      unassignedItems.forEach((item) => nextSet.add(item.id));
      return { ...prev, [currentRule.id]: nextSet };
    });
    setCheckedUnassignedIds(new Set());
    toast({
      body: `검색된 ${count.toLocaleString()}개 아이템 전체가 [${currentRule.ruleName}]에 일괄 할당되었습니다.`,
    });
  };

  // 셔틀 액션 3: 선택한 할당 아이템 -> 적용 해제 (Unassign Selected)
  const handleUnassignSelected = () => {
    if (!currentRule || checkedAssignedIds.size === 0) return;
    const count = checkedAssignedIds.size;
    setRuleItemMap((prev) => {
      const nextSet = new Set(prev[currentRule.id] ?? []);
      checkedAssignedIds.forEach((id) => nextSet.delete(id));
      return { ...prev, [currentRule.id]: nextSet };
    });
    setCheckedAssignedIds(new Set());
    toast({
      body: `${count.toLocaleString()}개 아이템이 [${currentRule.ruleName}] 적용 대상에서 해제되었습니다.`,
    });
  };

  // 셔틀 액션 4: 필터링된 할당 아이템 전체 -> 일괄 해제 (Unassign All Filtered)
  const handleUnassignAllFiltered = () => {
    if (!currentRule || assignedItems.length === 0) return;
    const count = assignedItems.length;
    setRuleItemMap((prev) => {
      const nextSet = new Set(prev[currentRule.id] ?? []);
      assignedItems.forEach((item) => nextSet.delete(item.id));
      return { ...prev, [currentRule.id]: nextSet };
    });
    setCheckedAssignedIds(new Set());
    toast({
      body: `${count.toLocaleString()}개 아이템이 일괄 해제되었습니다.`,
    });
  };

  // 할당된 특정 아이템의 예외(Override) LSL / USL 업데이트
  const handleUpdateItemOverride = (
    itemId: string,
    field: 'overrideLsl' | 'overrideUsl',
    rawVal: string
  ) => {
    const parsed = rawVal.trim() === '' ? null : Number(rawVal);
    setPoolItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, [field]: Number.isNaN(parsed) ? null : parsed }
          : item
      )
    );
  };

  // 규격 유효성 검사 (LSL <= Target <= USL)
  const isSpecValid =
    currentRule != null &&
    currentRule.lsl <= currentRule.target &&
    currentRule.target <= currentRule.usl;

  const specBandwidth =
    currentRule != null
      ? Number((currentRule.usl - currentRule.lsl).toFixed(4))
      : 0;

  return (
    <Layout
      height="fill"
      defaultHasDividers
      start={
        <>
          <LayoutPanel
            resizable={catalogResizable}
            role="navigation"
            label="분석기법 및 규격 카탈로그"
            padding={3}
          >
            <div className="crud-tree-panel-scroll">
              <VStack gap={3} style={{ height: '100%' }}>
                {/* 좌측 헤더 */}
                <HStack gap={2} vAlign="center" hAlign="between">
                  <HStack gap={1.5} vAlign="center">
                    <Sliders size={16} />
                    <Heading level={3}>분석 규격 카탈로그</Heading>
                  </HStack>
                  <Button
                    label="+ 신규 규격"
                    size="sm"
                    variant="primary"
                    icon={<Plus size={14} />}
                    onClick={handleCreateNewRule}
                  />
                </HStack>

                {/* 공정군 카테고리 세그먼트 필터 */}
                <SegmentedControl
                  label="공정군 분류 필터"
                  size="sm"
                  layout="fill"
                  value={selectedCategoryId}
                  onChange={setSelectedCategoryId}
                >
                  <SegmentedControlItem value="ALL" label="전체" />
                  {config.categories.map((cat) => (
                    <SegmentedControlItem
                      key={cat.id}
                      value={cat.id}
                      label={cat.code}
                    />
                  ))}
                </SegmentedControl>

                {/* 규격 카탈로그 검색 */}
                <TextInput
                  type="search"
                  label="규격 검색"
                  isLabelHidden
                  placeholder="분석기법, 규격코드, 명칭 검색..."
                  value={catalogSearch}
                  onChange={setCatalogSearch}
                  size="sm"
                  width="100%"
                />

                {/* 규격(Rule) 카드 리스트 */}
                <StackItem size="fill" isScrollable>
                  {filteredRules.length > 0 ? (
                    <div className="wb-catalog-list">
                      {filteredRules.map((rule) => {
                        const isSelected = rule.id === selectedRuleId;
                        const mappedCount =
                          ruleItemMap[rule.id]?.size ?? 0;

                        return (
                          <div
                            key={rule.id}
                            className={`wb-rule-card ${
                              isSelected ? 'is-selected' : ''
                            }`}
                            onClick={() => {
                              setSelectedRuleId(rule.id);
                              setCheckedUnassignedIds(new Set());
                              setCheckedAssignedIds(new Set());
                            }}
                          >
                            <VStack gap={1}>
                              <HStack
                                gap={1.5}
                                vAlign="center"
                                hAlign="between"
                              >
                                <HStack gap={1.5} vAlign="center">
                                  <Badge
                                    variant="blue"
                                    label={rule.analysisMethod}
                                  />
                                  <Text type="supporting" color="secondary">
                                    {rule.ruleCode}
                                  </Text>
                                </HStack>
                                <Badge
                                  variant={
                                    rule.status === 'ACTIVE'
                                      ? 'teal'
                                      : 'neutral'
                                  }
                                  label={`${mappedCount.toLocaleString()} 아이템`}
                                />
                              </HStack>

                              <Text type="body" weight="semibold">
                                {rule.ruleName}
                              </Text>

                              <HStack
                                gap={2}
                                vAlign="center"
                                hAlign="between"
                              >
                                <Text type="supporting" color="secondary">
                                  LSL <strong>{rule.lsl}</strong> · Target{' '}
                                  <strong>{rule.target}</strong> · USL{' '}
                                  <strong>{rule.usl}</strong> ({rule.unit})
                                </Text>
                              </HStack>
                            </VStack>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <EmptyState
                      isCompact
                      title="일치하는 분석 규격 없음"
                      description="검색어를 초기화하거나 [+ 신규 규격]을 추가하세요."
                    />
                  )}
                </StackItem>
              </VStack>
            </div>
          </LayoutPanel>
          <ResizeHandle
            resizable={catalogResizable}
            direction="horizontal"
            hasDivider
            label="카탈로그 패널 크기 조절"
          />
        </>
      }
      content={
        <LayoutContent isScrollable={false} padding={4}>
          {currentRule ? (
            <VStack gap={3} style={{ height: '100%', minHeight: 0 }}>
              {/* =================================================================
                  [상단 영역] 선택한 분석기법 & USL/Target/LSL 마스터 편집 폼 + 시각적 스펙 게이지
                  ================================================================= */}
              <Card padding={3}>
                <VStack gap={3}>
                  {/* 상단 타이틀 & 저장 버튼 */}
                  <HStack gap={2} vAlign="center" hAlign="between">
                    <HStack gap={2} vAlign="center">
                      {catalogResizable.isCollapsed && (
                        <Button
                          label="카탈로그 펼치기"
                          size="sm"
                          variant="secondary"
                          onClick={() => catalogResizable.expand()}
                        />
                      )}
                      <Heading level={2}>{currentRule.ruleName}</Heading>
                      <Badge variant="purple" label="상하 분할 워크벤치 & 셔틀 매핑" />
                      {isSpecValid ? (
                        <Badge
                          variant="teal"
                          label={`허용 폭(Δ): ±${(specBandwidth / 2).toFixed(2)} ${currentRule.unit}`}
                        />
                      ) : (
                        <Badge
                          variant="error"
                          label="규격 역전 오류 (LSL ≤ Target ≤ USL 확인)"
                        />
                      )}
                    </HStack>

                    <HStack gap={1.5}>
                      <Button
                        label="규격 삭제"
                        size="sm"
                        variant="destructive"
                        icon={<Trash2 size={14} />}
                        onClick={handleDeleteCurrentRule}
                      />
                      <Button
                        label="규격 및 매핑 저장"
                        size="sm"
                        variant="primary"
                        icon={<Save size={14} />}
                        onClick={() =>
                          toast({
                            body: `[${currentRule.ruleCode}] 분석기법 규격(LSL:${currentRule.lsl} / USL:${currentRule.usl}) 및 매핑 아이템 ${currentAssignedSet.size.toLocaleString()}건이 저장되었습니다.`,
                          })
                        }
                      />
                    </HStack>
                  </HStack>

                  {/* 마스터 입력 폼 그리드 (한눈에 들어오는 2줄 구성) */}
                  <HStack gap={3} vAlign="end">
                    <StackItem size="fill">
                      <TextInput
                        label="규격 코드 (Spec ID)"
                        size="sm"
                        value={currentRule.ruleCode}
                        onChange={(v) =>
                          handleUpdateCurrentRuleField('ruleCode', v)
                        }
                        width="100%"
                      />
                    </StackItem>
                    <StackItem size="fill">
                      <TextInput
                        label="분석 규격 명칭"
                        size="sm"
                        value={currentRule.ruleName}
                        onChange={(v) =>
                          handleUpdateCurrentRuleField('ruleName', v)
                        }
                        width="100%"
                      />
                    </StackItem>
                    <StackItem size="fill">
                      <Selector
                        label="사용할 분석 기법 (Analysis Method)"
                        size="sm"
                        options={config.methodOptions}
                        value={currentRule.analysisMethod}
                        onChange={(v) =>
                          handleUpdateCurrentRuleField('analysisMethod', v)
                        }
                        width="100%"
                      />
                    </StackItem>
                    <StackItem size="static">
                      <Selector
                        label="운영 상태"
                        size="sm"
                        options={[
                          { label: 'ACTIVE (양산 적용)', value: 'ACTIVE' },
                          { label: 'DRAFT (검토중)', value: 'DRAFT' },
                          { label: 'DEPRECATED (폐기)', value: 'DEPRECATED' },
                        ]}
                        value={currentRule.status}
                        onChange={(v) =>
                          handleUpdateCurrentRuleField(
                            'status',
                            v as WorkbenchSpecRule['status']
                          )
                        }
                        width={165}
                      />
                    </StackItem>
                  </HStack>

                  {/* USL / Target / LSL 수치 입력 + 우측 실시간 스펙 밴드 게이지 */}
                  <HStack gap={3} vAlign="center">
                    <HStack gap={2} style={{ flex: 1.1 }}>
                      <StackItem size="fill">
                        <NumberInput
                          label="LSL (하한 규격)"
                          size="sm"
                          value={currentRule.lsl}
                          onChange={(v) =>
                            handleUpdateCurrentRuleField('lsl', v)
                          }
                          step={0.1}
                          hasNumberSteppers
                          status={
                            !isSpecValid
                              ? { type: 'error', message: 'LSL ≤ Target' }
                              : undefined
                          }
                          width="100%"
                        />
                      </StackItem>
                      <StackItem size="fill">
                        <NumberInput
                          label="Target (목표 중심값)"
                          size="sm"
                          value={currentRule.target}
                          onChange={(v) =>
                            handleUpdateCurrentRuleField('target', v)
                          }
                          step={0.1}
                          hasNumberSteppers
                          width="100%"
                        />
                      </StackItem>
                      <StackItem size="fill">
                        <NumberInput
                          label="USL (상한 규격)"
                          size="sm"
                          value={currentRule.usl}
                          onChange={(v) =>
                            handleUpdateCurrentRuleField('usl', v)
                          }
                          step={0.1}
                          hasNumberSteppers
                          status={
                            !isSpecValid
                              ? { type: 'error', message: 'Target ≤ USL' }
                              : undefined
                          }
                          width="100%"
                        />
                      </StackItem>
                      <StackItem size="static">
                        <Selector
                          label="단위 (Unit)"
                          size="sm"
                          options={config.unitOptions}
                          value={currentRule.unit}
                          onChange={(v) =>
                            handleUpdateCurrentRuleField('unit', v)
                          }
                          width={110}
                        />
                      </StackItem>
                    </HStack>

                    {/* 시각적 USL / Target / LSL Tolerance Band 프리뷰 */}
                    <div className="wb-gauge-box" style={{ flex: 0.9 }}>
                      <HStack gap={2} vAlign="center" hAlign="between">
                        <HStack gap={1} vAlign="center">
                          {isSpecValid ? (
                            <CheckCircle2 size={14} color="#10b981" />
                          ) : (
                            <AlertCircle size={14} color="#ef4444" />
                          )}
                          <Text type="supporting" weight="semibold">
                            Spec Tolerance Band ({currentRule.analysisMethod})
                          </Text>
                        </HStack>
                        <Text type="supporting" color="secondary">
                          Out-of-Spec 임계 구간 시각화
                        </Text>
                      </HStack>
                      <div className="wb-gauge-track">
                        <div
                          className="wb-gauge-marker is-lsl"
                          title={`LSL: ${currentRule.lsl}`}
                        />
                        <div
                          className="wb-gauge-marker is-target"
                          title={`Target: ${currentRule.target}`}
                        />
                        <div
                          className="wb-gauge-marker is-usl"
                          title={`USL: ${currentRule.usl}`}
                        />
                      </div>
                      <HStack gap={2} vAlign="center" hAlign="between">
                        <Text type="supporting" color="secondary">
                          LSL: <strong>{currentRule.lsl}</strong> {currentRule.unit}
                        </Text>
                        <Text type="supporting" color="secondary">
                          Target: <strong>{currentRule.target}</strong>{' '}
                          {currentRule.unit}
                        </Text>
                        <Text type="supporting" color="secondary">
                          USL: <strong>{currentRule.usl}</strong> {currentRule.unit}
                        </Text>
                      </HStack>
                    </div>
                  </HStack>
                </VStack>
              </Card>

              {/* =================================================================
                  [하단 영역] 수천 개 아이템 Dual-List Shuttle (미할당 풀 <-> 규격 적용 대상 매핑)
                  ================================================================= */}
              <div className="wb-shuttle-grid">
                {/* 좌측 셔틀 박스: 전체 미할당 아이템 풀 */}
                <div className="wb-shuttle-pane">
                  <div className="wb-shuttle-pane-header">
                    <VStack gap={2}>
                      <HStack gap={2} vAlign="center" hAlign="between">
                        <HStack gap={1.5} vAlign="center">
                          <Layers size={15} />
                          <Heading level={4}>
                            전체 미할당 아이템 풀 (Unassigned Pool)
                          </Heading>
                        </HStack>
                        <Badge
                          variant="neutral"
                          label={`${unassignedItems.length.toLocaleString()}건 대기`}
                        />
                      </HStack>
                      <HStack gap={2}>
                        <StackItem size="fill">
                          <TextInput
                            type="search"
                            label="미할당 아이템 검색"
                            isLabelHidden
                            placeholder="아이템 코드 또는 명칭 검색..."
                            value={unassignedSearch}
                            onChange={setUnassignedSearch}
                            size="sm"
                            width="100%"
                          />
                        </StackItem>
                        <SegmentedControl
                          label="제품군 필터"
                          size="sm"
                          value={unassignedFamilyFilter}
                          onChange={setUnassignedFamilyFilter}
                        >
                          <SegmentedControlItem value="ALL" label="전체" />
                          {config.productFamilyOptions.map((opt) => (
                            <SegmentedControlItem
                              key={opt.value}
                              value={opt.value}
                              label={opt.label}
                            />
                          ))}
                        </SegmentedControl>
                      </HStack>
                    </VStack>
                  </div>

                  {/* 미할당 가상 스크롤 리스트 */}
                  <div
                    className="wb-shuttle-list-viewport"
                    onScroll={(e) =>
                      setLeftScrollTop(e.currentTarget.scrollTop)
                    }
                  >
                    <div
                      style={{
                        height: unassignedItems.length * SHUTTLE_ROW_HEIGHT,
                        position: 'relative',
                      }}
                    >
                      <div
                        style={{
                          transform: `translateY(${
                            leftStartIdx * SHUTTLE_ROW_HEIGHT
                          }px)`,
                        }}
                      >
                        {leftWindowRows.map((item) => {
                          const isChecked = checkedUnassignedIds.has(item.id);
                          return (
                            <div
                              key={item.id}
                              className={`wb-shuttle-row ${
                                isChecked ? 'is-checked' : ''
                              }`}
                              onClick={() => {
                                setCheckedUnassignedIds((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(item.id)) next.delete(item.id);
                                  else next.add(item.id);
                                  return next;
                                });
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}}
                                aria-label={item.itemCode}
                              />
                              <Badge
                                variant="neutral"
                                label={item.productFamily}
                              />
                              <Text type="body" weight="semibold">
                                {item.itemCode}
                              </Text>
                              <Text
                                type="supporting"
                                color="secondary"
                                maxLines={1}
                              >
                                {item.itemName}
                              </Text>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 중앙 셔틀 이동 버튼 컬럼 */}
                <div className="wb-shuttle-center-controls">
                  <Button
                    label={`선택 할당 (${checkedUnassignedIds.size})`}
                    size="sm"
                    variant="primary"
                    icon={<ArrowRight size={14} />}
                    isDisabled={checkedUnassignedIds.size === 0}
                    onClick={handleAssignSelected}
                  />
                  <Button
                    label="필터 전체 할당"
                    size="sm"
                    variant="secondary"
                    icon={<ChevronsRight size={14} />}
                    isDisabled={unassignedItems.length === 0}
                    onClick={handleAssignAllFiltered}
                  />
                  <div style={{ height: 12 }} />
                  <Button
                    label={`선택 해제 (${checkedAssignedIds.size})`}
                    size="sm"
                    variant="secondary"
                    icon={<ArrowLeft size={14} />}
                    isDisabled={checkedAssignedIds.size === 0}
                    onClick={handleUnassignSelected}
                  />
                  <Button
                    label="전체 해제"
                    size="sm"
                    variant="ghost"
                    icon={<ChevronsLeft size={14} />}
                    isDisabled={assignedItems.length === 0}
                    onClick={handleUnassignAllFiltered}
                  />
                </div>

                {/* 우측 셔틀 박스: 이 분석기법/규격이 적용된 아이템 (수천 개 가능 + 개별 예외 USL/LSL 지원) */}
                <div className="wb-shuttle-pane">
                  <div className="wb-shuttle-pane-header">
                    <VStack gap={2}>
                      <HStack gap={2} vAlign="center" hAlign="between">
                        <HStack gap={1.5} vAlign="center">
                          <CheckCircle2 size={15} color="#10b981" />
                          <Heading level={4}>
                            [{currentRule.analysisMethod}] 규격 적용 아이템
                          </Heading>
                        </HStack>
                        <Badge
                          variant="teal"
                          label={`${assignedItems.length.toLocaleString()}건 적용됨`}
                        />
                      </HStack>
                      <HStack gap={2} vAlign="center" hAlign="between">
                        <StackItem size="fill">
                          <TextInput
                            type="search"
                            label="적용 아이템 검색"
                            isLabelHidden
                            placeholder="적용된 아이템 내 검색..."
                            value={assignedSearch}
                            onChange={setAssignedSearch}
                            size="sm"
                            width="100%"
                          />
                        </StackItem>
                        <Text type="supporting" color="secondary">
                          우측 입력칸: 아이템별 예외 LSL/USL (비워두면 기본값{' '}
                          {currentRule.lsl}~{currentRule.usl} 적용)
                        </Text>
                      </HStack>
                    </VStack>
                  </div>

                  {/* 할당된 아이템 가상 스크롤 리스트 */}
                  <div
                    className="wb-shuttle-list-viewport"
                    onScroll={(e) =>
                      setRightScrollTop(e.currentTarget.scrollTop)
                    }
                  >
                    <div
                      style={{
                        height: assignedItems.length * SHUTTLE_ROW_HEIGHT,
                        position: 'relative',
                      }}
                    >
                      <div
                        style={{
                          transform: `translateY(${
                            rightStartIdx * SHUTTLE_ROW_HEIGHT
                          }px)`,
                        }}
                      >
                        {rightWindowRows.map((item) => {
                          const isChecked = checkedAssignedIds.has(item.id);
                          const hasOverride =
                            item.overrideLsl != null ||
                            item.overrideUsl != null;

                          return (
                            <div
                              key={item.id}
                              className={`wb-shuttle-row ${
                                isChecked ? 'is-checked' : ''
                              }`}
                              onClick={() => {
                                setCheckedAssignedIds((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(item.id)) next.delete(item.id);
                                  else next.add(item.id);
                                  return next;
                                });
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}}
                                aria-label={item.itemCode}
                              />
                              <Text type="body" weight="semibold">
                                {item.itemCode}
                              </Text>
                              <StackItem size="fill">
                                <Text
                                  type="supporting"
                                  color="secondary"
                                  maxLines={1}
                                >
                                  {item.itemName}
                                </Text>
                              </StackItem>

                              {/* 아이템별 예외(Override) LSL / USL 미니 입력칸 */}
                              <HStack
                                gap={1}
                                vAlign="center"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {hasOverride && (
                                  <Badge variant="orange" label="예외규격" />
                                )}
                                <input
                                  type="number"
                                  step="0.1"
                                  className="wb-override-input"
                                  placeholder={`LSL ${currentRule.lsl}`}
                                  title="아이템 예외 LSL (비워두면 마스터 LSL 상속)"
                                  value={
                                    item.overrideLsl != null
                                      ? String(item.overrideLsl)
                                      : ''
                                  }
                                  onChange={(e) =>
                                    handleUpdateItemOverride(
                                      item.id,
                                      'overrideLsl',
                                      e.target.value
                                    )
                                  }
                                />
                                <span style={{ opacity: 0.4 }}>~</span>
                                <input
                                  type="number"
                                  step="0.1"
                                  className="wb-override-input"
                                  placeholder={`USL ${currentRule.usl}`}
                                  title="아이템 예외 USL (비워두면 마스터 USL 상속)"
                                  value={
                                    item.overrideUsl != null
                                      ? String(item.overrideUsl)
                                      : ''
                                  }
                                  onChange={(e) =>
                                    handleUpdateItemOverride(
                                      item.id,
                                      'overrideUsl',
                                      e.target.value
                                    )
                                  }
                                />
                              </HStack>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </VStack>
          ) : (
            <EmptyState
              title="선택된 분석 규격이 없습니다"
              description="좌측 카탈로그에서 규격을 선택하거나 새로 추가하세요."
            />
          )}
        </LayoutContent>
      }
    />
  );
}
