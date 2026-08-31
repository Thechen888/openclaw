import ResourceMarketPage from '../../components/ResourceMarketPage';
import { skillsApi } from '../../api/client';
import { Extension } from '@mui/icons-material';

export default function SkillMarketPage() {
  return (
    <ResourceMarketPage
      resourceType="skill"
      title="技能市场"
      subtitle="浏览和安装企业内已上架的技能"
      listEndpoint="/market"
      installMutationFn={(id: string) => skillsApi.publish(id, { action: 'install' })}
      installSuccessMsg="已安装到技能库"
      detailPathTemplate="/skills/:id/detail"
      emptyIcon={<Extension sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />}
      emptyTitle="暂无上架的技能"
      emptyDesc="当前分类下没有已上架的技能"
    />
  );
}
