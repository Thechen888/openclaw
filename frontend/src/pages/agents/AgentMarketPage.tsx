import ResourceMarketPage from '../../components/ResourceMarketPage';
import { SmartToy } from '@mui/icons-material';

export default function AgentMarketPage() {
  return (
    <ResourceMarketPage
      resourceType="agent"
      category="chat"
      title="智能体市场"
      subtitle="浏览和安装企业内已上架的智能体"
      listEndpoint="/market"
      installSuccessMsg="已安装到智能体库"
      detailPathTemplate="/agents/market/:id"
      emptyIcon={<SmartToy sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />}
      emptyTitle="暂无上架的智能体"
      emptyDesc="当前分类下没有已上架的智能体"
    />
  );
}
