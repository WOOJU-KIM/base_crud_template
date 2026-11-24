import { useState } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Badge } from '@astryxdesign/core/Badge';
import { Text } from '@astryxdesign/core/Text';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { useToast } from '@astryxdesign/core/Toast';
import { Plus, Trash2, ClipboardPaste, Copy, Sparkles } from 'lucide-react';
import type { EmbeddedSheetColumn } from './types';

export interface EmbeddedMiniSpreadsheetProps {
  label: string;
  helperText?: string;
  columns: EmbeddedSheetColumn[];
  rows: Array<Record<string, unknown>>;
  samplePasteRows?: Array<Record<string, unknown>>;
  onChange: (nextRows: Array<Record<string, unknown>>) => void;
}

/**
 * [Drawer / 폼 내부 임베디드 미니 스프레드시트 컴포넌트]
 * - 특정 알고리즘(예: 다중 Zone 웨이퍼 맵, 파장별 스펙 테이블, 구간별 보정 계수)이 선택되었을 때
 *   입력 폼 내부에 깔끔하게 렌더링되는 인라인 스프레드시트입니다.
 * - 셀 직접 클릭 편집 + 엑셀(TSV/CSV) 복사(Ctrl+C) 및 붙여넣기(Ctrl+V) + 1클릭 샘플 붙여넣기를 지원합니다.
 */
