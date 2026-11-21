import { useState, useMemo, useCallback } from 'react';
import { Layout, LayoutContent } from '@astryxdesign/core/Layout';
import {
  Table,
  TableSelectionToolbar,
  useTableRowsVirtualization,
  useTableSelection,
  useTableSortable,
  type TableSortState,
} from '@astryxdesign/core/Table';
import { Pagination } from '@astryxdesign/core/Pagination';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { Badge } from '@astryxdesign/core/Badge';
import { TextInput } from '@astryxdesign/core/TextInput';
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
  Database,
  Plus,
  Download,
  RotateCcw,
  Trash2,
  Layers,
  Sparkles,
} from 'lucide-react';

import { RecordFormDrawer } from '../master-crud/RecordFormDrawer';
import type { BaseRecordItem } from '../master-crud/types';
import type { FlatRecordItem, FlatTableDomainConfig } from './types';

export interface FlatTableCrudTemplateProps<
  TItem extends FlatRecordItem = FlatRecordItem
> {
  config: FlatTableDomainConfig<TItem>;
  onItemsChange?: (items: TItem[]) => void;
}

/**
 * [템플릿 4: 단일 DB 테이블 조회 · 관리형 (Flat DB Table CRUD Template)]
 * 좌측 트리 없이 전체 화면(Full-width)을 활용하여 DB 마스터 테이블을 관리하는 표준 CRUD 템플릿입니다.
 * - 상단: DB 테이블 메타 정보 + 실시간 KPI 요약 카드 + [+ 신규 등록 / CSV 내보내기 / 대량 샘플 추가]
 * - 검색/필터 바: 키워드 검색 + 다중 컬럼 드롭다운 필터(Select Filters) + 상태 세그먼트 필터 + 필터 초기화
 * - 메인 데이터 그리드:
 *   1) '페이지네이션(Pagination) 모드' (20/50/100건씩 끊어 보기 - 일반 DB 어드민 표준)
 *   2) '전체 가상 스크롤(Virtual Scroll) 모드' (수천 건 한 번에 스크롤) 전환 지원
 * - 상세/수정: 행 클릭 시 우측 Slide-over Drawer 오픈 (다중 체크박스 선택 시 하단 Floating Bulk Action 바)
 */
export function FlatTableCrudTemplate<
  TItem extends FlatRecordItem = FlatRecordItem
