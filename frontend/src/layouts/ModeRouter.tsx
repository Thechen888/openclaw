import DashboardLayout from './DashboardLayout';
import FrontLayout from './FrontLayout';
import { useViewModeStore } from '../stores/viewModeStore';

/**
 * 根据前后台模式切换布局：
 * - 前台 → FrontLayout（对话中心范式）
 * - 后台 → DashboardLayout（传统管理后台）
 */
export default function ModeRouter() {
  const { viewMode } = useViewModeStore();
  return viewMode === 'front' ? <FrontLayout /> : <DashboardLayout />;
}
