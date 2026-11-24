import { useState } from 'react';
import { Theme, type ThemeMode } from '@astryxdesign/core/theme';
import { AppShell } from '@astryxdesign/core/AppShell';
import { TopNav, TopNavHeading, TopNavItem } from '@astryxdesign/core/TopNav';
import {
  SegmentedControl,
  SegmentedControlItem,
} from '@astryxdesign/core/SegmentedControl';
import { Badge } from '@astryxdesign/core/Badge';
import { Button } from '@astryxdesign/core/Button';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { Layout, LayoutContent } from '@astryxdesign/core/Layout';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { Text } from '@astryxdesign/core/Text';
import { Card } from '@astryxdesign/core/Card';
import {
  Database,
  Cpu,
  Code2,
  Sun,
  Moon,
  Table2,
  Sliders,
  ListFilter,
} from 'lucide-react';

import { themes, defaultThemeSlug } from '../astryx-themes';
import { MasterDataCrudTemplate } from './templates/master-crud';
import { SpreadsheetCrudTemplate } from './templates/spreadsheet-crud';
import { SpecWorkbenchCrudTemplate } from './templates/spec-workbench-crud';
import { FlatTableCrudTemplate } from './templates/flat-table-crud';
import {
  analysisSpecDomainConfig,
  analysisSpreadsheetDomainConfig,
  specWorkbenchDomainConfig,
  flatDbTableDomainConfig,
} from './examples/mockMasterDomains';

type ActiveTemplateTab =
  | 'analysis-spec'
  | 'spreadsheet-io'
  | 'spec-workbench'
  | 'flat-db-table';