>({ config, onItemsChange }: FlatTableCrudTemplateProps<TItem>) {
  const toast = useToast();

  // 1. DB 레코드 목록 상태
  const [items, setItems] = useState<TItem[]>(config.items);

  // 2. 검색어, 상태 필터, 다중 드롭다운 필터 상태
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectFilterValues, setSelectFilterValues] = useState<
    Record<string, string>
  >(() => {
    const init: Record<string, string> = {};
    for (const f of config.selectFilters ?? []) {
      init[f.fieldKey] = 'ALL';
    }
    return init;
  });

  // 3. 정렬 및 보기 모드(Pagination vs Virtual Scroll) 상태
  const [sortState, setSortState] = useState<TableSortState<string>>([]);
  const [viewMode, setViewMode] = useState<'pagination' | 'virtual'>(
    'pagination'
  );
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // 4. 다중 체크박스 선택 상태
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());

  // 5. Slide-over Drawer (신규/상세/수정) 상태
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit'>('edit');
  const [editingItem, setEditingItem] = useState<Partial<TItem> | null>(null);

  // 6. 가상 스크롤 Capability (Astryx useTableRowsVirtualization)
  const rowsVirtualization = useTableRowsVirtualization({
    rowHeight: 40,
    initialViewportHeight: 620,
  });

  // 다중 검색 조건 및 정렬 적용
  const filteredAndSortedItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const statusKey = config.statusFilterConfig?.fieldKey;

    const filtered = items.filter((item) => {
      // 상태 세그먼트 필터
      if (statusKey && statusFilter !== 'ALL') {
        if (String(item[statusKey]) !== statusFilter) return false;
      }

      // 다중 드롭다운 컬럼 필터
      for (const f of config.selectFilters ?? []) {
        const selectedVal = selectFilterValues[f.fieldKey];
        if (selectedVal && selectedVal !== 'ALL') {
          if (String(item[f.fieldKey]) !== selectedVal) return false;
        }
      }

      // 키워드 검색
      if (q) {
        const matched = config.searchKeys.some((k) => {
          const val = item[k];
          return (
            val !== undefined &&
            val !== null &&
            String(val).toLowerCase().includes(q)
          );
        });
        if (!matched) return false;
      }

      return true;
    });

    if (sortState.length === 0) return filtered;

    const { sortKey, direction } = sortState[0];
    const dir = direction === 'ascending' ? 1 : -1;

    return [...filtered].sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];
      if (typeof valA === 'number' && typeof valB === 'number') {
        return (valA - valB) * dir;
      }
      return String(valA ?? '').localeCompare(String(valB ?? ''), 'ko') * dir;
    });
  }, [
    items,
    searchQuery,
    statusFilter,
    selectFilterValues,
    config.statusFilterConfig,
    config.selectFilters,
    config.searchKeys,
    sortState,
  ]);

  // 현재 페이지에 표시할 행 슬라이싱 (페이지네이션 모드 vs 가상 스크롤 전체 모드)
  const displayedRows = useMemo(() => {
    if (viewMode === 'virtual') {
      return filteredAndSortedItems;
    }
    const start = (page - 1) * pageSize;
    return filteredAndSortedItems.slice(start, start + pageSize);
  }, [filteredAndSortedItems, viewMode, page, pageSize]);

  // 필터 초기화
  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    const resetSelects: Record<string, string> = {};
    for (const f of config.selectFilters ?? []) {
      resetSelects[f.fieldKey] = 'ALL';
    }
    setSelectFilterValues(resetSelects);
    setSortState([]);
    setPage(1);
  };

  // 행 클릭 시 상세/수정 Drawer 오픈
  const handleOpenEditDrawer = useCallback((item: TItem) => {
    setDrawerMode('edit');
    setEditingItem(item);
    setIsDrawerOpen(true);
  }, []);

  // 신규 등록 Drawer 오픈
  const handleOpenCreateDrawer = useCallback(() => {
    const defaults = config.createDefaultItem
      ? config.createDefaultItem(items.length)
      : {};
    setDrawerMode('create');
    setEditingItem(defaults);
    setIsDrawerOpen(true);
  }, [config, items.length]);

  // 행 클릭 시 Drawer를 여는 TablePlugin (가상화 호환을 위해 rowModel: 'flat' 지정)
  const rowClickDrawerPlugin = useMemo(
    () => ({
      rowModel: 'flat' as const,
      transformBodyRow: (props: any, item: TItem) => ({
        ...props,
        htmlProps: {
          ...props.htmlProps,
          style: {
            ...props.htmlProps?.style,
            cursor: 'pointer',
          },
          onClick: (e: React.MouseEvent<HTMLTableRowElement>) => {
            props.htmlProps?.onClick?.(e);
            const target = e.target as HTMLElement;
            if (
              target.closest('input[type="checkbox"]') ||
              target.closest('label') ||
              target.closest('[role="checkbox"]')
            ) {
              return;
            }
            handleOpenEditDrawer(item);
          },
        },
      }),
    }),
    [handleOpenEditDrawer]
  );

  // 체크박스 다중 선택 플러그인
  const isAllDisplayedSelected =
    displayedRows.length > 0 &&
    displayedRows.every((row) => selectedRowIds.has(row.id));

  const isIndeterminate =
    selectedRowIds.size > 0 && !isAllDisplayedSelected;

  const selectionPlugin = useTableSelection<TItem>({
    getIsItemSelected: (item) => selectedRowIds.has(item.id),
    onSelectItem: ({ item, isSelected }) => {
      setSelectedRowIds((prev) => {
        const next = new Set(prev);
        if (isSelected) next.add(item.id);
        else next.delete(item.id);
        return next;
      });
    },
    onSelectAll: ({ isAllSelected }) => {
      if (isAllSelected) {
        setSelectedRowIds((prev) => {
          const next = new Set(prev);
          displayedRows.forEach((r) => next.add(r.id));
          return next;
        });
      } else {
        setSelectedRowIds((prev) => {
          const next = new Set(prev);
          displayedRows.forEach((r) => next.delete(r.id));
          return next;
        });
      }
    },
    getIsAllSelected: () => isAllDisplayedSelected,
    getIsIndeterminate: () => isIndeterminate,
    getRowLabel: (item) => String(item.id),
  });

  const sortablePlugin = useTableSortable<TItem>({
    sort: sortState,
    onSortChange: setSortState,
    allowUnsortedState: true,
  });

  // 생성 / 수정 저장
  const handleSaveRecord = (
    formData: Partial<BaseRecordItem>,
    mode: 'create' | 'edit'
  ) => {
    if (mode === 'create') {
      const newId =
        formData.id && String(formData.id).trim() !== ''
          ? String(formData.id)
          : `ROW-${Date.now()}`;
      const newItem = {
        ...formData,
        id: newId,
      } as unknown as TItem;

      const next = [newItem, ...items];
      setItems(next);
      onItemsChange?.(next);
      setPage(1);
      toast({
        body: `DB 테이블에 신규 레코드 [${newId}]가 등록되었습니다.`,
      });
    } else {
      const next = items.map((item) =>
        item.id === formData.id ? ({ ...item, ...formData } as TItem) : item
      );
      setItems(next);
      onItemsChange?.(next);
      toast({
        body: `레코드 [${formData.id}] 정보가 수정되었습니다.`,
      });
    }
  };

  // 단건 삭제
  const handleDeleteRecord = (itemId: string) => {
    const next = items.filter((i) => i.id !== itemId);
    setItems(next);
    onItemsChange?.(next);
    setSelectedRowIds((prev) => {
      const copy = new Set(prev);
      copy.delete(itemId);
      return copy;
    });
    toast({
      body: `레코드 [${itemId}]가 삭제되었습니다.`,
    });
  };

  // 다중 선택 일괄 삭제
  const handleBulkDelete = () => {
    if (selectedRowIds.size === 0) return;
    const count = selectedRowIds.size;
    const next = items.filter((i) => !selectedRowIds.has(i.id));
    setItems(next);
    onItemsChange?.(next);
    setSelectedRowIds(new Set());
    toast({
      body: `선택한 ${count.toLocaleString()}건의 레코드가 일괄 삭제되었습니다.`,
    });
  };

  // 다중 선택 일괄 상태 변경
  const handleBulkStatusChange = (newStatusValue: string) => {
    const statusKey = config.statusFilterConfig?.fieldKey;
    if (!statusKey || selectedRowIds.size === 0) return;
    const count = selectedRowIds.size;
    const next = items.map((item) =>
      selectedRowIds.has(item.id)
        ? ({ ...item, [statusKey]: newStatusValue } as TItem)
        : item
    );
    setItems(next);
    onItemsChange?.(next);
    setSelectedRowIds(new Set());
    toast({
      body: `선택한 ${count.toLocaleString()}건의 상태를 [${newStatusValue}](으)로 일괄 변경했습니다.`,
    });
  };

  // 대량 샘플 데이터(+500건) 즉시 생성
  const handleGenerateBulkRows = () => {
    if (!config.createDefaultItem) return;
    const batchSize = 500;
    const baseCount = items.length;
    const added: TItem[] = [];
    for (let i = 0; i < batchSize; i++) {
      const partial = config.createDefaultItem(baseCount + i + 1);
      added.push({
        ...partial,
        id: partial.id ?? `ROW-${baseCount + i + 1}`,
      } as TItem);
    }
    const next = [...added, ...items];
    setItems(next);
    onItemsChange?.(next);
    toast({
      body: `DB 테이블에 ${batchSize.toLocaleString()}건의 샘플 레코드가 추가되었습니다. (총 ${next.length.toLocaleString()}건)`,
    });
  };

  // 현재 조회된(또는 선택된) DB 테이블 레코드 CSV 다운로드
  const handleExportCsv = () => {
    const targetRows =
      selectedRowIds.size > 0
        ? filteredAndSortedItems.filter((r) => selectedRowIds.has(r.id))
        : filteredAndSortedItems;

    const headers = config.columns.map((c) => String(c.header ?? c.key)).join(',');
    const lines = targetRows.map((row) =>
      config.columns
        .map((c) => {
          const val = row[c.key] ?? '';
          const str = String(val).replace(/"/g, '""');
          return str.includes(',') ? `"${str}"` : str;
        })
        .join(',')
    );

    const csv = '\uFEFF' + [headers, ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${config.dbTableName || config.domainKey}_${targetRows.length}rows.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      body: `${targetRows.length.toLocaleString()}건의 DB 테이블 데이터를 CSV로 내보냈습니다.`,
    });
  };

  const hasActiveFilter =
    searchQuery.trim() !== '' ||
    statusFilter !== 'ALL' ||
    Object.values(selectFilterValues).some((v) => v !== 'ALL');

  return (
    <>
      <Layout
        height="fill"
        content={
          <LayoutContent isScrollable={false} padding={4}>
            <VStack gap={3} style={{ height: '100%', minHeight: 0 }}>
              {/* 1. 상단 헤더: DB 테이블 타이틀 + KPI 요약 배지 + 우측 주요 액션 버튼 */}
              <HStack gap={3} vAlign="center" hAlign="between">
                <VStack gap={1}>
                  <HStack gap={2} vAlign="center">
                    <Database size={18} />
                    <Heading level={2}>{config.title}</Heading>
                    {config.dbTableName && (
                      <Badge variant="neutral" label={`DB: ${config.dbTableName}`} />
                    )}
                    <Badge variant="blue" label="단일 테이블(Flat Table) CRUD" />
                  </HStack>
                  {config.subtitle && (
                    <Text type="supporting" color="secondary">
                      {config.subtitle}
                    </Text>
                  )}
                </VStack>

                {/* 우측 액션 툴바 */}
                <HStack gap={2} vAlign="center">
                  {/* 상단 요약 KPI 배지 */}
                  {config.statMetrics && config.statMetrics.length > 0 && (
                    <HStack gap={1.5} vAlign="center">
                      {config.statMetrics.map((m) => (
                        <Badge
                          key={m.label}
                          variant={m.badgeVariant ?? 'neutral'}
                          label={`${m.label}: ${m.computeValue(
                            items,
                            filteredAndSortedItems
                          )}`}
                        />
                      ))}
                    </HStack>
                  )}

                  {config.createDefaultItem && (
                    <Button
                      label="+500건 샘플 추가"
                      size="sm"
                      variant="secondary"
                      icon={<Sparkles size={14} />}
                      onClick={handleGenerateBulkRows}
                    />
                  )}
                  <Button
                    label="CSV 다운로드"
                    size="sm"
                    variant="secondary"
                    icon={<Download size={14} />}
                    onClick={handleExportCsv}
                  />
                  <Button
                    label="+ 신규 레코드 등록"
                    size="md"
                    variant="primary"
                    icon={<Plus size={16} />}
                    onClick={handleOpenCreateDrawer}
                  />
                </HStack>
              </HStack>

              {/* 2. 다중 조건 검색 & 컬럼 필터 바 (Tree 없이 DB WHERE 조건절을 직관적으로 조회) */}
              <Card variant="muted" padding={3}>
                <HStack gap={3} vAlign="center" hAlign="between">
                  {/* 좌측: 키워드 검색 + 다중 드롭다운 필터 + 상태 필터 */}
                  <HStack
                    gap={2}
                    vAlign="center"
                    style={{ flex: 1, flexWrap: 'wrap' }}
                  >
                    <div style={{ width: 260 }}>
                      <TextInput
                        type="search"
                        label="키워드 검색"
                        isLabelHidden
                        placeholder="코드, 명칭, 담당자, 설명 검색..."
                        value={searchQuery}
                        onChange={(v) => {
                          setSearchQuery(v);
                          setPage(1);
                        }}
                        size="sm"
                        width="100%"
                      />
                    </div>

                    {/* 컬럼별 드롭다운 필터 (Select Filters) */}
                    {(config.selectFilters ?? []).map((sf) => (
                      <div key={sf.fieldKey} style={{ width: 170 }}>
                        <Selector
                          label={sf.label}
                          isLabelHidden
                          size="sm"
                          options={[
                            { label: `${sf.label}: 전체`, value: 'ALL' },
                            ...sf.options,
                          ]}
                          value={selectFilterValues[sf.fieldKey] ?? 'ALL'}
                          onChange={(val) => {
                            setSelectFilterValues((prev) => ({
                              ...prev,
                              [sf.fieldKey]: val,
                            }));
                            setPage(1);
                          }}
                          width="100%"
                        />
                      </div>
                    ))}

                    {/* 상태 세그먼트 필터 */}
                    {config.statusFilterConfig && (
                      <SegmentedControl
                        label="상태 필터"
                        size="sm"
                        value={statusFilter}
                        onChange={(val) => {
                          setStatusFilter(val);
                          setPage(1);
                        }}
                      >
                        <SegmentedControlItem value="ALL" label="전체" />
                        {config.statusFilterConfig.options.map((opt) => (
                          <SegmentedControlItem
                            key={opt.value}
                            value={opt.value}
                            label={opt.label}
                          />
                        ))}
                      </SegmentedControl>
                    )}

                    {hasActiveFilter && (
                      <Button
                        label="필터 초기화"
                        size="sm"
                        variant="ghost"
                        icon={<RotateCcw size={13} />}
                        onClick={handleResetFilters}
                      />
                    )}
                  </HStack>

                  {/* 우측: 페이징 모드 vs 전체 가상화 스크롤 모드 전환 & 건수 표시 */}
                  <HStack gap={3} vAlign="center">
                    <SegmentedControl
                      label="테이블 탐색 방식"
                      size="sm"
                      value={viewMode}
                      onChange={(val) =>
                        setViewMode(val as 'pagination' | 'virtual')
                      }
                    >
                      <SegmentedControlItem
                        value="pagination"
                        label="페이지 분할"
                      />
                      <SegmentedControlItem
                        value="virtual"
                        label="가상화 연속 스크롤"
                      />
                    </SegmentedControl>

                    <Text type="supporting" color="secondary">
                      조회{' '}
                      <strong>
                        {filteredAndSortedItems.length.toLocaleString()}
                      </strong>{' '}
                      / 전체 {items.length.toLocaleString()}건
                    </Text>
                  </HStack>
                </HStack>
              </Card>

              {/* 3. 메인 DB 테이블 그리드 */}
              <div className="crud-table-viewport">
                <Table<TItem>
                  data={displayedRows}
                  columns={config.columns}
                  idKey="id"
                  density="compact"
                  dividers="rows"
                  hasHover
                  textOverflow="truncate"
                  virtualization={rowsVirtualization}
                  plugins={{
                    selection: selectionPlugin,
                    sortable: sortablePlugin,
                    rowClickDrawer: rowClickDrawerPlugin,
                  }}
                  emptyState={
                    <EmptyState
                      isCompact
                      title="조건에 일치하는 DB 레코드가 없습니다"
                      description="[필터 초기화]를 누르거나 [+ 신규 레코드 등록]으로 데이터를 추가하세요."
                    />
                  }
                />

                {/* 다중 선택 시 하단에 떠오르는 Floating Bulk Action Bar */}
                {selectedRowIds.size > 0 && (
                  <div className="crud-floating-toolbar">
                    <TableSelectionToolbar
                      selection={{
                        selectedKeys: selectedRowIds,
                        selectedCount: selectedRowIds.size,
                        hasSelection: selectedRowIds.size > 0,
                        clearSelection: () => setSelectedRowIds(new Set()),
                      }}
                      renderSelectionLabel={(count) =>
                        `${count.toLocaleString()}개 레코드 선택됨`
                      }
                      clearLabel="선택 해제"
                      startContent={
                        <HStack gap={1.5} vAlign="center">
                          {selectedRowIds.size === 1 && (
                            <Button
                              label="상세 편집"
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                const targetId = Array.from(selectedRowIds)[0];
                                const found = items.find(
                                  (i) => i.id === targetId
                                );
                                if (found) handleOpenEditDrawer(found);
                              }}
                            />
                          )}
                          {config.statusFilterConfig?.options.map((opt) => (
                            <Button
                              key={opt.value}
                              label={`[${opt.label}] 일괄 변경`}
                              size="sm"
                              variant="ghost"
                              icon={<Layers size={14} />}
                              onClick={() => handleBulkStatusChange(opt.value)}
                            />
                          ))}
                          <Button
                            label="선택 항목 CSV 추출"
                            size="sm"
                            variant="secondary"
                            icon={<Download size={14} />}
                            onClick={handleExportCsv}
                          />
                          <Button
                            label="일괄 삭제"
                            size="sm"
                            variant="destructive"
                            icon={<Trash2 size={14} />}
                            onClick={handleBulkDelete}
                          />
                        </HStack>
                      }
                    />
                  </div>
                )}
              </div>

              {/* 4. 하단 페이지네이션 바 (페이지 분할 모드일 때 표시) */}
              {viewMode === 'pagination' && (
                <HStack gap={3} vAlign="center" hAlign="between">
                  <Text type="supporting" color="secondary">
                    💡 행(Row)을 클릭하면 우측에서 상세 수정 패널이 열리며, 컬럼 헤더를 클릭해 정렬할 수 있습니다.
                  </Text>
                  <Pagination
                    page={page}
                    onChange={setPage}
                    totalItems={filteredAndSortedItems.length}
                    pageSize={pageSize}
                    pageSizeOptions={[15, 25, 50, 100]}
                    onPageSizeChange={(nextSize) => {
                      setPageSize(nextSize);
                      setPage(1);
                    }}
                    size="sm"
                  />
                </HStack>
              )}
            </VStack>
          </LayoutContent>
        }
      />

      {/* 우측 Slide-over 상세 조회 및 등록/수정 Drawer */}
      <RecordFormDrawer<BaseRecordItem>
        isOpen={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        mode={drawerMode}
        initialData={editingItem as Partial<BaseRecordItem> | null}
        selectedNode={null}
        nodePathLabel={
          config.dbTableName
            ? `${config.title} (${config.dbTableName})`
            : config.title
        }
        schema={config.formSchema}
        onSubmit={handleSaveRecord}
        onDelete={handleDeleteRecord}
      />
    </>
  );
}
