import type { HierarchyNode, BaseRecordItem } from './types';

/**
 * 트리에서 특정 ID의 노드를 찾습니다.
 */
export function findNodeById<TMeta>(
  nodes: HierarchyNode<TMeta>[],
  targetId: string
): HierarchyNode<TMeta> | null {
  for (const node of nodes) {
    if (node.id === targetId) return node;
    if (node.children && node.children.length > 0) {
      const found = findNodeById(node.children, targetId);
      if (found) return found;
    }
  }
  return null;
}

/**
 * 루트부터 특정 노드까지의 경로(Breadcrumb 배열)를 반환합니다.
 */
export function getNodePath<TMeta>(
  nodes: HierarchyNode<TMeta>[],
  targetId: string,
  currentPath: HierarchyNode<TMeta>[] = []
): HierarchyNode<TMeta>[] | null {
  for (const node of nodes) {
    const nextPath = [...currentPath, node];
    if (node.id === targetId) {
      return nextPath;
    }
    if (node.children && node.children.length > 0) {
      const found = getNodePath(node.children, targetId, nextPath);
      if (found) return found;
    }
  }
  return null;
}

/**
 * 특정 노드와 그 하위 모든 자손 노드의 ID Set을 반환합니다.
 * (상위 분류 노드를 클릭했을 때 하위 말단 노드의 아이템들을 모아 보거나 카운트할 때 사용)
 */
export function collectSubtreeNodeIds<TMeta>(
  node: HierarchyNode<TMeta>,
  acc: Set<string> = new Set()
): Set<string> {
  acc.add(node.id);
  if (node.children) {
    for (const child of node.children) {
      collectSubtreeNodeIds(child, acc);
    }
  }
  return acc;
}

/**
 * 각 노드별(하위 자식 포함) 소속된 아이템 개수를 미리 계산한 Map을 반환합니다.
 */
export function computeNodeItemCounts<TItem extends BaseRecordItem, TMeta>(
  nodes: HierarchyNode<TMeta>[],
  items: TItem[]
): Map<string, number> {
  const directCounts = new Map<string, number>();
  for (const item of items) {
    directCounts.set(item.nodeId, (directCounts.get(item.nodeId) ?? 0) + 1);
  }

  const totalCounts = new Map<string, number>();

  function traverse(node: HierarchyNode<TMeta>): number {
    let sum = directCounts.get(node.id) ?? 0;
    if (node.children) {
      for (const child of node.children) {
        sum += traverse(child);
      }
    }
    totalCounts.set(node.id, sum);
    return sum;
  }

  for (const root of nodes) {
    traverse(root);
  }

  return totalCounts;
}

/**
 * 검색어로 트리를 필터링합니다 (매칭되는 노드와 그 상위/하위 경로 유지).
 */
export function filterTreeNodes<TMeta>(
  nodes: HierarchyNode<TMeta>[],
  query: string
): HierarchyNode<TMeta>[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return nodes;

  const result: HierarchyNode<TMeta>[] = [];
  for (const node of nodes) {
    const selfMatches =
      node.name.toLowerCase().includes(trimmed) ||
      (node.code && node.code.toLowerCase().includes(trimmed)) ||
      (node.levelLabel && node.levelLabel.toLowerCase().includes(trimmed));

    const filteredChildren = node.children
      ? filterTreeNodes(node.children, query)
      : [];

    if (selfMatches || filteredChildren.length > 0) {
      result.push({
        ...node,
        isExpanded: true,
        children: selfMatches ? node.children : filteredChildren,
      });
    }
  }
  return result;
}

/**
 * 트리에 새 자식 노드를 추가한 새 트리 배열을 반환합니다.
 */
export function insertTreeNode<TMeta>(
  nodes: HierarchyNode<TMeta>[],
  parentId: string | null,
  newNode: HierarchyNode<TMeta>
): HierarchyNode<TMeta>[] {
  if (parentId === null) {
    return [...nodes, newNode];
  }
  return nodes.map((node) => {
    if (node.id === parentId) {
      return {
        ...node,
        isExpanded: true,
        children: [...(node.children ?? []), newNode],
      };
    }
    if (node.children && node.children.length > 0) {
      return {
        ...node,
        children: insertTreeNode(node.children, parentId, newNode),
      };
    }
    return node;
  });
}

/**
 * 트리의 기존 노드를 수정한 새 트리 배열을 반환합니다.
 */
export function updateTreeNode<TMeta>(
  nodes: HierarchyNode<TMeta>[],
  targetId: string,
  updater: (node: HierarchyNode<TMeta>) => HierarchyNode<TMeta>
): HierarchyNode<TMeta>[] {
  return nodes.map((node) => {
    if (node.id === targetId) {
      return updater(node);
    }
    if (node.children && node.children.length > 0) {
      return {
        ...node,
        children: updateTreeNode(node.children, targetId, updater),
      };
    }
    return node;
  });
}

/**
 * 트리에서 특정 노드를 삭제한 새 트리 배열을 반환합니다.
 */
export function removeTreeNode<TMeta>(
  nodes: HierarchyNode<TMeta>[],
  targetId: string
): HierarchyNode<TMeta>[] {
  return nodes
    .filter((node) => node.id !== targetId)
    .map((node) => ({
      ...node,
      children: node.children ? removeTreeNode(node.children, targetId) : undefined,
    }));
}

/**
 * 모든 폴더 노드의 목록을 평탄화(Flatten)하여 반환합니다 (노드 이동/부모 선택용).
 */
export function flattenTreeNodes<TMeta>(
  nodes: HierarchyNode<TMeta>[],
  depth = 0,
  acc: Array<{ node: HierarchyNode<TMeta>; depth: number }> = []
): Array<{ node: HierarchyNode<TMeta>; depth: number }> {
  for (const node of nodes) {
    acc.push({ node, depth });
    if (node.children && node.children.length > 0) {
      flattenTreeNodes(node.children, depth + 1, acc);
    }
  }
  return acc;
}