export function EmbeddedMiniSpreadsheet({
  label,
  helperText,
  columns,
  rows,
  samplePasteRows,
  onChange,
}: EmbeddedMiniSpreadsheetProps) {
  const toast = useToast();
  const [showPasteBox, setShowPasteBox] = useState(false);
  const [pasteText, setPasteText] = useState('');

  // 셀 값 업데이트
  const handleCellChange = (
    rowIdx: number,
    col: EmbeddedSheetColumn,
    rawVal: string
  ) => {
    const parsed =
      col.type === 'number'
        ? rawVal === '' || Number.isNaN(Number(rawVal))
          ? 0
          : Number(rawVal)
        : rawVal;

    const next = rows.map((r, idx) =>
      idx === rowIdx ? { ...r, [col.key]: parsed } : r
    );
    onChange(next);
  };

  // 빈 행 추가
  const handleAddRow = () => {
    const newRow: Record<string, unknown> = {};
    columns.forEach((col, i) => {
      if (i === 0) {
        newRow[col.key] = `P-${String(rows.length + 1).padStart(2, '0')}`;
      } else if (col.type === 'number') {
        newRow[col.key] = 0;
      } else if (col.type === 'select') {
        newRow[col.key] = col.options?.[0]?.value ?? '';
      } else {
        newRow[col.key] = '';
      }
    });
    onChange([...rows, newRow]);
  };

  // 특정 행 삭제
  const handleRemoveRow = (rowIdx: number) => {
    onChange(rows.filter((_, idx) => idx !== rowIdx));
  };

  // 엑셀 TSV/CSV 텍스트 파싱 후 미니 시트에 반영
  const applyPastedText = (raw: string) => {
    const lines = raw
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length === 0) return;

    const delimiter = lines[0].includes('\t') ? '\t' : ',';
    const parsedLines = lines.map((line) =>
      line.split(delimiter).map((c) => c.trim())
    );

    // 첫 줄이 헤더와 일치하면 스킵
    const firstCell = parsedLines[0][0]?.toLowerCase() ?? '';
    const firstHeader = columns[0]?.header.toLowerCase() ?? '';
    const startIdx = firstCell === firstHeader ? 1 : 0;

    const newRows: Array<Record<string, unknown>> = parsedLines
      .slice(startIdx)
      .map((cells, rIdx) => {
        const obj: Record<string, unknown> = {};
        columns.forEach((col, cIdx) => {
          const rawCell = cells[cIdx] ?? '';
          if (col.type === 'number') {
            const num = Number(rawCell);
            obj[col.key] = Number.isNaN(num) ? 0 : num;
          } else {
            obj[col.key] =
              rawCell || (cIdx === 0 ? `ROW-${rIdx + 1}` : '');
          }
        });
        return obj;
      });

    if (newRows.length > 0) {
      onChange(newRows);
      setShowPasteBox(false);
      setPasteText('');
      toast({
        body: `미니 스프레드시트에 ${newRows.length}개 행이 복사·붙여넣기 되었습니다.`,
      });
    }
  };

  // 현재 시트 데이터 클립보드 복사 (엑셀 호환 TSV)
  const handleCopyToClipboard = () => {
    const headerLine = columns.map((c) => c.header).join('\t');
    const bodyLines = rows.map((r) =>
      columns.map((c) => String(r[c.key] ?? '')).join('\t')
    );
    const tsv = [headerLine, ...bodyLines].join('\n');
    navigator.clipboard?.writeText(tsv);
    toast({
      body: '스프레드시트 데이터가 클립보드에 복사되었습니다. (엑셀에 바로 Ctrl+V 가능)',
    });
  };

  // 테스트용 샘플 데이터 즉시 채우기
  const handleLoadSampleRows = () => {
    if (samplePasteRows && samplePasteRows.length > 0) {
      onChange(samplePasteRows);
      toast({
        body: `샘플 스프레드시트 데이터 ${samplePasteRows.length}행이 자동 입력되었습니다.`,
      });
    }
  };

  return (
    <VStack gap={2}>
      <HStack gap={2} vAlign="center" hAlign="between">
        <VStack gap={0.5}>
          <HStack gap={1.5} vAlign="center">
            <Text type="body" weight="semibold">
              {label}
            </Text>
            <Badge variant="purple" label={`시트 ${rows.length}행`} />
          </HStack>
          {helperText && (
            <Text type="supporting" color="secondary">
              {helperText}
            </Text>
          )}
        </VStack>
      </HStack>

      <div
        className="poly-mini-sheet-box"
        onPaste={(e) => {
          const text = e.clipboardData.getData('text/plain');
          if (text && (text.includes('\n') || text.includes('\t'))) {
            e.preventDefault();
            applyPastedText(text);
          }
        }}
      >
        {/* 미니 시트 상단 액션 바 */}
        <div className="poly-mini-sheet-toolbar">
          <HStack gap={1.5} vAlign="center">
            <Button
              label={showPasteBox ? '붙여넣기 창 닫기' : '엑셀 붙여넣기(Ctrl+V)'}
              size="sm"
              variant="secondary"
              icon={<ClipboardPaste size={13} />}
              onClick={() => setShowPasteBox((p) => !p)}
            />
            <Button
              label="클립보드 복사"
              size="sm"
              variant="ghost"
              icon={<Copy size={13} />}
              onClick={handleCopyToClipboard}
            />
            {samplePasteRows && samplePasteRows.length > 0 && (
              <Button
                label="샘플 행 채우기"
                size="sm"
                variant="ghost"
                icon={<Sparkles size={13} />}
                onClick={handleLoadSampleRows}
              />
            )}
          </HStack>
          <Button
            label="+ 행 추가"
            size="sm"
            variant="secondary"
            icon={<Plus size={13} />}
            onClick={handleAddRow}
          />
        </div>

        {/* 엑셀 붙여넣기 전용 드롭 영역 (토글 시 노출) */}
        {showPasteBox && (
          <div style={{ padding: 10, borderBottom: '1px solid rgba(128,128,128,0.18)' }}>
            <VStack gap={1.5}>
              <Text type="supporting" color="secondary">
                엑셀에서 복사한 다중 행·열(`{columns.map((c) => c.header).join(' | ')}`)을 아래 칸에 <strong>Ctrl+V</strong> 하세요:
              </Text>
              <textarea
                className="poly-paste-textarea"
                placeholder={`엑셀 영역 복사 후 여기에 붙여넣기...\n예: ${columns.map((c) => c.header).join('\t')}`}
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
              />
              <HStack gap={1.5} hAlign="end">
                <Button
                  label="취소"
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowPasteBox(false)}
                />
                <Button
                  label="시트에 즉시 적용"
                  size="sm"
                  variant="primary"
                  onClick={() => applyPastedText(pasteText)}
                />
              </HStack>
            </VStack>
          </div>
        )}

        {/* 미니 스프레드시트 테이블 본문 */}
        <div className="poly-mini-sheet-scroll">
          <table className="sheet-table">
            <thead className="sheet-thead">
              <tr>
                <th className="sheet-th" style={{ width: 38, textAlign: 'center' }}>
                  #
                </th>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className="sheet-th"
                    style={{
                      width: col.width,
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
                <th className="sheet-th" style={{ width: 42, textAlign: 'center' }}>
                  삭제
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rIdx) => (
                <tr key={rIdx} className="sheet-tr">
                  <td className="sheet-td sheet-td-index">{rIdx + 1}</td>
                  {columns.map((col) => {
                    const val = row[col.key] ?? '';
                    return (
                      <td key={col.key} className="sheet-td">
                        {col.type === 'select' ? (
                          <select
                            className="sheet-cell-select"
                            value={String(val)}
                            onChange={(e) =>
                              handleCellChange(rIdx, col, e.target.value)
                            }
                          >
                            {(col.options ?? []).map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type={col.type === 'number' ? 'number' : 'text'}
                            step={col.step ?? 'any'}
                            className={`sheet-cell-input ${
                              col.align === 'end' ? 'align-end' : ''
                            }`}
                            value={String(val)}
                            onChange={(e) =>
                              handleCellChange(rIdx, col, e.target.value)
                            }
                          />
                        )}
                      </td>
                    );
                  })}
                  <td className="sheet-td" style={{ textAlign: 'center' }}>
                    <IconButton
                      label="행 삭제"
                      size="sm"
                      variant="ghost"
                      icon={<Trash2 size={13} />}
                      onClick={() => handleRemoveRow(rIdx)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </VStack>
  );
}
