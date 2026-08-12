import { createBrowserRouter, Navigate } from 'react-router-dom';
import ModeRouter from '../layouts/ModeRouter';
import LoginPage from '../pages/auth/LoginPage';
import DashboardPage from '../pages/dashboard/DashboardPage';
import ModelSourcesPage from '../pages/models/ModelSourcesPage';
import ModelPoliciesPage from '../pages/models/ModelPoliciesPage';
import CallLogsPage from '../pages/models/CallLogsPage';
import CostStatsPage from '../pages/models/CostStatsPage';
import ChatAdaptersPage from '../pages/connectors/ChatAdaptersPage';
import ThirdPartySystemsPage from '../pages/connectors/ThirdPartySystemsPage';
import StarlarkAdaptersPage from '../pages/connectors/StarlarkAdaptersPage';
import IntegrationTemplatesPage from '../pages/connectors/IntegrationTemplatesPage';
import UsersPage from '../pages/identity/UsersPage';
import IdentitySourcesPage from '../pages/identity/IdentitySourcesPage';
import OrganizationsPage from '../pages/identity/OrganizationsPage';
import ChatAccountsPage from '../pages/identity/ChatAccountsPage';
import ThirdPartyAccountsPage from '../pages/identity/ThirdPartyAccountsPage';
import MatchingPage from '../pages/identity/MatchingPage';
import PermissionsPage from '../pages/identity/PermissionsPage';
import RolesPage from '../pages/identity/RolesPage';
import AgentsPage from '../pages/agents/AgentsPage';
import AgentRunsPage from '../pages/agents/AgentRunsPage';
import AgentCreatePage from '../pages/agents/AgentCreatePage';
import AgentDetailPage from '../pages/agents/AgentDetailPage';
import AgentWorkflowEditPage from '../pages/agents/AgentWorkflowEditPage';
import AgentChatEditPage from '../pages/agents/AgentChatEditPage';
import AgentMarketPage from '../pages/agents/AgentMarketPage';
import ResourceMarketDetailPage from '../components/ResourceMarketDetailPage';
import AgentInstalledPage from '../pages/agents/AgentInstalledPage';
import AgentInstalledDetailPage from '../pages/agents/AgentInstalledDetailPage';
import AgentMyPage from '../pages/agents/AgentMyPage';
import AgentPublishPage from '../pages/agents/AgentPublishPage';
import MarketplacePage from '../pages/skills/MarketplacePage';
import SkillMarketPage from '../pages/skills/SkillMarketPage';
import MyInstalledSkillsPage from '../pages/skills/MyInstalledSkillsPage';
import MySkillsPage from '../pages/skills/MySkillsPage';
import SkillDetailPage from '../pages/skills/SkillDetailPage';
import SkillPublishPage from '../pages/skills/SkillPublishPage';
import FrontPermManagePage from '../pages/permissions/FrontPermManagePage';
import TokenAccountsPage from '../pages/tokens/TokenAccountsPage';
import QuotaManagePage from '../pages/tokens/QuotaManagePage';
import TokenUsagePage from '../pages/tokens/TokenUsagePage';
import OveragePolicyPage from '../pages/tokens/OveragePolicyPage';
import TokenResalePage from '../pages/tokens/TokenResalePage';
import QuotasPage from '../pages/resources/QuotasPage';
import K8sStatusPage from '../pages/resources/K8sStatusPage';
import K8sDetailPage from '../pages/resources/K8sDetailPage';
import RestartPage from '../pages/resources/RestartPage';
import QueuesPage from '../pages/resources/QueuesPage';
import PlatformSnPage from '../pages/resources/PlatformSnPage';
import RemoteManagementPage from '../pages/resources/RemoteManagementPage';
import ConfigBackupPage from '../pages/resources/ConfigBackupPage';
import PythonPackagesPage from '../pages/resources/PythonPackagesPage';
import NetworkAclPage from '../pages/resources/NetworkAclPage';
import PodsPage from '../pages/resources/PodsPage';
import PodDetailPage from '../pages/resources/PodDetailPage';
import StackDetailPage from '../pages/resources/StackDetailPage';
import AgentsMdPage from '../pages/resources/AgentsMdPage';
import UsageStatsPage from '../pages/stats/UsageStatsPage';
import AuditLogsPage from '../pages/stats/AuditLogsPage';
import ReportsPage from '../pages/weekly/WeeklyReportsPage';
import ReportMarketPage from '../pages/reports/ReportMarketPage';
import ReportMarketDetailPage from '../pages/reports/ReportMarketDetailPage';
import ReportInstalledPage from '../pages/reports/ReportInstalledPage';
import ReportInstalledDetailPage from '../pages/reports/ReportInstalledDetailPage';
import ReportMyPage from '../pages/reports/ReportMyPage';
import ReportViewPage from '../pages/reports/ReportViewPage';
import WorkflowMarketPage from '../pages/workflows/WorkflowMarketPage';
import WorkflowInstalledPage from '../pages/workflows/WorkflowInstalledPage';
import WorkflowInstalledDetailPage from '../pages/workflows/WorkflowInstalledDetailPage';
import WorkflowMyPage from '../pages/workflows/WorkflowMyPage';
import WorkflowPublishPage from '../pages/workflows/WorkflowPublishPage';
import KnowledgeBasesPage from '../pages/rag/KnowledgeBasesPage';
import KnowledgeBaseWorkbenchPage from '../pages/rag/KnowledgeBaseWorkbenchPage';
import KBDetailPage from '../pages/rag/KBDetailPage';
import DocumentDetailPage from '../pages/rag/DocumentDetailPage';
import WikiPage from '../pages/rag/WikiPage';
import WorkspacePage from '../pages/workspace/WorkspacePage';
import ChatPage from '../pages/chat/ChatPage';
import ConversationPage from '../pages/chat/ConversationPage';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: <ModeRouter />,
    children: [
      { index: true, element: <DashboardPage /> },
      // Models
      { path: 'models/sources', element: <ModelSourcesPage /> },
      { path: 'models/policies', element: <ModelPoliciesPage /> },
      { path: 'models/logs', element: <CallLogsPage /> },
      { path: 'models/costs', element: <CostStatsPage /> },
      // Connectors
      { path: 'connectors/starlark', element: <StarlarkAdaptersPage /> },
      { path: 'connectors/templates', element: <IntegrationTemplatesPage /> },
      { path: 'connectors/chat', element: <ChatAdaptersPage /> },
      { path: 'connectors/systems', element: <ThirdPartySystemsPage /> },
      // Identity
      { path: 'identity/sources', element: <IdentitySourcesPage /> },
      { path: 'identity/users', element: <UsersPage /> },
      { path: 'identity/orgs', element: <OrganizationsPage /> },
      { path: 'identity/chat-accounts', element: <ChatAccountsPage /> },
      { path: 'identity/3p-accounts', element: <ThirdPartyAccountsPage /> },
      { path: 'identity/matching', element: <MatchingPage /> },
      { path: 'identity/permissions', element: <PermissionsPage /> },
      { path: 'identity/roles', element: <RolesPage /> },
      // Agents
      { path: 'agents', element: <Navigate to="/agents/my" /> },
      { path: 'agents/market', element: <AgentMarketPage /> },
      { path: 'agents/market/:id', element: <ResourceMarketDetailPage resourceType="agent" backPath="/agents/market" installSuccessMsg="已安装到智能体库" /> },
      { path: 'agents/installed', element: <AgentInstalledPage /> },
      { path: 'agents/installed/:id', element: <AgentInstalledDetailPage /> },
      { path: 'agents/my', element: <AgentMyPage /> },
      { path: 'agents/create', element: <AgentCreatePage /> },
      { path: 'agents/runs', element: <AgentRunsPage /> },
      { path: 'agents/:id', element: <AgentDetailPage /> },
      { path: 'agents/:id/edit/workflow', element: <AgentWorkflowEditPage /> },
      { path: 'agents/:id/edit/chat', element: <AgentChatEditPage /> },
      { path: 'agents/publish/:id', element: <AgentPublishPage /> },
      // Workflows
      { path: 'workflows/market', element: <WorkflowMarketPage /> },
      { path: 'workflows/market/:id', element: <ResourceMarketDetailPage resourceType="workflow" backPath="/workflows/market" installSuccessMsg="已安装到工作流库" /> },
      { path: 'workflows/installed', element: <WorkflowInstalledPage /> },
      { path: 'workflows/installed/:id', element: <WorkflowInstalledDetailPage /> },
      { path: 'workflows/my', element: <WorkflowMyPage /> },
      { path: 'workflows/publish/:id', element: <WorkflowPublishPage /> },
      // Skills
      { path: 'skills/market', element: <SkillMarketPage /> },
      { path: 'skills/marketplace', element: <MarketplacePage /> },
      { path: 'skills/my-installed', element: <MyInstalledSkillsPage /> },
      { path: 'skills/my', element: <MySkillsPage /> },
      { path: 'skills/:id/detail', element: <SkillDetailPage /> },
      { path: 'skills/publish/:id', element: <SkillPublishPage /> },
      // 前台权限管理
      { path: 'front-permissions', element: <FrontPermManagePage /> },
      // Tokens
      { path: 'tokens', element: <Navigate to="/tokens/accounts" /> },
      { path: 'tokens/accounts', element: <TokenAccountsPage /> },
      { path: 'tokens/quotas', element: <QuotaManagePage /> },
      { path: 'tokens/usage', element: <TokenUsagePage /> },
      { path: 'tokens/overage', element: <OveragePolicyPage /> },
      { path: 'tokens/resale', element: <TokenResalePage /> },
      // Resources
      { path: 'resources/sn', element: <PlatformSnPage /> },
      { path: 'resources/remote', element: <RemoteManagementPage /> },
      { path: 'resources/backup', element: <ConfigBackupPage /> },
      { path: 'resources/quota', element: <QuotasPage /> },
      { path: 'resources/k8s', element: <K8sStatusPage /> },
      { path: 'resources/k8s/:id', element: <K8sDetailPage /> },
      { path: 'resources/restart', element: <RestartPage /> },
      { path: 'resources/restart/:id', element: <StackDetailPage /> },
      { path: 'resources/queues', element: <QueuesPage /> },
      { path: 'resources/python', element: <PythonPackagesPage /> },
      { path: 'resources/network-acl', element: <NetworkAclPage /> },
      { path: 'resources/pods', element: <PodsPage /> },
      { path: 'resources/pods/:id', element: <PodDetailPage /> },
      { path: 'resources/agents-md', element: <AgentsMdPage /> },
      // Stats
      { path: 'stats/usage', element: <UsageStatsPage /> },
      { path: 'stats/audit', element: <AuditLogsPage /> },
      // Reports
      { path: 'reports', element: <Navigate to="/reports/my" /> },
      { path: 'reports/market', element: <ReportMarketPage /> },
      { path: 'reports/market/:id', element: <ReportMarketDetailPage /> },
      { path: 'reports/installed', element: <ReportInstalledPage /> },
      { path: 'reports/installed/:id', element: <ReportInstalledDetailPage /> },
      { path: 'reports/my', element: <ReportMyPage /> },
      { path: 'reports/view/:id', element: <ReportViewPage /> },
      // RAG
      { path: 'rag/workbench', element: <KnowledgeBaseWorkbenchPage /> },
      { path: 'rag/knowledge-bases', element: <KnowledgeBasesPage /> },
      { path: 'rag/knowledge-bases/:id', element: <KBDetailPage /> },
      { path: 'rag/knowledge-bases/:kbId/documents/:docId', element: <DocumentDetailPage /> },
      { path: 'rag/knowledge-bases/:kbId/wiki', element: <WikiPage /> },
      // Workspace
      { path: 'workspace', element: <WorkspacePage /> },
      // Chat
      { path: 'chat', element: <ChatPage /> },
      { path: 'chat/:sessionId', element: <ConversationPage /> },
      // Catch all
      { path: '*', element: <Navigate to="/" /> },
    ],
  },
], {
  basename: import.meta.env.BASE_URL.replace(/\/$/, ''),
});
