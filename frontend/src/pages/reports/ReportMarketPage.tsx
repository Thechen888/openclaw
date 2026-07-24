import ResourceMarketPage from '../../components/ResourceMarketPage';
import { AutoStories } from '@mui/icons-material';

export default function ReportMarketPage() {
  return (
    <ResourceMarketPage
      resourceType="report"
      title="报告市场"
      subtitle="浏览和安装企业内已上架的报告模板"
      listEndpoint="/market"
      installSuccessMsg="已安装到报告库"
      detailPathTemplate="/reports/:id"
      emptyIcon={<AutoStories sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />}
      emptyTitle="暂无上架的报告"
      emptyDesc="当前分类下没有已上架的报告"
    />
  );
}
