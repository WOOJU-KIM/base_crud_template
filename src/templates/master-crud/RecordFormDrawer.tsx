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
import { EmbeddedMiniSpreadsheet } from './EmbeddedMiniSpreadsheet';

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
  drawerWidth?: number | string;
  onSubmit: (formData: Partial<TItem>, mode: 'create' | 'edit') => void;
  onDelete?: (itemId: string) => void;
}

/**
 * 필드의 조건부 노출 규칙(visibleWhen)을 현재 formValues와 비교하여 표시 여부를 판별합니다.
 */
function isFieldVisible<TItem extends BaseRecordItem>(
  field: CrudFieldSchema<TItem>,
  values: Record<string, unknown>
): boolean {
  if (!field.visibleWhen) return true;
  const currentVal = values[field.visibleWhen.field];
  if (field.visibleWhen.equals !== undefined) {
    return currentVal === field.visibleWhen.equals;
  }
  if (field.visibleWhen.in !== undefined) {
    return field.visibleWhen.in.includes(currentVal);
  }
  return true;
}

/**
 * 공용 Slide-over Drawer 기반 기준정보 상세 조회 / 생성 / 수정 폼 컴포넌트
 * - 알고리즘/기법 선택에 따라 입력창 형태가 동적으로 바뀝니다:
 *   1) 카드 그룹(cardGroup + 2열/3열 그리드) 입력
 *   2) 복사·붙여넣기(Ctrl+C/V)가 가능한 인라인 미니 스프레드시트(type: 'spreadsheet') 입력
 *   3) 일반 스위치/드롭다운/텍스트 입력
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
  drawerWidth,
  onSubmit,
  onDelete,
}: RecordFormDrawerProps<TItem, TNodeMeta>) {
  const [formValues, setFormValues] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 스키마에 spreadsheet 또는 cardGroup이 포함되어 있으면 기본 Drawer 폭을 680px(Wide)로 자동 확장
  const hasAdvancedBlocks = useMemo(
    () =>
      schema.some(
        (f) => f.type === 'spreadsheet' || Boolean(f.cardGroup)
      ),
    [schema]
  );

  const resolvedWidth = drawerWidth ?? (hasAdvancedBlocks ? 680 : 480);

  useEffect(() => {
    if (initialData) {
      const next: Record<string, unknown> = { ...initialData };
      for (const field of schema) {
        if (next[field.key] === undefined) {
          if (field.defaultValue !== undefined) {
            next[field.key] = field.defaultValue;
          } else if (
            field.type === 'spreadsheet' &&
            field.spreadsheetConfig?.defaultRows
          ) {
            next[field.key] = field.spreadsheetConfig.defaultRows;
          }
        }
      }
      setFormValues(next);
      setErrors({});
    }
  }, [initialData, schema]);

  // 현재 알고리즘/선택값에 의해 visibleWhen 조건을 통과한 필드만 필터링 후 Section -> CardGroup 계층으로 그룹화
  const visibleSections = useMemo(() => {
    const activeFields = schema.filter((f) => isFieldVisible(f, formValues));
    const sectionMap = new Map<
      string,
      Array<{
        cardTitle: string | null;
        fields: CrudFieldSchema<TItem>[];
      }>
    >();

    for (const field of activeFields) {
      const secTitle = field.section ?? '기본 정보';
      if (!sectionMap.has(secTitle)) {
        sectionMap.set(secTitle, []);
      }
      const blocks = sectionMap.get(secTitle)!;
      const cardTitle = field.cardGroup ?? null;
      const lastBlock = blocks[blocks.length - 1];

      if (lastBlock && lastBlock.cardTitle === cardTitle) {
        lastBlock.fields.push(field);
      } else {
        blocks.push({ cardTitle, fields: [field] });
      }
    }

    return Array.from(sectionMap.entries());
  }, [schema, formValues]);

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
      if (!isFieldVisible(field, formValues)) continue;
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

  // 단일 필드 컨트롤 렌더링 헬퍼
  const renderFieldControl = (field: CrudFieldSchema<TItem>) => {
    const rawValue = formValues[field.key];
    const errorMsg = errors[field.key];
    const isReadOnly = mode === 'edit' && Boolean(field.readOnlyOnEdit);

    if (field.type === 'spreadsheet' && field.spreadsheetConfig) {
      const sheetRows = Array.isArray(rawValue)
        ? (rawValue as Array<Record<string, unknown>>)
        : (field.spreadsheetConfig.defaultRows ?? []);

      return (
        <EmbeddedMiniSpreadsheet
          key={field.key}
          label={field.label}
          helperText={field.description ?? field.spreadsheetConfig.helperText}
          columns={field.spreadsheetConfig.columns}
          rows={sheetRows}
          samplePasteRows={field.spreadsheetConfig.samplePasteRows}
          onChange={(nextRows) => handleFieldChange(field.key, nextRows)}
        />
      );
    }

    if (field.type === 'text') {
      return (
        <TextInput
          key={field.key}
          label={field.label}
          value={
            rawValue !== undefined && rawValue !== null ? String(rawValue) : ''
          }
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
          value={
            rawValue !== undefined && rawValue !== null
              ? String(rawValue)
              : undefined
          }
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
          value={
            rawValue !== undefined && rawValue !== null ? String(rawValue) : ''
          }
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
  };

  const drawerTitle =
    mode === 'create'
      ? '신규 기준정보 등록 (알고리즘별 동적 입력)'
      : '기준정보 상세 및 알고리즘 파라미터 편집';

  return (
    <Drawer
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      label={drawerTitle}
      width={resolvedWidth}
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
                label={mode === 'create' ? 'NEW' : 'ADAPTIVE FORM'}
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

              {/* 섹션 및 카드 그룹(Card Group) / 미니 스프레드시트(Embedded Spreadsheet) 동적 렌더링 */}
              {visibleSections.map(([sectionTitle, blocks]) => (
                <VStack key={sectionTitle} gap={3}>
                  <Heading level={4}>{sectionTitle}</Heading>
                  <VStack gap={3}>
                    {blocks.map((block, bIdx) => {
                      const gridContent = (
                        <div className="poly-card-grid">
                          {block.fields.map((field) => {
                            const spanClass =
                              field.gridSpan === 'half'
                                ? 'poly-grid-span-half'
                                : field.gridSpan === 'third'
                                  ? 'poly-grid-span-third'
                                  : 'poly-grid-span-full';
                            return (
                              <div key={field.key} className={spanClass}>
                                {renderFieldControl(field)}
                              </div>
                            );
                          })}
                        </div>
                      );

                      // cardGroup이 지정된 블록은 시각적 Card 컨테이너로 감싸서 그룹핑
                      if (block.cardTitle) {
                        return (
                          <Card
                            key={`${sectionTitle}-card-${bIdx}`}
                            padding={3}
                          >
                            <VStack gap={2}>
                              <HStack gap={2} vAlign="center" hAlign="between">
                                <Text type="body" weight="semibold">
                                  {block.cardTitle}
                                </Text>
                                <Badge variant="teal" label="Card Group" />
                              </HStack>
                              {gridContent}
                            </VStack>
                          </Card>
                        );
                      }

                      return (
                        <div key={`${sectionTitle}-plain-${bIdx}`}>
                          {gridContent}
                        </div>
                      );
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
