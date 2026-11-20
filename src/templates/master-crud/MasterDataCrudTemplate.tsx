import { useState, useMemo, useCallback } from 'react';
import {
  Layout,
  LayoutHeader,
  LayoutPanel,
  LayoutContent,
} from '@astryxdesign/core/Layout';
import { useResizable, ResizeHandle } from '@astryxdesign/core/Resizable';
import { TreeList, type TreeListItemData } from '@astryxdesign/core/TreeList';
import {
  Table,
  TableSelectionToolbar,
  useTableRowsVirtualization,
  useTableSelection,
  useTableSortable,
  type TableColumn,
  type TableSortState,
  pixel,
} from '@astryxdesign/core/Table';
import { Breadcrumbs, BreadcrumbItem } from '@astryxdesign/core/Breadcrumbs';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Badge } from '@astryxdesign/core/Badge';
import { TextInput } from '@astryxdesign/core/TextInput';
import {
  SegmentedControl,
  SegmentedControlItem,
} from '@astryxdesign/core/SegmentedControl';
import { Switch } from '@astryxdesign/core/Switch';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { StackItem } from '@astryxdesign/core/Stack';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { useToast } from '@astryxdesign/core/Toast';
import {
  FolderTree,
  FolderOpen,
  FileSpreadsheet,
  Plus,
  Edit3,
  Trash2,
  Layers,
  Sparkles,
} from 'lucide-react';

import type {
  BaseRecordItem,
  HierarchyNode,
  MasterDataDomainConfig,
} from './types';
import {
  findNodeById,
  getNodePath,
  collectSubtreeNodeIds,
  computeNodeItemCounts,
  filterTreeNodes,
  insertTreeNode,
  updateTreeNode,
  removeTreeNode,
} from './treeUtils';
import { RecordFormDrawer } from './RecordFormDrawer';
import { NodeFormDialog } from './NodeFormDialog';

export interface MasterDataCrudTemplateProps<
  TItem extends BaseRecordItem = BaseRecordItem,
  TNodeMeta = Record<string, unknown>
> {
  /** 도메인 설정 (트리, 아이템, 컬럼, 폼 스키마 등) */
  config: MasterDataDomainConfig<TItem, TNodeMeta>;
  /** 외부에서 상태 변경을 감지하거나 API 연동할 때 사용하는 콜백 (선택) */
  onItemsChange?: (items: TItem[]) => void;
  onTreeChange?: (tree: HierarchyNode<TNodeMeta>[]) => void;
}

/**
 * [공용 기준정보 CRUD 템플릿]
 * - 좌측: N단 트리 탐색기 (Resizable + Collapsible + 실시간 트리 필터 + 하위 아이템 수 표시 + 노드 CRUD)
 * - 우측: 수천 건의 말단 요소를 끊김 없이 보여주는 가상화(Virtualized) 데이터 그리드
 * - 오버레이: 화면이 꽉 차서 복잡(Busy)해지지 않도록 행 클릭 또는 [+ 신규 등록] 시에만 열리는 Slide-over Drawer
 * - 하단: 다중 체크박스 선택 시에만 떠오르는 Floating Bulk Action Toolbar
 */
export function MasterDataCrudTemplate<
  TItem extends BaseRecordItem = BaseRecordItem,
  TNodeMeta = Record<string, unknown>
