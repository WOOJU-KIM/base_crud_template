import { useState, useMemo, useRef, useCallback } from 'react';
import {
  Layout,
  LayoutPanel,
  LayoutContent,
  LayoutFooter,
} from '@astryxdesign/core/Layout';
import { useResizable, ResizeHandle } from '@astryxdesign/core/Resizable';
import { TreeList, type TreeListItemData } from '@astryxdesign/core/TreeList';
import { Breadcrumbs, BreadcrumbItem } from '@astryxdesign/core/Breadcrumbs';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Badge } from '@astryxdesign/core/Badge';
import { TextInput } from '@astryxdesign/core/TextInput';
import { NumberInput } from '@astryxdesign/core/NumberInput';
import { Selector } from '@astryxdesign/core/Selector';
import { TextArea } from '@astryxdesign/core/TextArea';
import { Switch } from '@astryxdesign/core/Switch';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { StackItem } from '@astryxdesign/core/Stack';
import { Card } from '@astryxdesign/core/Card';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { useToast } from '@astryxdesign/core/Toast';
import {
  FolderTree,
  FolderOpen,
  FileSpreadsheet,
  Plus,
  Edit3,
  Trash2,
  Download,
  Upload,
  Save,
  RotateCcw,
  Wand2,
  AlertTriangle,
} from 'lucide-react';

import type { BaseRecordItem, HierarchyNode } from '../master-crud/types';
import {
  findNodeById,
  getNodePath,
  collectSubtreeNodeIds,
  computeNodeItemCounts,
  filterTreeNodes,
  insertTreeNode,
  updateTreeNode,
  removeTreeNode,
} from '../master-crud/treeUtils';
import { NodeFormDialog } from '../master-crud/NodeFormDialog';
import type { SpreadsheetDomainConfig, SpreadsheetColumnSchema } from './types';

export interface SpreadsheetCrudTemplateProps<
  TItem extends BaseRecordItem = BaseRecordItem,
  TNodeMeta = Record<string, unknown>
> {
  config: SpreadsheetDomainConfig<TItem, TNodeMeta>;
  onSaveItems?: (items: TItem[]) => void;
  onTreeChange?: (tree: HierarchyNode<TNodeMeta>[]) => void;
}

const ROW_HEIGHT = 36;
const OVERSCAN_COUNT = 12;

/**
 * [공용 스프레드시트 입출력(Spreadsheet I/O) CRUD 템플릿]
 * - 좌측: N단 트리 탐색기 (Resizable + Collapsible)
 * - 우측 메인: 수천 건의 데이터를 엑셀처럼 직접 셀 클릭/키보드로 인라인 편집하는 가상화 스프레드시트
 * - 입출력(I/O):
 *   1) 엑셀(Excel) 영역 복사 & 붙여넣기 (TSV/CSV 다중 행·열 자동 파싱 및 신규 행 생성/덮어쓰기)
 *   2) CSV 다운로드(Export) 및 CSV 파일 업로드
 *   3) 선택한 행의 특정 컬럼(예: USL, LSL, 분석기법) 일괄 채우기(Bulk Fill)
 *   4) 변경된 셀(Dirty Cell) 코너 마커, 유효성 에러(예: LSL > USL) 실시간 하이라이트, 일괄 저장/되돌리기
 */
export function SpreadsheetCrudTemplate<
  TItem extends BaseRecordItem = BaseRecordItem,
  TNodeMeta = Record<string, unknown>
