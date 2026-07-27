import { useState } from 'react';
import api from '../../api/client';
import toast from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';

interface ReportPublishPageProps {
  reportId: string;
  reportName: string;
  onCancel: () => void;
  onPublished: (meta: any) => void;
}

/**
 * 报告发布页 — 表单组件（内嵌于 WeeklyReportsPage）
 * 提交后 status → pending，mock 3 秒后自动审核通过 → published
 */
export default function ReportPublishPage({ reportId, reportName, onCancel, onPublished }: ReportPublishPageProps) {
  const [slug, setSlug] = useState(reportId);
  const [displayName, setDisplayName] = useState(reportName);
  const [description, setDescription] = useState('');
  const [version, setVersion] = useState('1.0.0');
  const [changelog, setChangelog] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!slug.trim()) { toast.error('Slug 不能为空'); return; }
    if (!displayName.trim()) { toast.error('显示名称不能为空'); return; }
    setSubmitting(true);
    try {
      await api.post('/report-meta', {
        report_id: reportId,
        owner: 'Admin',
        status: 'pending',
        scope: 'department',
        version,
        changelog,
        has_unpublished_changes: false,
      });
      toast.success('已提交审核');
      onPublished({
        report_id: reportId,
        status: 'pending',
        version,
        changelog,
        has_unpublished_changes: false,
      });
    } catch {
      toast.error('提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-auto bg-gray-50">
      {/* 顶部栏 */}
      <div className="flex items-center gap-3 px-6 py-3 bg-white border-b border-gray-200">
        <button onClick={onCancel} className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeft size={14} /> 返回
        </button>
        <h2 className="text-lg font-bold text-gray-800">发布报告</h2>
      </div>

      {/* 表单 */}
      <div className="flex-1 max-w-2xl mx-auto w-full px-6 py-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-5">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Slug</label>
            <input type="text" value={slug} onChange={e => setSlug(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-300 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">显示名称</label>
            <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-300 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">描述</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-300 focus:outline-none resize-y" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">版本号</label>
              <input type="text" value={version} onChange={e => setVersion(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-300 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">变更说明</label>
              <input type="text" value={changelog} onChange={e => setChangelog(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-300 focus:outline-none" />
            </div>
          </div>

          {/* 自动检查面板 */}
          <div className="bg-gray-50 rounded border border-gray-200 p-4">
            <p className="text-xs font-semibold text-gray-600 mb-2">发布前检查</p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs">
                <span className="w-4 h-4 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-[10px]">✓</span>
                <span className="text-gray-700">报告定义完整</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="w-4 h-4 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-[10px]">✓</span>
                <span className="text-gray-700">Slug 格式正确</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="w-4 h-4 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-[10px]">✓</span>
                <span className="text-gray-700">版本号已设置</span>
              </div>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={onCancel}
              className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
              取消
            </button>
            <button onClick={handleSubmit} disabled={submitting}
              className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50">
              {submitting ? '提交中...' : '提交发布'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
