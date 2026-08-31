import ResourceMarketPage from '../../components/ResourceMarketPage';
import { AccountTree } from '@mui/icons-material';

export default function WorkflowMarketPage() {
  return (
    <ResourceMarketPage
      resourceType="agent"
      category="workflow"
      title="工作流市场"
      subtitle="浏览和安装企业内已上架的工作流"
      listEndpoint="/market"
      sharedToMePath="/workflows/shared-to-me"
      installSuccessMsg="已安装到工作流库"
      detailPathTemplate="/workflows/market/:id"
      emptyIcon={<AccountTree sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />}
      emptyTitle="暂无上架的工作流"
      emptyDesc="当前分类下没有已上架的工作流"
    />
  );
}