>({
  config,
  onItemsChange,
  onTreeChange,
}: MasterDataCrudTemplateProps<TItem, TNodeMeta>) {
  const toast = useToast();

  // 1. 트리 데이터 및 선택된 노드 상태
  const [treeData, setTreeData] = useState<HierarchyNode<TNodeMeta>[]>(
    config.treeData
  );
  const [items, setItems] = useState<TItem[]>(config.items);

  // 초기 선택 노드: 첫 번째 말단(또는 루트) 노드
  const [selectedNodeId, setSelectedNodeId] = useState<string>(() => {
    const firstRoot = config.treeData[0];
    if (!firstRoot) return '';
    let curr = firstRoot;
    while (curr.children && curr.children.length > 0) {
      curr = curr.children[0];
    }
    return curr.id;
  });

  // 2. 검색 / 필터 / 하위 노드 포함 보기 상태
  const [treeSearchQuery, setTreeSearchQuery] = useState('');
  const [tableSearchQuery, setTableSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [includeSubtree, setIncludeSubtree] = useState<boolean>(true);
  const [sortState, setSortState] = useState<TableSortState<string>>([]);

  // 3. 다중 선택(Bulk Selection) 상태
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());

  // 4. Slide-over Drawer (아이템 생성/수정) 상태
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit'>('edit');
  const [editingItem, setEditingItem] = useState<Partial<TItem> | null>(null);

  // 5. 트리 노드 추가/편집 모달 상태
  const [isNodeDialogOpen, setIsNodeDialogOpen] = useState(false);
  const [nodeDialogMode, setNodeDialogMode] = useState<
    'create-child' | 'create-root' | 'edit'
  >('create-child');

  // 6. 좌측 트리 패널 리사이즈 & 접기 훅 (Astryx useResizable)
  const treePanelResizable = useResizable({
    defaultSize: 310,
    minSize: 240,
    maxSize: 480,
    collapsible: true,
    autoSaveId: `master-crud-tree-${config.domainKey}`,
  });

  // 7. 대용량(수천 건) 가상화(Virtualization) 훅 (Astryx useTableRowsVirtualization)
  const rowsVirtualization = useTableRowsVirtualization({
    rowHeight: 40,
    initialViewportHeight: 640,
  });

  // 현재 선택된 노드와 Breadcrumb 경로 계산
  const selectedNode = useMemo(
    () => findNodeById(treeData, selectedNodeId),
    [treeData, selectedNodeId]
  );

  const nodePath = useMemo(
    () => getNodePath(treeData, selectedNodeId) ?? [],
    [treeData, selectedNodeId]
  );

  const nodePathLabel = useMemo(
    () => nodePath.map((n) => n.name).join(' > '),
    [nodePath]
  );

  // 각 트리 노드별 소속 아이템 총 개수 계산
  const nodeItemCounts = useMemo(
    () => computeNodeItemCounts(treeData, items),
    [treeData, items]
  );

  // 트리 검색 필터 적용 후 Astryx TreeList 포맷으로 변환
  const filteredTreeNodes = useMemo(
    () => filterTreeNodes(treeData, treeSearchQuery),
    [treeData, treeSearchQuery]
  );

  const astryxTreeItems = useMemo(() => {
    function toTreeListItem(node: HierarchyNode<TNodeMeta>): TreeListItemData {
      const count = nodeItemCounts.get(node.id) ?? 0;
      const hasChildren = Boolean(node.children && node.children.length > 0);
      const isSelected = node.id === selectedNodeId;

      return {
        id: node.id,
        label: node.name,
        isSelected,
        isExpanded: node.isExpanded ?? true,
        startContent: hasChildren ? (
          <FolderOpen size={15} style={{ opacity: 0.75, flexShrink: 0 }} />
        ) : (
          <FileSpreadsheet size={15} style={{ opacity: 0.65, flexShrink: 0 }} />
        ),
        endContent: (
          <Text type="supporting" color="secondary">
            {count.toLocaleString()}
          </Text>
        ),
        onClick: () => {
          setSelectedNodeId(node.id);
          setSelectedRowIds(new Set());
        },
        children: node.children?.map(toTreeListItem),
      };
    }

    return filteredTreeNodes.map(toTreeListItem);
  }, [filteredTreeNodes, nodeItemCounts, selectedNodeId]);

  // 현재 선택된 노드(및 하위 노드 포함 옵션)에 해당하는 아이템 필터링 및 정렬
  const activeNodeIds = useMemo(() => {
    if (!selectedNode) return new Set<string>();
    if (includeSubtree) {
      return collectSubtreeNodeIds(selectedNode);
    }
    return new Set<string>([selectedNode.id]);
  }, [selectedNode, includeSubtree]);

  const visibleItems = useMemo(() => {
    const q = tableSearchQuery.trim().toLowerCase();
    const statusKey = config.statusFilterConfig?.fieldKey;

    const filtered = items.filter((item) => {
      if (!activeNodeIds.has(item.nodeId)) return false;

      if (statusKey && statusFilter !== 'ALL') {
        if (String(item[statusKey]) !== statusFilter) return false;
      }

      if (q) {
        const matchesSearch = config.searchKeys.some((k) => {
          const val = item[k];
          return val !== undefined && val !== null && String(val).toLowerCase().includes(q);
        });
        if (!matchesSearch) return false;
      }

      return true;
    });

    if (sortState.length === 0) return filtered;

    const primarySort = sortState[0];
    const { sortKey, direction } = primarySort;
    const dirMultiplier = direction === 'ascending' ? 1 : -1;

    return [...filtered].sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];
      if (typeof valA === 'number' && typeof valB === 'number') {
        return (valA - valB) * dirMultiplier;
      }
      return (
        String(valA ?? '').localeCompare(String(valB ?? ''), 'ko') *
        dirMultiplier
      );
    });
  }, [
    items,
    activeNodeIds,
    tableSearchQuery,
    statusFilter,
    config.statusFilterConfig,
    config.searchKeys,
    sortState,
  ]);

  // 테이블 행 클릭 또는 상세 보기 실행 -> Slide-over Drawer 오픈
  const handleOpenEditDrawer = useCallback((item: TItem) => {
    setDrawerMode('edit');
    setEditingItem(item);
    setIsDrawerOpen(true);
  }, []);

  // 신규 기준정보 아이템 등록 Drawer 오픈
  const handleOpenCreateDrawer = useCallback(() => {
    if (!selectedNode) return;
    const defaultItem = config.createDefaultItem
      ? config.createDefaultItem(selectedNode, items.length)
      : {};
    setDrawerMode('create');
    setEditingItem({
      ...defaultItem,
      nodeId: selectedNode.id,
    } as Partial<TItem>);
    setIsDrawerOpen(true);
  }, [selectedNode, config, items.length]);

  // 가상화(useTableRowsVirtualization) 활성화 및 세로 스크롤 보장:
  // Astryx Table의 fixed-height row virtualization은 모든 컬럼이 renderCell 없는 순수 데이터 컬럼일 때만 작동합니다.
  // 대신 행을 클릭(또는 우클릭 컨텍스트 메뉴)하면 즉시 우측 Slide-over Drawer가 열리도록 TablePlugin으로 연결합니다.
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
            // 체크박스 클릭 시에는 Drawer를 열지 않고 다중 선택만 수행
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

  const tableColumns = useMemo<TableColumn<TItem>[]>(() => {
    return config.columns;
  }, [config.columns]);

  // 테이블 플러그인: 체크박스 다중 선택 & 컬럼 정렬
  const isAllVisibleSelected =
    visibleItems.length > 0 &&
    visibleItems.every((item) => selectedRowIds.has(item.id));

  const isIndeterminate =
    selectedRowIds.size > 0 && !isAllVisibleSelected;

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
        setSelectedRowIds(new Set(visibleItems.map((i) => i.id)));
      } else {
        setSelectedRowIds(new Set());
      }
    },
    getIsAllSelected: () => isAllVisibleSelected,
    getIsIndeterminate: () => isIndeterminate,
    getRowLabel: (item) => String(item.id),
  });

  const sortablePlugin = useTableSortable<TItem>({
    sort: sortState,
    onSortChange: setSortState,
    allowUnsortedState: true,
  });

  // 아이템 저장 (생성 / 수정)
  const handleSaveRecord = (
    formData: Partial<TItem>,
    mode: 'create' | 'edit'
  ) => {
    if (mode === 'create') {
      const newId =
        formData.id && String(formData.id).trim() !== ''
          ? String(formData.id)
          : `REC-${Date.now()}`;
      const newItem: TItem = {
        ...formData,
        id: newId,
        nodeId: selectedNode?.id ?? '',
      } as TItem;

      const next = [newItem, ...items];
      setItems(next);
      onItemsChange?.(next);
      toast({
        body: `신규 기준정보 [${newId}] 항목이 등록되었습니다.`,
      });
    } else {
      const next = items.map((item) =>
        item.id === formData.id ? ({ ...item, ...formData } as TItem) : item
      );
      setItems(next);
      onItemsChange?.(next);
      toast({
        body: `기준정보 [${formData.id}] 변경사항이 저장되었습니다.`,
      });
    }
  };

  // 단일 아이템 삭제
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
      body: `항목 [${itemId}]이 삭제되었습니다.`,
    });
  };

  // 다중 선택 아이템 일괄 삭제
  const handleBulkDelete = () => {
    const count = selectedRowIds.size;
    if (count === 0) return;
    const next = items.filter((i) => !selectedRowIds.has(i.id));
    setItems(next);
    onItemsChange?.(next);
    setSelectedRowIds(new Set());
    toast({
      body: `선택한 ${count.toLocaleString()}개 항목이 일괄 삭제되었습니다.`,
    });
  };

  // 다중 선택 아이템 일괄 상태 변경
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
      body: `선택한 ${count.toLocaleString()}개 항목의 상태를 [${newStatusValue}](으)로 일괄 변경했습니다.`,
    });
  };

  // 대량 샘플 데이터(1,000건) 즉시 생성 테스트 기능 (수천 개 말단 노드 성능 검증용)
  const handleGenerateBulkMockItems = () => {
    if (!selectedNode || !config.createDefaultItem) return;
    const batchSize = 1000;
    const generated: TItem[] = [];
    const baseCount = items.length;

    for (let i = 0; i < batchSize; i++) {
      const partial = config.createDefaultItem(selectedNode, baseCount + i + 1);
      generated.push({
        ...partial,
        id: partial.id ?? `${selectedNode.code || 'ITEM'}-${baseCount + i + 1}`,
        nodeId: selectedNode.id,
      } as TItem);
    }

    const next = [...generated, ...items];
    setItems(next);
    onItemsChange?.(next);
    toast({
      body: `[${selectedNode.name}] 노드에 ${batchSize.toLocaleString()}개의 대량 항목이 추가되었습니다. (현재 총 ${next.length.toLocaleString()}건)`,
    });
  };

  // 트리 노드 추가/수정 처리
  const handleSaveTreeNode = (
    nodeData: {
      name: string;
      code: string;
      levelLabel: string;
      description: string;
      meta: Record<string, unknown>;
    },
    mode: 'create-child' | 'create-root' | 'edit'
  ) => {
    if (mode === 'create-root' || mode === 'create-child') {
      const parentId =
        mode === 'create-child' && selectedNode ? selectedNode.id : null;
      const newNodeId = `node-${Date.now()}`;
      const newNode: HierarchyNode<TNodeMeta> = {
        id: newNodeId,
        parentId,
        name: nodeData.name,
        code: nodeData.code || undefined,
        levelLabel: nodeData.levelLabel || undefined,
        description: nodeData.description || undefined,
        meta: nodeData.meta as TNodeMeta,
        isExpanded: true,
        children: [],
      };
      const nextTree = insertTreeNode(treeData, parentId, newNode);
      setTreeData(nextTree);
      onTreeChange?.(nextTree);
      setSelectedNodeId(newNodeId);
      toast({
        body: `트리 노드 [${nodeData.name}]가 추가되었습니다.`,
      });
    } else if (mode === 'edit' && selectedNode) {
      const nextTree = updateTreeNode(treeData, selectedNode.id, (prev) => ({
        ...prev,
        name: nodeData.name,
        code: nodeData.code || undefined,
        levelLabel: nodeData.levelLabel || undefined,
        description: nodeData.description || undefined,
        meta: nodeData.meta as TNodeMeta,
      }));
      setTreeData(nextTree);
      onTreeChange?.(nextTree);
      toast({
        body: `트리 노드 [${nodeData.name}] 정보가 수정되었습니다.`,
      });
    }
  };

  const handleDeleteTreeNode = (nodeId: string) => {
    const nextTree = removeTreeNode(treeData, nodeId);
    setTreeData(nextTree);
    onTreeChange?.(nextTree);
    if (nextTree[0]) {
      setSelectedNodeId(nextTree[0].id);
    }
    toast({
      body: '선택한 트리 노드가 삭제되었습니다.',
    });
  };

  return (
    <>
      <Layout
        height="fill"
        defaultHasDividers
        start={
          <>
            <LayoutPanel
              resizable={treePanelResizable}
              role="navigation"
              label={config.treeTitle}
              padding={3}
            >
              <div className="crud-tree-panel-scroll">
                <VStack gap={3} style={{ height: '100%' }}>
                  {/* 좌측 트리 상단 타이틀 & 노드 추가 버튼 */}
                  <HStack gap={2} vAlign="center" hAlign="between">
                    <HStack gap={1.5} vAlign="center">
                      <FolderTree size={16} />
                      <Heading level={3}>{config.treeTitle}</Heading>
                    </HStack>
                    <HStack gap={1}>
                      <Button
                        label="하위 추가"
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setNodeDialogMode('create-child');
                          setIsNodeDialogOpen(true);
                        }}
                      />
                      <IconButton
                        label="최상위 노드 추가"
                        size="sm"
                        variant="ghost"
                        icon={<Plus size={15} />}
                        tooltip="최상위(Root) 분류 노드 추가"
                        onClick={() => {
                          setNodeDialogMode('create-root');
                          setIsNodeDialogOpen(true);
                        }}
                      />
                    </HStack>
                  </HStack>

                  {/* 트리 내 빠른 검색창 */}
                  <TextInput
                    type="search"
                    label="트리 노드 검색"
                    isLabelHidden
                    placeholder="분류/노드명 또는 코드 검색..."
                    value={treeSearchQuery}
                    onChange={setTreeSearchQuery}
                    size="sm"
                    width="100%"
                  />

                  {/* N단 트리 리스트 (스크롤 영역) */}
                  <StackItem size="fill" isScrollable>
                    {astryxTreeItems.length > 0 ? (
                      <TreeList
                        items={astryxTreeItems}
                        density="compact"
                        variant="lineGuides"
                        aria-label={config.treeTitle}
                      />
                    ) : (
                      <EmptyState
                        isCompact
                        title="일치하는 노드 없음"
                        description="검색어를 변경하거나 새 노드를 추가하세요."
                      />
                    )}
                  </StackItem>

                  {/* 좌측 트리 하단 요약 표시 */}
                  <HStack
                    gap={2}
                    vAlign="center"
                    hAlign="between"
                    style={{
                      paddingTop: 8,
                      borderTop: '1px solid var(--color-border-subtle, rgba(128,128,128,0.18))',
                    }}
                  >
                    <Text type="supporting" color="secondary">
                      전체 등록 데이터
                    </Text>
                    <Badge
                      variant="neutral"
                      label={`총 ${items.length.toLocaleString()}건`}
                    />
                  </HStack>
                </VStack>
              </div>
            </LayoutPanel>
            <ResizeHandle
              resizable={treePanelResizable}
              direction="horizontal"
              hasDivider
              label="트리 패널 크기 조절"
            />
          </>
        }
        content={
          <LayoutContent isScrollable={false} padding={4}>
            <VStack gap={3} style={{ height: '100%', minHeight: 0 }}>
              {/* 1. 상단 경로(Breadcrumbs) 및 선택된 노드 헤더 + 주요 액션 */}
              <HStack gap={3} vAlign="center" hAlign="between">
                <VStack gap={1}>
                  {nodePath.length > 0 && (
                    <Breadcrumbs variant="supporting" label="선택된 노드 경로">
                      {nodePath.map((crumb, idx) => (
                        <BreadcrumbItem
                          key={crumb.id}
                          isCurrent={idx === nodePath.length - 1}
                          onClick={() => setSelectedNodeId(crumb.id)}
                        >
                          {crumb.name}
                        </BreadcrumbItem>
                      ))}
                    </Breadcrumbs>
                  )}
                  <HStack gap={2} vAlign="center">
                    {treePanelResizable.isCollapsed && (
                      <Button
                        label="트리 펼치기"
                        size="sm"
                        variant="secondary"
                        onClick={() => treePanelResizable.expand()}
                      />
                    )}
                    <Heading level={2}>
                      {selectedNode ? selectedNode.name : config.title}
                    </Heading>
                    {selectedNode?.levelLabel && (
                      <Badge variant="blue" label={selectedNode.levelLabel} />
                    )}
                    {selectedNode?.code && (
                      <Badge variant="neutral" label={selectedNode.code} />
                    )}
                    {selectedNode && (
                      <IconButton
                        label="노드 설정 및 기준값 편집"
                        size="sm"
                        variant="ghost"
                        icon={<Edit3 size={15} />}
                        tooltip="이 트리 노드의 이름/코드/기본 규격(메타데이터) 수정"
                        onClick={() => {
                          setNodeDialogMode('edit');
                          setIsNodeDialogOpen(true);
                        }}
                      />
                    )}
                  </HStack>
                </VStack>

                {/* 우측 액션 버튼 그룹 */}
                <HStack gap={2} vAlign="center">
                  {config.createDefaultItem && (
                    <Button
                      label="+1,000건 대량 샘플 생성"
                      size="sm"
                      variant="secondary"
                      icon={<Sparkles size={14} />}
                      tooltip="수천 개 말단 요소 가상화 렌더링 성능 테스트를 위해 현재 노드에 1,000건을 즉시 추가합니다"
                      onClick={handleGenerateBulkMockItems}
                    />
                  )}
                  <Button
                    label="+ 신규 항목 등록"
                    size="md"
                    variant="primary"
                    icon={<Plus size={16} />}
                    onClick={handleOpenCreateDrawer}
                  />
                </HStack>
              </HStack>

              {/* 2. 선택된 노드의 도메인별 요약 카드 (예: 분석기법의 기본 USL/LSL 규격 등 - 슬림하게 한 줄로 표시) */}
              {selectedNode && config.renderNodeSummary && (
                <div>
                  {config.renderNodeSummary(selectedNode, visibleItems.length)}
                </div>
              )}

              {/* 3. 리스트 검색 및 필터 툴바 (Busy하지 않게 한 줄로 정돈) */}
              <HStack gap={3} vAlign="center" hAlign="between">
                <HStack gap={2} vAlign="center" style={{ flex: 1, maxWidth: 520 }}>
                  <StackItem size="fill">
                    <TextInput
                      type="search"
                      label="목록 검색"
                      isLabelHidden
                      placeholder="코드, 명칭, 규격 검색..."
                      value={tableSearchQuery}
                      onChange={setTableSearchQuery}
                      size="sm"
                      width="100%"
                    />
                  </StackItem>
                  {config.statusFilterConfig && (
                    <SegmentedControl
                      label="상태 필터"
                      size="sm"
                      value={statusFilter}
                      onChange={setStatusFilter}
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
                </HStack>

                <HStack gap={3} vAlign="center">
                  <Switch
                    label="하위 노드 항목 모두 포함"
                    size="sm"
                    value={includeSubtree}
                    onChange={setIncludeSubtree}
                  />
                  <Text type="supporting" color="secondary">
                    조회 결과{' '}
                    <strong>{visibleItems.length.toLocaleString()}</strong>건
                  </Text>
                </HStack>
              </HStack>

              {/* 4. 수천 개 요소를 처리하는 가상화(Virtualized) 메인 테이블 영역 */}
              <div className="crud-table-viewport">
                <Table<TItem>
                  data={visibleItems}
                  columns={tableColumns}
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
                      title="조건에 맞는 기준정보 항목이 없습니다"
                      description="검색어를 초기화하거나 [+ 신규 항목 등록] 버튼을 눌러 데이터를 추가하세요."
                    />
                  }
                />

                {/* 5. 체크박스 선택 시에만 하단에 떠오르는 Floating Bulk Action Bar */}
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
                        `${count.toLocaleString()}개 항목 선택됨`
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
                                const found = items.find((i) => i.id === targetId);
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
            </VStack>
          </LayoutContent>
        }
      />

      {/* 우측 Slide-over 상세 조회 & 등록/수정 Drawer */}
      <RecordFormDrawer<TItem, TNodeMeta>
        isOpen={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        mode={drawerMode}
        initialData={editingItem}
        selectedNode={selectedNode}
        nodePathLabel={nodePathLabel}
        schema={config.formSchema}
        onSubmit={handleSaveRecord}
        onDelete={handleDeleteRecord}
      />

      {/* 트리 노드 추가/편집 모달 */}
      <NodeFormDialog<TNodeMeta>
        isOpen={isNodeDialogOpen}
        onOpenChange={setIsNodeDialogOpen}
        mode={nodeDialogMode}
        targetNode={selectedNode}
        metaSchema={config.nodeMetaSchema}
        onSaveNode={handleSaveTreeNode}
        onDeleteNode={handleDeleteTreeNode}
      />
    </>
  );
}
