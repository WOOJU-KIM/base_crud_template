import { useState, useEffect, useMemo } from 'react';
import { Drawer, DrawerHeader } from '@astryxdesign/core/Drawer';
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { StackItem } from '@astryxdesign/core/Stack';
import { TextInput } from '@astryxdesign/core/TextInput';
import { NumberInput } from '@astryxdesign/core/NumberInput';
import { Selector } from '@astryxdesign/core/Selector';
import { Switch } from '@astryxdesign/core/Switch';
import { TextArea } from '@astryxdesign/core/TextArea';
import { Button } from '@astryxdesign/core/Button';
import { Badge } from '@astryxdesign/core/Badge';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { Card } from '@astryxdesign/core/Card';
import type { BaseRecordItem, CrudFieldSchema, HierarchyNode } from './types';

export interface RecordFormDrawerProps<
  TItem extends BaseRecordItem,
  TNodeMeta = Record<string, unknown>
> {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  mode: 'create' | 'edit';
  initialData: Partial<TItem> | null;
  selectedNode: HierarchyNode<TNodeMeta> | null;
  nodePathLabel: string;
  schema: CrudFieldSchema<TItem>[];
  onSubmit: (formData: Partial<TItem>, mode: 'create' | 'edit') => void;
  onDelete?: (itemId: string) => void;
}

/**
 * 공용 Slide-over Drawer 기반 기준정보 상세 조회 / 생성 / 수정 폼 컴포넌트
 * 메인 화면을 복잡하게(Busy) 만들지 않기 위해 행 클릭 시 또는 [+ 신규 등록] 시에만 우측에서 슬라이드 인 됩니다.
 */
export function RecordFormDrawer<
  TItem extends BaseRecordItem,
  TNodeMeta = Record<string, unknown>
