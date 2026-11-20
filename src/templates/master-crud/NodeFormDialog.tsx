import { useState, useEffect } from 'react';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { StackItem } from '@astryxdesign/core/Stack';
import { TextInput } from '@astryxdesign/core/TextInput';
import { NumberInput } from '@astryxdesign/core/NumberInput';
import { Selector } from '@astryxdesign/core/Selector';
import { TextArea } from '@astryxdesign/core/TextArea';
import { Button } from '@astryxdesign/core/Button';
import { Text } from '@astryxdesign/core/Text';
import type { HierarchyNode, NodeMetaFieldSchema } from './types';

export interface NodeFormDialogProps<TNodeMeta = Record<string, unknown>> {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  mode: 'create-child' | 'create-root' | 'edit';
  targetNode: HierarchyNode<TNodeMeta> | null;
  metaSchema?: NodeMetaFieldSchema[];
  onSaveNode: (
    nodeData: {
      name: string;
      code: string;
      levelLabel: string;
      description: string;
      meta: Record<string, unknown>;
    },
    mode: 'create-child' | 'create-root' | 'edit'
  ) => void;
  onDeleteNode?: (nodeId: string) => void;
}

/**
 * 좌측 N단 트리 노드의 추가(최상위/하위 노드) 및 속성 편집, 삭제를 담당하는 가벼운 모달 다이얼로그
 */
export function NodeFormDialog<TNodeMeta = Record<string, unknown>>({
  isOpen,
  onOpenChange,
  mode,
  targetNode,
  metaSchema = [],
  onSaveNode,
  onDeleteNode,
}: NodeFormDialogProps<TNodeMeta>) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [levelLabel, setLevelLabel] = useState('');
  const [description, setDescription] = useState('');
  const [metaValues, setMetaValues] = useState<Record<string, unknown>>({});
  const [nameError, setNameError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setNameError('');

    if (mode === 'edit' && targetNode) {
      setName(targetNode.name);
      setCode(targetNode.code ?? '');
      setLevelLabel(targetNode.levelLabel ?? '');
      setDescription(targetNode.description ?? '');
      setMetaValues((targetNode.meta as Record<string, unknown>) ?? {});
    } else {
      setName('');
      setCode('');
      setLevelLabel(mode === 'create-root' ? '대분류' : '하위노드');
      setDescription('');
      setMetaValues({});
    }
  }, [isOpen, mode, targetNode]);

  const handleSubmit = () => {
    if (!name.trim()) {
      setNameError('노드 명칭을 입력해주세요.');
      return;
    }
    onSaveNode(
      {
        name: name.trim(),
        code: code.trim(),
        levelLabel: levelLabel.trim(),
        description: description.trim(),
        meta: metaValues,
      },
      mode
    );
    onOpenChange(false);
  };

  const title =
    mode === 'create-root'
      ? '최상위(Root) 기준노드 추가'
      : mode === 'create-child'
        ? `[${targetNode?.name ?? ''}] 하위 노드 추가`
        : '트리 노드 설정 및 수정';

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      width={440}
      purpose="form"
    >
      <Layout
        defaultHasDividers
        header={<DialogHeader title={title} onOpenChange={onOpenChange} />}
        content={
          <LayoutContent>
            <VStack gap={3}>
              <TextInput
                label="노드 명칭"
                value={name}
                onChange={(v) => {
                  setName(v);
                  if (nameError) setNameError('');
                }}
                placeholder="예: 식각 공정 (Etch), CD-SEM 분석 등"
                isRequired
                status={nameError ? { type: 'error', message: nameError } : undefined}
                width="100%"
              />
              <HStack gap={2}>
                <StackItem size="fill">
                  <TextInput
                    label="노드 코드"
                    value={code}
                    onChange={setCode}
                    placeholder="예: NODE-01"
                    width="100%"
                  />
                </StackItem>
                <StackItem size="fill">
                  <TextInput
                    label="계층 단계 라벨"
                    value={levelLabel}
                    onChange={setLevelLabel}
                    placeholder="예: 공정 / 기법 / 파라미터"
                    width="100%"
                  />
                </StackItem>
              </HStack>

              {/* 도메인별 트리 노드 커스텀 메타 필드 (예: 기본 규격, 담당팀 등) */}
              {metaSchema.length > 0 && (
                <VStack gap={2}>
                  <Text type="supporting" color="secondary" weight="semibold">
                    노드 기준 속성 (하위 요소 기본값)
                  </Text>
                  {metaSchema.map((field) => {
                    const val = metaValues[field.key];
                    if (field.type === 'number') {
                      const num =
                        typeof val === 'number'
                          ? val
                          : val !== undefined && val !== null && val !== ''
                            ? Number(val)
                            : null;
                      return (
                        <NumberInput
                          key={field.key}
                          label={field.label}
                          value={Number.isNaN(num) ? null : num}
                          onChange={(v) =>
                            setMetaValues((prev) => ({ ...prev, [field.key]: v }))
                          }
                          hasClear
                          units={field.units}
                          step={field.step ?? 0.1}
                          placeholder={field.placeholder}
                          width="100%"
                        />
                      );
                    }
                    if (field.type === 'select') {
                      return (
                        <Selector
                          key={field.key}
                          label={field.label}
                          options={(field.options ?? []).map((o) => ({
                            label: o.label,
                            value: o.value,
                          }))}
                          value={val !== undefined && val !== null ? String(val) : undefined}
                          onChange={(v) =>
                            setMetaValues((prev) => ({ ...prev, [field.key]: v }))
                          }
                          width="100%"
                        />
                      );
                    }
                    return (
                      <TextInput
                        key={field.key}
                        label={field.label}
                        value={val !== undefined && val !== null ? String(val) : ''}
                        onChange={(v) =>
                          setMetaValues((prev) => ({ ...prev, [field.key]: v }))
                        }
                        placeholder={field.placeholder}
                        width="100%"
                      />
                    );
                  })}
                </VStack>
              )}

              <TextArea
                label="노드 설명"
                value={description}
                onChange={setDescription}
                placeholder="이 분류/노드에 대한 기준 설명을 입력하세요."
                rows={2}
                width="100%"
              />
            </VStack>
          </LayoutContent>
        }
        footer={
          <LayoutFooter>
            <HStack gap={2} vAlign="center" hAlign="between">
              <StackItem size="static">
                {mode === 'edit' && targetNode && onDeleteNode ? (
                  <Button
                    label="노드 삭제"
                    variant="destructive"
                    onClick={() => {
                      onDeleteNode(targetNode.id);
                      onOpenChange(false);
                    }}
                  />
                ) : (
                  <span />
                )}
              </StackItem>
              <HStack gap={2}>
                <Button
                  label="취소"
                  variant="secondary"
                  onClick={() => onOpenChange(false)}
                />
                <Button label="저장" variant="primary" onClick={handleSubmit} />
              </HStack>
            </HStack>
          </LayoutFooter>
        }
      />
    </Dialog>
  );
}