export function App() {
  const [themeMode, setThemeMode] = useState<ThemeMode>('light');
  const [activeDomain, setActiveDomain] =
    useState<ActiveTemplateTab>('analysis-spec');
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  return (
    <Theme theme={themes[defaultThemeSlug]} mode={themeMode}>
      <AppShell
        height="fill"
        variant="section"
        contentPadding={0}
        topNav={
          <TopNav
            label="기준정보 관리 시스템 상단 내비게이션"
            heading={
              <TopNavHeading
                logo={<Database size={18} />}
                superheading="Meta Astryx Design System"
                heading="Master Data CRUD Templates (4 Types)"
              />
            }
            startContent={
              <>
                <TopNavItem
                  label="1. [트리 + Drawer 폼형]"
                  icon={<Cpu size={15} />}
                  isSelected={activeDomain === 'analysis-spec'}
                  onClick={() => setActiveDomain('analysis-spec')}
                />
                <TopNavItem
                  label="2. [트리 + 스프레드시트 I/O형]"
                  icon={<Table2 size={15} />}
                  isSelected={activeDomain === 'spreadsheet-io'}
                  onClick={() => setActiveDomain('spreadsheet-io')}
                />
                <TopNavItem
                  label="3. [상하 분할 워크벤치 & 셔틀형]"
                  icon={<Sliders size={15} />}
                  isSelected={activeDomain === 'spec-workbench'}
                  onClick={() => setActiveDomain('spec-workbench')}
                />
                <TopNavItem
                  label="4. [단순 DB 테이블 조회 · 관리형]"
                  icon={<ListFilter size={15} />}
                  isSelected={activeDomain === 'flat-db-table'}
                  onClick={() => setActiveDomain('flat-db-table')}
                />
              </>
            }
            endContent={
              <HStack gap={2} vAlign="center">
                <Button
                  label="4종 템플릿 재사용 가이드"
                  size="sm"
                  variant="secondary"
                  icon={<Code2 size={14} />}
                  onClick={() => setIsGuideOpen(true)}
                />
                <SegmentedControl
                  label="테마 모드 전환"
                  size="sm"
                  value={themeMode}
                  onChange={(val) => setThemeMode(val as ThemeMode)}
                >
                  <SegmentedControlItem
                    value="light"
                    label="Light"
                    icon={<Sun size={13} />}
                  />
                  <SegmentedControlItem
                    value="dark"
                    label="Dark"
                    icon={<Moon size={13} />}
                  />
                </SegmentedControl>
              </HStack>
            }
          />
        }
      >
        {activeDomain === 'analysis-spec' && (
          <MasterDataCrudTemplate
            key="analysis-spec"
            config={analysisSpecDomainConfig}
          />
        )}
        {activeDomain === 'spreadsheet-io' && (
          <SpreadsheetCrudTemplate
            key="spreadsheet-io"
            config={analysisSpreadsheetDomainConfig}
          />
        )}
        {activeDomain === 'spec-workbench' && (
          <SpecWorkbenchCrudTemplate
            key="spec-workbench"
            config={specWorkbenchDomainConfig}
          />
        )}
        {activeDomain === 'flat-db-table' && (
          <FlatTableCrudTemplate
            key="flat-db-table"
            config={flatDbTableDomainConfig}
          />
        )}
      </AppShell>

      {/* 공용 템플릿 4종 사용 가이드 모달 */}
      <Dialog
        isOpen={isGuideOpen}
        onOpenChange={setIsGuideOpen}
        width={760}
        purpose="info"
      >
        <Layout
          defaultHasDividers
          header={
            <DialogHeader
              title="공용 기준정보 CRUD 템플릿 4종 재사용 가이드"
              subtitle="성격이 다른 4가지 화면 형식 중 필요한 템플릿을 골라 config만 주입하여 사용하세요"
              onOpenChange={setIsGuideOpen}
            />
          }
          content={
            <LayoutContent>
              <VStack gap={3}>
                <HStack gap={1.5} style={{ flexWrap: 'wrap' }}>
                  <Badge variant="blue" label="1. MasterDataCrudTemplate (트리+Drawer형)" />
                  <Badge variant="purple" label="2. SpreadsheetCrudTemplate (트리+엑셀 I/O형)" />
                  <Badge variant="teal" label="3. SpecWorkbenchCrudTemplate (상하분할+셔틀형)" />
                  <Badge variant="orange" label="4. FlatTableCrudTemplate (단순 DB 테이블형)" />
                </HStack>
                <Card variant="muted" padding={3}>
                  <pre
                    style={{
                      margin: 0,
                      fontSize: 12,
                      lineHeight: 1.5,
                      overflowX: 'auto',
                      fontFamily: 'monospace',
                    }}
                  >
                    {`// [1번 형식] N단 트리 + 대용량 조회 테이블 + 행 클릭 시 우측 Slide-over Drawer 상세 폼
import { MasterDataCrudTemplate } from '@/templates/master-crud';
<MasterDataCrudTemplate config={myDrawerDomainConfig} />

// [2번 형식] N단 트리 + 메인 화면에서 엑셀처럼 셀 직접 수정 + Ctrl+C/V 대량 입출력
import { SpreadsheetCrudTemplate } from '@/templates/spreadsheet-crud';
<SpreadsheetCrudTemplate config={mySpreadsheetDomainConfig} />

// [3번 형식] 좌측 규격 카탈로그 + 상단 마스터(분석기법/USL/LSL) 폼 & 스펙 게이지 + 하단 좌↔우 아이템 셔틀 매핑
import { SpecWorkbenchCrudTemplate } from '@/templates/spec-workbench-crud';
<SpecWorkbenchCrudTemplate config={myWorkbenchDomainConfig} />

// [4번 형식] 트리 없이 단순 RDB 테이블 다중 조건 조회 + 페이지네이션/가상스크롤 + Slide-over Drawer CRUD
import { FlatTableCrudTemplate } from '@/templates/flat-table-crud';
<FlatTableCrudTemplate config={myFlatDbTableConfig} />`}
                  </pre>
                </Card>
                <VStack gap={1}>
                  <Text type="supporting" weight="semibold">
                    폴더별 독립 모듈화 구조
                  </Text>
                  <Text type="supporting" color="secondary">
                    • <code>src/templates/master-crud/</code> : 1번 템플릿 (N단 트리 + 가상화 테이블 + Slide-over Drawer)
                  </Text>
                  <Text type="supporting" color="secondary">
                    • <code>src/templates/spreadsheet-crud/</code> : 2번 템플릿 (N단 트리 + 인라인 스프레드시트 + 엑셀 붙여넣기/CSV)
                  </Text>
                  <Text type="supporting" color="secondary">
                    • <code>src/templates/spec-workbench-crud/</code> : 3번 템플릿 (카탈로그 + 상단 마스터 규격 폼/게이지 + 하단 Dual-List 셔틀 매핑)
                  </Text>
                  <Text type="supporting" color="secondary">
                    • <code>src/templates/flat-table-crud/</code> : 4번 템플릿 (트리 없는 단일 DB 테이블 다중 필터 조회 + 페이징/가상스크롤 전환 + Drawer CRUD)
                  </Text>
                </VStack>
              </VStack>
            </LayoutContent>
          }
        />
      </Dialog>
    </Theme>
  );
}
export default App;
