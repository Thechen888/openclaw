import { createBrowserRouter, Navigate } from 'react-router-dom';
import DashboardLayout from '../layouts/DashboardLayout';
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
import AgentsPage from '../pages/agents/AgentsPage';
import AgentRunsPage from '../pages/agents/AgentRunsPage';
import WorkflowsPage from '../pages/agents/WorkflowsPage';
import SkillsPage from '../pages/skills/SkillsPage';
import MarketplacePage from '../pages/skills/MarketplacePage';
import TokensPage from '../pages/tokens/TokensPage';
import ApprovalsPage from '../pages/tokens/ApprovalsPage';
import QuotasPage from '../pages/resources/QuotasPage';
import K8sStatusPage from '../pages/resources/K8sStatusPage';
import RestartPage from '../pages/resources/RestartPage';
import QueuesPage from '../pages/resources/QueuesPage';
import PlatformSnPage from '../pages/resources/PlatformSnPage';
import RemoteManagementPage from '../pages/resources/RemoteManagementPage';
import ConfigBackupPage from '../pages/resources/ConfigBackupPage';
import PythonPackagesPage from '../pages/resources/PythonPackagesPage';
import NetworkAclPage from '../pages/resources/NetworkAclPage';
import PodsPage from '../pages/resources/PodsPage';
import PodDetailPage from '../pages/resources/PodDetailPage';
import AgentsMdPage from '../pages/resources/AgentsMdPage';
import UsageStatsPage from '../pages/stats/UsageStatsPage';
import AuditLogsPage from '../pages/stats/AuditLogsPage';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: <DashboardLayout />,
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
      // Agents
      { path: 'agents', element: <AgentsPage /> },
      { path: 'agents/workflows', element: <WorkflowsPage /> },
      { path: 'agents/runs', element: <AgentRunsPage /> },
      // Skills
      { path: 'skills', element: <SkillsPage /> },
      { path: 'skills/marketplace', element: <MarketplacePage /> },
      // Tokens
      { path: 'tokens', element: <TokensPage /> },
      { path: 'tokens/approvals', element: <ApprovalsPage /> },
      // Resources
      { path: 'resources/sn', element: <PlatformSnPage /> },
      { path: 'resources/remote', element: <RemoteManagementPage /> },
      { path: 'resources/backup', element: <ConfigBackupPage /> },
      { path: 'resources/quota', element: <QuotasPage /> },
      { path: 'resources/k8s', element: <K8sStatusPage /> },
      { path: 'resources/restart', element: <RestartPage /> },
      { path: 'resources/queues', element: <QueuesPage /> },
      { path: 'resources/python', element: <PythonPackagesPage /> },
      { path: 'resources/network-acl', element: <NetworkAclPage /> },
      { path: 'resources/pods', element: <PodsPage /> },
      { path: 'resources/pods/:id', element: <PodDetailPage /> },
      { path: 'resources/agents-md', element: <AgentsMdPage /> },
      // Stats
      { path: 'stats/usage', element: <UsageStatsPage /> },
      { path: 'stats/audit', element: <AuditLogsPage /> },
      // Catch all
      { path: '*', element: <Navigate to="/" /> },
    ],
  },
]);