>({
  config,
  onSaveItems,
  onTreeChange,
}: SpreadsheetCrudTemplateProps<TItem, TNodeMeta>) {
  const toast = useToast();

  // 1. 트리 및 원본/초안(Draft) 데이터 상태
  const [treeData, setTreeData] = useState<HierarchyNode<TNodeMeta>[]>(
    config.treeData
  );
  const [savedItems, setSavedItems] = useState<TItem[]>(config.items);
  const [draftItems, setDraftItems] = useState<TItem[]>(config.items);

  // 신규 추가된 행 ID 및 수정된 셀('rowId::colKey') 추적
  const [newRowIds, setNewRowIds] = useState<Set<string>>(new Set());
  const [dirtyCells, setDirtyCells] = useState<Set<string>>(new Set());

  // 초기 선택 노드
  const [selectedNodeId, setSelectedNodeId] = useState<string>(() => {
    const firstRoot = config.treeData[0];
    if (!firstRoot) return '';
    let curr = firstRoot;
    while (curr.children && curr.children.length > 0) {
      curr = curr.children[0];
    }
    return curr.id;
  });

  // 2. 검색 및 필터 상태
  const [treeSearchQuery, setTreeSearchQuery] = useState('');
  const [sheetSearchQuery, setSheetSearchQuery] = useState('');
  const [includeSubtree, setIncludeSubtree] = useState<boolean>(true);
  const [onlyDirtyOrError, setOnlyDirtyOrError] = useState<boolean>(false);

  // 3. 스프레드시트 포커스/편집 셀 및 체크박스 선택 상태
  const [activeCell, setActiveCell] = useState<{
    rowIndex: number;
    colIndex: number;
  } | null>(null);
  const [editingCell, setEditingCell] = useState<{
    rowIndex: number;
    colIndex: number;
  } | null>(null);
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());

  // 4. 가상 스크롤(Virtualization) 상태
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(600);

  // 5. 엑셀 붙여넣기(Paste) 모달 & 일괄 채우기(Bulk Fill) 모달 & 노드 모달 상태
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [pasteRawText, setPasteRawText] = useState('');
  const [pasteMode, setPasteMode] = useState<'append' | 'upsert'>('upsert');

  const [isBulkFillOpen, setIsBulkFillOpen] = useState(false);
  const [bulkFillColKey, setBulkFillColKey] = useState<string>(
    config.columns.find((c) => !c.readOnly)?.key ?? ''
  );
  const [bulkFillValue, setBulkFillValue] = useState<string>('');

  const [isNodeDialogOpen, setIsNodeDialogOpen] = useState(false);
  const [nodeDialogMode, setNodeDialogMode] = useState<
    'create-child' | 'create-root' | 'edit'
  >('create-child');

  // 파일 업로드 input ref
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 6. 좌측 트리 패널 리사이즈
  const treePanelResizable = useResizable({
    defaultSize: 300,
    minSize: 230,
    maxSize: 450,
    collapsible: true,
    autoSaveId: `sheet-crud-tree-${config.domainKey}`,
  });

  // 현재 선택된 노드와 경로
  const selectedNode = useMemo(
    () => findNodeById(treeData, selectedNodeId),
    [treeData, selectedNodeId]
  );

  const nodePath = useMemo(
    () => getNodePath(treeData, selectedNodeId) ?? [],
    [treeData, selectedNodeId]
  );

  // 각 노드별 아이템 수 계산
  const nodeItemCounts = useMemo(
    () => computeNodeItemCounts(treeData, draftItems),
    [treeData, draftItems]
  );

  // 트리 필터링 및 TreeList 데이터 생성
  const filteredTreeNodes = useMemo(
    () => filterTreeNodes(treeData, treeSearchQuery),
    [treeData, treeSearchQuery]
  );

  const astryxTreeItems = useMemo(() => {
    function toTreeListItem(node: HierarchyNode<TNodeMeta>): TreeListItemData {
      const count = nodeItemCounts.get(node.id) ?? 0;
      const hasChildren = Boolean(node.children && node.children.length > 0);
      return {
        id: node.id,
        label: node.name,
        isSelected: node.id === selectedNodeId,
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
          setActiveCell(null);
          setEditingCell(null);
        },
        children: node.children?.map(toTreeListItem),
      };
    }
    return filteredTreeNodes.map(toTreeListItem);
  }, [filteredTreeNodes, nodeItemCounts, selectedNodeId]);

  // 셀 단위 유효성 검증 맵 ('rowId::colKey' -> errorMessage)
  const validationErrors = useMemo(() => {
    const errMap = new Map<string, string>();
    for (const row of draftItems) {
      for (const col of config.columns) {
        const val = row[col.key];
        if (col.required && (val === undefined || val === null || String(val).trim() === '')) {
          errMap.set(`${row.id}::${col.key}`, `${col.header} 필수 입력`);
          continue;
        }
        if (col.validate) {
          const customErr = col.validate(val, row);
          if (customErr) {
            errMap.set(`${row.id}::${col.key}`, customErr);
          }
        }
      }
    }
    return errMap;
  }, [draftItems, config.columns]);

  // 행 단위 Dirty / Error 여부 판별 헬퍼
  const dirtyRowIds = useMemo(() => {
    const set = new Set<string>(newRowIds);
    for (const key of dirtyCells) {
      const [rowId] = key.split('::');
      if (rowId) set.add(rowId);
    }
    return set;
  }, [newRowIds, dirtyCells]);

  const errorRowIds = useMemo(() => {
    const set = new Set<string>();
    for (const key of validationErrors.keys()) {
      const [rowId] = key.split('::');
      if (rowId) set.add(rowId);
    }
    return set;
  }, [validationErrors]);

  // 현재 노드에 해당하는 스프레드시트 행 필터링
  const activeNodeIds = useMemo(() => {
    if (!selectedNode) return new Set<string>();
    return includeSubtree
      ? collectSubtreeNodeIds(selectedNode)
      : new Set<string>([selectedNode.id]);
  }, [selectedNode, includeSubtree]);

  const visibleRows = useMemo(() => {
    const q = sheetSearchQuery.trim().toLowerCase();
    return draftItems.filter((item) => {
      if (!activeNodeIds.has(item.nodeId)) return false;
      if (onlyDirtyOrError) {
        if (!dirtyRowIds.has(item.id) && !errorRowIds.has(item.id)) return false;
      }
      if (q) {
        const matched = config.searchKeys.some((k) => {
          const v = item[k];
          return v !== undefined && v !== null && String(v).toLowerCase().includes(q);
        });
        if (!matched) return false;
      }
      return true;
    });
  }, [
    draftItems,
    activeNodeIds,
    sheetSearchQuery,
    onlyDirtyOrError,
    dirtyRowIds,
    errorRowIds,
    config.searchKeys,
  ]);

  // 가상 스크롤 윈도우 계산
  const totalRows = visibleRows.length;
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN_COUNT);
  const endIndex = Math.min(
    totalRows,
    Math.ceil((scrollTop + viewportHeight) / ROW_HEIGHT) + OVERSCAN_COUNT
  );
  const windowedRows = visibleRows.slice(startIndex, endIndex);
  const topSpacerHeight = startIndex * ROW_HEIGHT;
  const bottomSpacerHeight = Math.max(0, (totalRows - endIndex) * ROW_HEIGHT);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    setScrollTop(target.scrollTop);
    if (target.clientHeight > 0 && target.clientHeight !== viewportHeight) {
      setViewportHeight(target.clientHeight);
    }
  };

  // 셀 값 변경 핸들러
  const updateCellValue = useCallback(
    (rowId: string, col: SpreadsheetColumnSchema<TItem>, rawValue: unknown) => {
      let parsedValue: unknown = rawValue;
      if (col.type === 'number') {
        const num = Number(rawValue);
        parsedValue = rawValue === '' || Number.isNaN(num) ? 0 : num;
      }

      setDraftItems((prev) =>
        prev.map((row) =>
          row.id === rowId ? ({ ...row, [col.key]: parsedValue } as TItem) : row
        )
      );

      setDirtyCells((prev) => {
        const next = new Set(prev);
        next.add(`${rowId}::${col.key}`);
        return next;
      });
    },
    []
  );

  // 스프레드시트 키보드 방향키 / Enter / Tab 네비게이션
  const handleGridKeyDown = (
    e: React.KeyboardEvent,
    rowIndex: number,
    colIndex: number,
    col: SpreadsheetColumnSchema<TItem>
  ) => {
    const isEditing =
      editingCell?.rowIndex === rowIndex && editingCell?.colIndex === colIndex;

    if (e.key === 'Enter') {
      e.preventDefault();
      if (isEditing) {
        // 편집 완료 후 아래 행으로 이동
        setEditingCell(null);
        if (rowIndex + 1 < totalRows) {
          setActiveCell({ rowIndex: rowIndex + 1, colIndex });
        }
      } else if (!col.readOnly) {
        setEditingCell({ rowIndex, colIndex });
      }
      return;
    }

    if (e.key === 'Escape' && isEditing) {
      e.preventDefault();
      setEditingCell(null);
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      setEditingCell(null);
      const nextCol = e.shiftKey ? colIndex - 1 : colIndex + 1;
      if (nextCol >= 0 && nextCol < config.columns.length) {
        setActiveCell({ rowIndex, colIndex: nextCol });
      } else if (!e.shiftKey && rowIndex + 1 < totalRows) {
        setActiveCell({ rowIndex: rowIndex + 1, colIndex: 0 });
      }
      return;
    }

    if (!isEditing) {
      if (e.key === 'ArrowDown' && rowIndex + 1 < totalRows) {
        e.preventDefault();
        setActiveCell({ rowIndex: rowIndex + 1, colIndex });
      } else if (e.key === 'ArrowUp' && rowIndex - 1 >= 0) {
        e.preventDefault();
        setActiveCell({ rowIndex: rowIndex - 1, colIndex });
      } else if (e.key === 'ArrowRight' && colIndex + 1 < config.columns.length) {
        e.preventDefault();
        setActiveCell({ rowIndex, colIndex: colIndex + 1 });
      } else if (e.key === 'ArrowLeft' && colIndex - 1 >= 0) {
        e.preventDefault();
        setActiveCell({ rowIndex, colIndex: colIndex - 1 });
      }
    }
  };

  // 신규 빈 행 추가 (1행 또는 N행)
  const handleAddRows = (count = 1) => {
    if (!selectedNode) return;
    const added: TItem[] = [];
    const addedIds = new Set<string>(newRowIds);

    for (let i = 0; i < count; i++) {
      const newRow = config.createEmptyRow(
        selectedNode,
        draftItems.length + i + 1
      );
      added.push(newRow);
      addedIds.add(newRow.id);
    }

    setDraftItems((prev) => [...added, ...prev]);
    setNewRowIds(addedIds);
    toast({
      body: `스프레드시트 상단에 신규 입력 행 ${count}개가 추가되었습니다.`,
    });
  };

  // 선택한 행 삭제
  const handleDeleteSelectedRows = () => {
    if (selectedRowIds.size === 0) return;
    const count = selectedRowIds.size;
    setDraftItems((prev) => prev.filter((r) => !selectedRowIds.has(r.id)));
    setSelectedRowIds(new Set());
    toast({
      body: `선택한 ${count.toLocaleString()}개 행이 스프레드시트에서 제거되었습니다. ([변경사항 일괄 저장] 시 최종 반영)`,
    });
  };

  // 변경사항 일괄 저장 (Commit)
  const handleCommitAll = () => {
    if (errorRowIds.size > 0) {
      toast({
        body: `유효성 오류가 있는 행이 ${errorRowIds.size}건 있습니다. 빨간색 표시 셀(예: LSL > USL)을 먼저 수정해주세요.`,
        type: 'error',
      });
      setOnlyDirtyOrError(true);
      return;
    }

    const changedCount = dirtyRowIds.size;
    setSavedItems(draftItems);
    setNewRowIds(new Set());
    setDirtyCells(new Set());
    onSaveItems?.(draftItems);
    toast({
      body: `총 ${changedCount.toLocaleString()}건의 스프레드시트 변경사항이 일괄 저장되었습니다.`,
    });
  };

  // 변경사항 모두 되돌리기 (Rollback)
  const handleDiscardChanges = () => {
    setDraftItems(savedItems);
    setNewRowIds(new Set());
    setDirtyCells(new Set());
    setOnlyDirtyOrError(false);
    toast({
      body: '편집 중이던 모든 변경사항을 원본 상태로 되돌렸습니다.',
    });
  };

  // 엑셀(TSV / CSV) 텍스트 붙여넣기 파싱 및 일괄 입출력 처리
  const applySpreadsheetPasteText = (rawText: string) => {
    if (!selectedNode) return;
    const lines = rawText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      toast({ body: '붙여넣을 데이터가 없습니다.', type: 'error' });
      return;
    }

    // 구분자 자동 감지: 탭(\t) 우선, 없으면 콤마(,)
    const delimiter = lines[0].includes('\t') ? '\t' : ',';
    const parsedRows = lines.map((line) =>
      line.split(delimiter).map((cell) => cell.trim())
    );

    // 첫 줄이 컬럼 헤더와 일치하면 건너뜀
    const firstCellLower = parsedRows[0][0]?.toLowerCase() ?? '';
    const firstColHeaderLower = config.columns[0]?.header.toLowerCase() ?? '';
    const firstColKeyLower = config.columns[0]?.key.toLowerCase() ?? '';
    const startIdx =
      firstCellLower === firstColHeaderLower || firstCellLower === firstColKeyLower
        ? 1
        : 0;

    const dataRows = parsedRows.slice(startIdx);
    if (dataRows.length === 0) return;

    const nextDraft = [...draftItems];
    const nextNewIds = new Set(newRowIds);
    const nextDirty = new Set(dirtyCells);
    const primaryKey = config.columns[0].key;

    let updatedCount = 0;
    let insertedCount = 0;

    dataRows.forEach((cells, idx) => {
      const baseRow = config.createEmptyRow(
        selectedNode,
        nextDraft.length + idx + 1
      );

      config.columns.forEach((col, colIdx) => {
        if (colIdx >= cells.length) return;
        const cellStr = cells[colIdx];
        if (cellStr === undefined || cellStr === '') return;

        if (col.type === 'number') {
          const num = Number(cellStr);
          (baseRow as Record<string, unknown>)[col.key] = Number.isNaN(num)
            ? 0
            : num;
        } else {
          (baseRow as Record<string, unknown>)[col.key] = cellStr;
        }
      });

      const rowKeyVal = String(baseRow[primaryKey] ?? '').trim();
      if (rowKeyVal) {
        baseRow.id = rowKeyVal;
      }

      const existingIdx =
        pasteMode === 'upsert'
          ? nextDraft.findIndex(
              (r) =>
                r.id === baseRow.id ||
                String(r[primaryKey]) === String(baseRow[primaryKey])
            )
          : -1;

      if (existingIdx >= 0) {
        nextDraft[existingIdx] = {
          ...nextDraft[existingIdx],
          ...baseRow,
          id: nextDraft[existingIdx].id,
          nodeId: nextDraft[existingIdx].nodeId,
        };
        config.columns.forEach((col) =>
          nextDirty.add(`${nextDraft[existingIdx].id}::${col.key}`)
        );
        updatedCount++;
      } else {
        nextDraft.unshift(baseRow);
        nextNewIds.add(baseRow.id);
        insertedCount++;
      }
    });

    setDraftItems(nextDraft);
    setNewRowIds(nextNewIds);
    setDirtyCells(nextDirty);
    setIsPasteModalOpen(false);
    setPasteRawText('');
    toast({
      body: `스프레드시트 일괄 입력 완료: 신규 ${insertedCount.toLocaleString()}건 추가, 기존 ${updatedCount.toLocaleString()}건 업데이트`,
    });
  };

  // CSV / TSV 내보내기 (Export)
  const handleExportCsv = () => {
    const targetRows =
      selectedRowIds.size > 0
        ? visibleRows.filter((r) => selectedRowIds.has(r.id))
        : visibleRows;

    const headers = config.columns.map((c) => c.header).join(',');
    const bodyLines = targetRows.map((row) =>
      config.columns
        .map((c) => {
          const val = row[c.key] ?? '';
          const str = String(val).replace(/"/g, '""');
          return str.includes(',') ? `"${str}"` : str;
        })
        .join(',')
    );

    const csvContent = '\uFEFF' + [headers, ...bodyLines].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${config.domainKey}_${selectedNode?.code || 'export'}_${targetRows.length}rows.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      body: `${targetRows.length.toLocaleString()}건의 데이터를 CSV(엑셀 호환) 파일로 내보냈습니다.`,
    });
  };

  // CSV 파일 업로드 처리
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = String(evt.target?.result ?? '');
      applySpreadsheetPasteText(content);
    };
    reader.readAsText(file, 'utf-8');
    e.target.value = '';
  };

  // 선택한 행(또는 현재 조회된 전체 행) 특정 컬럼 일괄 채우기 (Bulk Column Fill)
  const handleApplyBulkFill = () => {
    const targetCol = config.columns.find((c) => c.key === bulkFillColKey);
    if (!targetCol) return;

    const targetIds =
      selectedRowIds.size > 0
        ? selectedRowIds
        : new Set(visibleRows.map((r) => r.id));

    let parsedVal: unknown = bulkFillValue;
    if (targetCol.type === 'number') {
      const num = Number(bulkFillValue);
      if (Number.isNaN(num)) {
        toast({ body: '유효한 숫자를 입력해주세요.', type: 'error' });
        return;
      }
      parsedVal = num;
    }

    setDraftItems((prev) =>
      prev.map((row) =>
        targetIds.has(row.id)
          ? ({ ...row, [targetCol.key]: parsedVal } as TItem)
          : row
      )
    );

    setDirtyCells((prev) => {
      const next = new Set(prev);
      targetIds.forEach((id) => next.add(`${id}::${targetCol.key}`));
      return next;
    });

    setIsBulkFillOpen(false);
    toast({
      body: `${targetIds.size.toLocaleString()}개 행의 [${targetCol.header}] 값을 [${parsedVal}](으)로 일괄 변경했습니다.`,
    });
  };

  // 샘플 엑셀 붙여넣기 텍스트 생성기 (모달 내에서 1클릭 테스트용)
  const handleFillSamplePasteData = () => {
    if (!selectedNode) return;
    const sampleLines: string[] = [];
    const headerLine = config.columns.map((c) => c.header).join('\t');
    sampleLines.push(headerLine);

    for (let i = 1; i <= 8; i++) {
      const sampleRow = config.createEmptyRow(
        selectedNode,
        draftItems.length + i
      );
      const line = config.columns
        .map((c) => String(sampleRow[c.key] ?? ''))
        .join('\t');
      sampleLines.push(line);
    }
    setPasteRawText(sampleLines.join('\n'));
  };

  // 트리 노드 저장/삭제
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
    }
  };

  const handleDeleteTreeNode = (nodeId: string) => {
    const nextTree = removeTreeNode(treeData, nodeId);
    setTreeData(nextTree);
    onTreeChange?.(nextTree);
    if (nextTree[0]) setSelectedNodeId(nextTree[0].id);
  };

  const isAllVisibleChecked =
    visibleRows.length > 0 &&
    visibleRows.every((r) => selectedRowIds.has(r.id));

  const hasUnsavedChanges =
    dirtyRowIds.size > 0 || draftItems.length !== savedItems.length;

  const selectedBulkFillColumn = config.columns.find(
    (c) => c.key === bulkFillColKey
  );

  return (
    <>
      {/* 숨겨진 CSV 파일 업로드 Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.tsv,.txt"
        style={{ display: 'none' }}
        onChange={handleFileUpload}
      />

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
                        onClick={() => {
                          setNodeDialogMode('create-root');
                          setIsNodeDialogOpen(true);
                        }}
                      />
                    </HStack>
                  </HStack>

                  <TextInput
                    type="search"
                    label="트리 노드 검색"
                    isLabelHidden
                    placeholder="분류/노드명 검색..."
                    value={treeSearchQuery}
                    onChange={setTreeSearchQuery}
                    size="sm"
                    width="100%"
                  />

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
                        title="노드 없음"
                        description="검색 조건을 확인하세요."
                      />
                    )}
                  </StackItem>

                  <HStack
                    gap={2}
                    vAlign="center"
                    hAlign="between"
                    style={{
                      paddingTop: 8,
                      borderTop:
                        '1px solid var(--color-border-subtle, rgba(128,128,128,0.18))',
                    }}
                  >
                    <Text type="supporting" color="secondary">
                      전체 시트 행
                    </Text>
                    <Badge
                      variant="neutral"
                      label={`총 ${draftItems.length.toLocaleString()}행`}
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
              {/* 1. 상단 Breadcrumbs + 선택 노드 타이틀 + 스프레드시트 입출력(I/O) 액션 바 */}
              <HStack gap={3} vAlign="center" hAlign="between">
                <VStack gap={1}>
                  {nodePath.length > 0 && (
                    <Breadcrumbs variant="supporting" label="노드 경로">
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
                    <Badge variant="purple" label="Spreadsheet I/O 모드" />
                    {dirtyRowIds.size > 0 && (
                      <Badge
                        variant="blue"
                        label={`수정됨 ${dirtyRowIds.size.toLocaleString()}건`}
                      />
                    )}
                    {errorRowIds.size > 0 && (
                      <Badge
                        variant="error"
                        label={`규격 오류 ${errorRowIds.size.toLocaleString()}건`}
                      />
                    )}
                    {selectedNode && (
                      <IconButton
                        label="노드 설정"
                        size="sm"
                        variant="ghost"
                        icon={<Edit3 size={15} />}
                        onClick={() => {
                          setNodeDialogMode('edit');
                          setIsNodeDialogOpen(true);
                        }}
                      />
                    )}
                  </HStack>
                </VStack>

                {/* 우측: 스프레드시트 입출력(Import/Paste/Export/Add/Commit) 툴바 */}
                <HStack gap={1.5} vAlign="center">
                  <Button
                    label="엑셀 복사·붙여넣기 입력"
                    size="sm"
                    variant="secondary"
                    icon={<Upload size={14} />}
                    tooltip="엑셀에서 복사한 다중 행/열(Ctrl+C)을 붙여넣어 일괄 등록 또는 수정합니다"
                    onClick={() => setIsPasteModalOpen(true)}
                  />
                  <Button
                    label="CSV 업로드"
                    size="sm"
                    variant="secondary"
                    icon={<FileSpreadsheet size={14} />}
                    onClick={() => fileInputRef.current?.click()}
                  />
                  <Button
                    label="CSV 다운로드"
                    size="sm"
                    variant="secondary"
                    icon={<Download size={14} />}
                    onClick={handleExportCsv}
                  />
                  <Button
                    label="열 일괄 채우기"
                    size="sm"
                    variant="secondary"
                    icon={<Wand2 size={14} />}
                    tooltip="선택한 행들의 USL, LSL, 분석기법 등 특정 컬럼 값을 한 번에 변경합니다"
                    onClick={() => setIsBulkFillOpen(true)}
                  />
                  <Button
                    label="+ 빈 행 추가"
                    size="sm"
                    variant="secondary"
                    icon={<Plus size={14} />}
                    onClick={() => handleAddRows(1)}
                  />
                  {hasUnsavedChanges && (
                    <>
                      <Button
                        label="되돌리기"
                        size="sm"
                        variant="ghost"
                        icon={<RotateCcw size={14} />}
                        onClick={handleDiscardChanges}
                      />
                      <Button
                        label={`변경사항 저장 (${dirtyRowIds.size})`}
                        size="sm"
                        variant="primary"
                        icon={<Save size={14} />}
                        onClick={handleCommitAll}
                      />
                    </>
                  )}
                </HStack>
              </HStack>

              {/* 2. 노드 요약 & 스프레드시트 조작 팁 배너 */}
              {selectedNode && config.renderNodeSummary ? (
                <div>
                  {config.renderNodeSummary(selectedNode, visibleRows.length)}
                </div>
              ) : (
                <Card variant="muted" padding={2}>
                  <HStack gap={3} vAlign="center" hAlign="between">
                    <Text type="supporting" color="secondary">
                      💡 <strong>스프레드시트 직접 편집:</strong> 셀을 클릭(또는 방향키·Enter·Tab)하여 즉시 값을 수정하고, 엑셀에서 복사한 영역을 시트 위에서 바로 <strong>Ctrl+V</strong> 하거나 상단 <strong>[엑셀 복사·붙여넣기 입력]</strong>으로 대량 입출력할 수 있습니다.
                    </Text>
                    <Text type="supporting" color="secondary">
                      파란색 코너 마커 = 수정된 셀 · 빨간색 테두리 = USL/LSL 규격 역전 오류
                    </Text>
                  </HStack>
                </Card>
              )}

              {/* 3. 검색 및 필터 바 */}
              <HStack gap={3} vAlign="center" hAlign="between">
                <HStack gap={2} vAlign="center" style={{ flex: 1, maxWidth: 460 }}>
                  <StackItem size="fill">
                    <TextInput
                      type="search"
                      label="시트 내 검색"
                      isLabelHidden
                      placeholder="시트 내 아이템 코드, 명칭, 분석기법 필터..."
                      value={sheetSearchQuery}
                      onChange={setSheetSearchQuery}
                      size="sm"
                      width="100%"
                    />
                  </StackItem>
                  {selectedRowIds.size > 0 && (
                    <Button
                      label={`선택 행 삭제 (${selectedRowIds.size})`}
                      size="sm"
                      variant="destructive"
                      icon={<Trash2 size={14} />}
                      onClick={handleDeleteSelectedRows}
                    />
                  )}
                </HStack>

                <HStack gap={3} vAlign="center">
                  <Switch
                    label="수정됨/오류 행만 보기"
                    size="sm"
                    value={onlyDirtyOrError}
                    onChange={setOnlyDirtyOrError}
                  />
                  <Switch
                    label="하위 노드 모두 포함"
                    size="sm"
                    value={includeSubtree}
                    onChange={setIncludeSubtree}
                  />
                  <Text type="supporting" color="secondary">
                    시트 행 <strong>{visibleRows.length.toLocaleString()}</strong>건
                  </Text>
                </HStack>
              </HStack>

              {/* 4. 가상화(Virtualized) 인라인 편집 스프레드시트 그리드 */}
              <div
                ref={viewportRef}
                className="sheet-viewport"
                onScroll={handleScroll}
                onPaste={(e) => {
                  // 셀 input 내부가 아닌 그리드 영역에서 다중 줄 텍스트를 Ctrl+V 했을 때 즉시 파싱
                  const text = e.clipboardData.getData('text/plain');
                  if (text && (text.includes('\n') || text.includes('\t'))) {
                    e.preventDefault();
                    applySpreadsheetPasteText(text);
                  }
                }}
              >
                <table className="sheet-table">
                  <thead className="sheet-thead">
                    <tr>
                      <th className="sheet-th" style={{ width: 42, textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={isAllVisibleChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRowIds(
                                new Set(visibleRows.map((r) => r.id))
                              );
                            } else {
                              setSelectedRowIds(new Set());
                            }
                          }}
                          aria-label="전체 행 선택"
                        />
                      </th>
                      <th className="sheet-th" style={{ width: 56, textAlign: 'center' }}>
                        No.
                      </th>
                      {config.columns.map((col) => (
                        <th
                          key={col.key}
                          className="sheet-th"
                          style={{
                            width: col.width ?? 140,
                            textAlign:
                              col.align === 'end'
                                ? 'right'
                                : col.align === 'center'
                                  ? 'center'
                                  : 'left',
                          }}
                        >
                          {col.header}
                          {col.unit ? ` (${col.unit})` : ''}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {topSpacerHeight > 0 && (
                      <tr style={{ height: topSpacerHeight }}>
                        <td colSpan={config.columns.length + 2} />
                      </tr>
                    )}

                    {windowedRows.map((row, localIdx) => {
                      const rowIndex = startIndex + localIdx;
                      const isRowChecked = selectedRowIds.has(row.id);
                      const isRowNew = newRowIds.has(row.id);
                      const isRowDirty = dirtyRowIds.has(row.id);
                      const isRowError = errorRowIds.has(row.id);

                      const rowClassNames = [
                        'sheet-tr',
                        isRowNew ? 'is-row-new' : isRowDirty ? 'is-row-dirty' : '',
                        isRowError ? 'is-row-error' : '',
                      ]
                        .filter(Boolean)
                        .join(' ');

                      return (
                        <tr key={row.id} className={rowClassNames}>
                          {/* 체크박스 열 */}
                          <td
                            className="sheet-td"
                            style={{ textAlign: 'center' }}
                          >
                            <input
                              type="checkbox"
                              checked={isRowChecked}
                              onChange={(e) => {
                                setSelectedRowIds((prev) => {
                                  const next = new Set(prev);
                                  if (e.target.checked) next.add(row.id);
                                  else next.delete(row.id);
                                  return next;
                                });
                              }}
                              aria-label={`${row.id} 선택`}
                            />
                          </td>

                          {/* 행 번호 열 */}
                          <td className="sheet-td sheet-td-index">
                            {rowIndex + 1}
                          </td>

                          {/* 데이터 컬럼 셀 */}
                          {config.columns.map((col, colIndex) => {
                            const cellKey = `${row.id}::${col.key}`;
                            const isCellDirty = dirtyCells.has(cellKey);
                            const cellError = validationErrors.get(cellKey);
                            const isActive =
                              activeCell?.rowIndex === rowIndex &&
                              activeCell?.colIndex === colIndex;
                            const isEditing =
                              editingCell?.rowIndex === rowIndex &&
                              editingCell?.colIndex === colIndex;

                            const rawVal = row[col.key];
                            const displayVal =
                              rawVal !== undefined && rawVal !== null
                                ? String(rawVal)
                                : '';

                            const tdClasses = [
                              'sheet-td',
                              isActive ? 'is-active' : '',
                              isCellDirty ? 'is-cell-dirty' : '',
                              cellError ? 'is-cell-error' : '',
                            ]
                              .filter(Boolean)
                              .join(' ');

                            return (
                              <td
                                key={col.key}
                                className={tdClasses}
                                title={cellError || undefined}
                                onClick={() => {
                                  setActiveCell({ rowIndex, colIndex });
                                  if (!col.readOnly) {
                                    setEditingCell({ rowIndex, colIndex });
                                  }
                                }}
                                onKeyDown={(e) =>
                                  handleGridKeyDown(e, rowIndex, colIndex, col)
                                }
                              >
                                {isEditing && !col.readOnly ? (
                                  col.type === 'select' ? (
                                    <select
                                      className="sheet-cell-select"
                                      autoFocus
                                      value={displayVal}
                                      onChange={(e) => {
                                        updateCellValue(
                                          row.id,
                                          col,
                                          e.target.value
                                        );
                                        setEditingCell(null);
                                      }}
                                      onBlur={() => setEditingCell(null)}
                                    >
                                      {(col.options ?? []).map((opt) => (
                                        <option
                                          key={opt.value}
                                          value={opt.value}
                                        >
                                          {opt.label}
                                        </option>
                                      ))}
                                    </select>
                                  ) : (
                                    <input
                                      type={
                                        col.type === 'number' ? 'number' : 'text'
                                      }
                                      step={col.step ?? 'any'}
                                      className={`sheet-cell-input ${
                                        col.align === 'end' ? 'align-end' : ''
                                      }`}
                                      autoFocus
                                      value={displayVal}
                                      onChange={(e) =>
                                        updateCellValue(
                                          row.id,
                                          col,
                                          e.target.value
                                        )
                                      }
                                      onBlur={() => setEditingCell(null)}
                                    />
                                  )
                                ) : (
                                  <div
                                    tabIndex={0}
                                    className={`sheet-cell-display ${
                                      col.align === 'end'
                                        ? 'align-end'
                                        : col.align === 'center'
                                          ? 'align-center'
                                          : ''
                                    } ${col.readOnly ? 'is-readonly' : ''}`}
                                  >
                                    {cellError && (
                                      <AlertTriangle
                                        size={13}
                                        color="#ef4444"
                                        style={{
                                          marginRight: 4,
                                          flexShrink: 0,
                                        }}
                                      />
                                    )}
                                    <span>{displayVal}</span>
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}

                    {bottomSpacerHeight > 0 && (
                      <tr style={{ height: bottomSpacerHeight }}>
                        <td colSpan={config.columns.length + 2} />
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </VStack>
          </LayoutContent>
        }
      />

      {/* [모달 1] 엑셀(Excel) 다중 행·열 복사 & 붙여넣기 일괄 입력 다이얼로그 */}
      <Dialog
        isOpen={isPasteModalOpen}
        onOpenChange={setIsPasteModalOpen}
        width={620}
        purpose="form"
      >
        <Layout
          defaultHasDividers
          header={
            <DialogHeader
              title="엑셀(Excel) 스프레드시트 복사 · 붙여넣기 일괄 입력"
              subtitle={`현재 대상 노드: ${selectedNode?.name ?? ''}`}
              onOpenChange={setIsPasteModalOpen}
            />
          }
          content={
            <LayoutContent>
              <VStack gap={3}>
                <Card variant="muted" padding={3}>
                  <VStack gap={1}>
                    <HStack gap={2} vAlign="center" hAlign="between">
                      <Text type="supporting" weight="semibold">
                        붙여넣기 컬럼 순서 (Tab 또는 콤마 구분)
                      </Text>
                      <Button
                        label="테스트용 엑셀 샘플 8행 자동 채우기"
                        size="sm"
                        variant="secondary"
                        onClick={handleFillSamplePasteData}
                      />
                    </HStack>
                    <Text type="supporting" color="secondary">
                      {config.columns.map((c) => c.header).join('  |  ')}
                    </Text>
                  </VStack>
                </Card>

                <Selector
                  label="동일 아이템 코드 존재 시 처리 방식"
                  options={[
                    {
                      label:
                        'Upsert 모드: 기존 코드는 덮어쓰기(Update)하고 없는 코드는 신규 추가(Insert)',
                      value: 'upsert',
                    },
                    {
                      label: 'Append 모드: 무조건 전체 행을 신규 행으로 추가',
                      value: 'append',
                    },
                  ]}
                  value={pasteMode}
                  onChange={(val) => setPasteMode(val as 'append' | 'upsert')}
                  width="100%"
                />

                <TextArea
                  label="엑셀에서 복사한 영역(Ctrl+C)을 아래에 붙여넣으세요 (Ctrl+V)"
                  placeholder={`아이템코드\t아이템명\t분석기법\tLSL\tTarget\tUSL\t단위\nD5-16G-GATE-9001\tDDR5 신규 웨이퍼 #1\tCD-SEM\t13.2\t14.0\t14.8\tnm`}
                  value={pasteRawText}
                  onChange={setPasteRawText}
                  rows={8}
                  width="100%"
                />
              </VStack>
            </LayoutContent>
          }
          footer={
            <LayoutFooter>
              <HStack gap={2} hAlign="end">
                <Button
                  label="취소"
                  variant="secondary"
                  onClick={() => setIsPasteModalOpen(false)}
                />
                <Button
                  label="시트에 일괄 반영"
                  variant="primary"
                  onClick={() => applySpreadsheetPasteText(pasteRawText)}
                />
              </HStack>
            </LayoutFooter>
          }
        />
      </Dialog>

      {/* [모달 2] 특정 열(USL, LSL, 분석기법 등) 일괄 채우기(Bulk Fill) 다이얼로그 */}
      <Dialog
        isOpen={isBulkFillOpen}
        onOpenChange={setIsBulkFillOpen}
        width={440}
        purpose="form"
      >
        <Layout
          defaultHasDividers
          header={
            <DialogHeader
              title="스프레드시트 열(Column) 일괄 채우기"
              subtitle={
                selectedRowIds.size > 0
                  ? `선택된 ${selectedRowIds.size.toLocaleString()}개 행 대상`
                  : `현재 조회된 ${visibleRows.length.toLocaleString()}개 전체 행 대상`
              }
              onOpenChange={setIsBulkFillOpen}
            />
          }
          content={
            <LayoutContent>
              <VStack gap={3}>
                <Selector
                  label="일괄 변경할 대상 열(Column)"
                  options={config.columns
                    .filter((c) => !c.readOnly)
                    .map((c) => ({
                      label: `${c.header}${c.unit ? ` (${c.unit})` : ''}`,
                      value: c.key,
                    }))}
                  value={bulkFillColKey}
                  onChange={(v) => {
                    setBulkFillColKey(v);
                    setBulkFillValue('');
                  }}
                  width="100%"
                />

                {selectedBulkFillColumn?.type === 'select' ? (
                  <Selector
                    label="적용할 값 선택"
                    options={selectedBulkFillColumn.options ?? []}
                    value={bulkFillValue || undefined}
                    onChange={setBulkFillValue}
                    width="100%"
                  />
                ) : selectedBulkFillColumn?.type === 'number' ? (
                  <NumberInput
                    label="일괄 적용할 숫자 값"
                    value={
                      bulkFillValue === '' ? null : Number(bulkFillValue)
                    }
                    onChange={(v) =>
                      setBulkFillValue(v === null ? '' : String(v))
                    }
                    hasClear
                    step={selectedBulkFillColumn.step ?? 0.1}
                    units={selectedBulkFillColumn.unit}
                    width="100%"
                  />
                ) : (
                  <TextInput
                    label="일괄 적용할 텍스트 값"
                    value={bulkFillValue}
                    onChange={setBulkFillValue}
                    width="100%"
                  />
                )}
              </VStack>
            </LayoutContent>
          }
          footer={
            <LayoutFooter>
              <HStack gap={2} hAlign="end">
                <Button
                  label="취소"
                  variant="secondary"
                  onClick={() => setIsBulkFillOpen(false)}
                />
                <Button
                  label="일괄 채우기 적용"
                  variant="primary"
                  onClick={handleApplyBulkFill}
                />
              </HStack>
            </LayoutFooter>
          }
        />
      </Dialog>

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