>({
  isOpen,
  onOpenChange,
  mode,
  initialData,
  selectedNode,
  nodePathLabel,
  schema,
  onSubmit,
  onDelete,
}: RecordFormDrawerProps<TItem, TNodeMeta>) {
  // Astryx Drawer 가이드라인: 닫히는 애니메이션 동안에도 마지막 데이터를 유지하여 빈 화면 깜빡임 방지
  const [formValues, setFormValues] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      const next: Record<string, unknown> = { ...initialData };
      for (const field of schema) {
        if (next[field.key] === undefined && field.defaultValue !== undefined) {
          next[field.key] = field.defaultValue;
        }
      }
      setFormValues(next);
      setErrors({});
    }
  }, [initialData, schema]);

  // 섹션별로 필드 그룹화 (깔끔한 시각적 계층 제공)
  const groupedSections = useMemo(() => {
    const groups = new Map<string, CrudFieldSchema<TItem>[]>();
    for (const field of schema) {
      const sec = field.section ?? '기본 정보';
      if (!groups.has(sec)) {
        groups.set(sec, []);
      }
      groups.get(sec)!.push(field);
    }
    return Array.from(groups.entries());
  }, [schema]);

  const handleFieldChange = (key: string, value: unknown) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
    }
  };

  const handleSave = () => {
    const newErrors: Record<string, string> = {};
    for (const field of schema) {
      if (field.required) {
        const val = formValues[field.key];
        if (val === undefined || val === null || String(val).trim() === '') {
          newErrors[field.key] = `${field.label} 항목은 필수입니다.`;
        }
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit(formValues as Partial<TItem>, mode);
    onOpenChange(false);
  };

  const drawerTitle = mode === 'create' ? '신규 기준정보 등록' : '기준정보 상세 및 수정';

  return (
    <Drawer
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      label={drawerTitle}
      width={460}
      purpose="form"
    >
      <Layout
        defaultHasDividers
        header={
          <DrawerHeader
            title={drawerTitle}
            subtitle={nodePathLabel || selectedNode?.name}
            onOpenChange={onOpenChange}
            endContent={
              <Badge
                variant={mode === 'create' ? 'blue' : 'purple'}
                label={mode === 'create' ? 'NEW' : 'EDIT'}
              />
            }
          />
        }
        content={
          <LayoutContent>
            <VStack gap={4}>
              {/* 소속 트리 노드 컨텍스트 요약 */}
              {selectedNode && (
                <Card variant="muted" padding={3}>
                  <VStack gap={1}>
                    <HStack gap={2} vAlign="center" hAlign="between">
                      <Text type="supporting" color="secondary">
                        소속 기준정보 노드
                      </Text>
                      {selectedNode.code && (
                        <Badge variant="neutral" label={selectedNode.code} />
                      )}
                    </HStack>
                    <Text type="body" weight="semibold">
                      {nodePathLabel}
                    </Text>
                  </VStack>
                </Card>
              )}

              {/* 스키마 기반 섹션별 동적 폼 렌더링 */}
              {groupedSections.map(([sectionTitle, fields]) => (
                <VStack key={sectionTitle} gap={3}>
                  <Heading level={4}>{sectionTitle}</Heading>
                  <VStack gap={3}>
                    {fields.map((field) => {
                      const rawValue = formValues[field.key];
                      const errorMsg = errors[field.key];
                      const isReadOnly = mode === 'edit' && Boolean(field.readOnlyOnEdit);

                      if (field.type === 'text') {
                        return (
                          <TextInput
                            key={field.key}
                            label={field.label}
                            value={rawValue !== undefined && rawValue !== null ? String(rawValue) : ''}
                            onChange={(val) => handleFieldChange(field.key, val)}
                            placeholder={field.placeholder}
                            description={field.description}
                            isRequired={field.required}
                            isReadOnly={isReadOnly}
                            status={errorMsg ? { type: 'error', message: errorMsg } : undefined}
                            width="100%"
                          />
                        );
                      }

                      if (field.type === 'number') {
                        const numValue =
                          typeof rawValue === 'number'
                            ? rawValue
                            : rawValue !== undefined && rawValue !== null && rawValue !== ''
                              ? Number(rawValue)
                              : null;

                        return (
                          <NumberInput
                            key={field.key}
                            label={field.label}
                            value={Number.isNaN(numValue) ? null : numValue}
                            onChange={(val) => handleFieldChange(field.key, val)}
                            hasClear
                            placeholder={field.placeholder}
                            description={field.description}
                            units={field.units}
                            step={field.step ?? 1}
                            min={field.min}
                            max={field.max}
                            hasNumberSteppers
                            isRequired={field.required}
                            isReadOnly={isReadOnly}
                            status={errorMsg ? { type: 'error', message: errorMsg } : undefined}
                            width="100%"
                          />
                        );
                      }

                      if (field.type === 'select') {
                        const selectorOptions = (field.options ?? []).map((opt) => ({
                          label: opt.label,
                          value: opt.value,
                        }));

                        return (
                          <Selector
                            key={field.key}
                            label={field.label}
                            options={selectorOptions}
                            value={rawValue !== undefined && rawValue !== null ? String(rawValue) : undefined}
                            onChange={(val) => handleFieldChange(field.key, val)}
                            placeholder={field.placeholder ?? '선택하세요...'}
                            description={field.description}
                            isRequired={field.required}
                            isReadOnly={isReadOnly}
                            status={errorMsg ? { type: 'error', message: errorMsg } : undefined}
                            width="100%"
                          />
                        );
                      }

                      if (field.type === 'switch') {
                        return (
                          <Switch
                            key={field.key}
                            label={field.label}
                            description={field.description}
                            value={Boolean(rawValue)}
                            onChange={(checked) => handleFieldChange(field.key, checked)}
                            labelPosition="start"
                            labelSpacing="spread"
                            width="100%"
                          />
                        );
                      }

                      if (field.type === 'textarea') {
                        return (
                          <TextArea
                            key={field.key}
                            label={field.label}
                            value={rawValue !== undefined && rawValue !== null ? String(rawValue) : ''}
                            onChange={(val) => handleFieldChange(field.key, val)}
                            placeholder={field.placeholder}
                            description={field.description}
                            rows={3}
                            isRequired={field.required}
                            isReadOnly={isReadOnly}
                            status={errorMsg ? { type: 'error', message: errorMsg } : undefined}
                            width="100%"
                          />
                        );
                      }

                      return null;
                    })}
                  </VStack>
                </VStack>
              ))}
            </VStack>
          </LayoutContent>
        }
        footer={
          <LayoutFooter>
            <HStack gap={2} vAlign="center" hAlign="between">
              <StackItem size="static">
                {mode === 'edit' && onDelete && initialData?.id ? (
                  <Button
                    label="삭제"
                    variant="destructive"
                    onClick={() => {
                      onDelete(String(initialData.id));
                      onOpenChange(false);
                    }}
                  />
                ) : (
                  <span />
                )}
              </StackItem>
              <HStack gap={2} hAlign="end">
                <Button
                  label="취소"
                  variant="secondary"
                  onClick={() => onOpenChange(false)}
                />
                <Button
                  label={mode === 'create' ? '등록 완료' : '변경사항 저장'}
                  variant="primary"
                  onClick={handleSave}
                />
              </HStack>
            </HStack>
          </LayoutFooter>
        }
      />
    </Drawer>
  );
}
