import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// ===================== 赛博朋克全局样式 =====================
const globalCyberStyles = document.createElement('style');
globalCyberStyles.textContent = `
  /* Neon 呼吸光效 */
  @keyframes neonPulse {
    0%, 100% { opacity: 0.6; }
    50% { opacity: 1; }
  }

  /* 边框流光渐变 */
  @keyframes borderGlow {
    0% { border-color: rgba(0,212,255,0.15); }
    50% { border-color: rgba(124,58,237,0.25); }
    100% { border-color: rgba(0,212,255,0.15); }
  }

  /* 内容进入动画 */
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }

  /* Logo 光圈呼吸 */
  @keyframes logoGlow {
    0%, 100% { box-shadow: 0 0 15px rgba(0,212,255,0.3), 0 0 30px rgba(124,58,237,0.15); }
    50% { box-shadow: 0 0 25px rgba(0,212,255,0.5), 0 0 50px rgba(124,58,237,0.25); }
  }

  /* 红点脉冲 */
  @keyframes dotPulse {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.4); opacity: 0.7; }
  }

  /* 赛博朋克滚动条 */
  ::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  ::-webkit-scrollbar-track {
    background: rgba(0,0,0,0.2);
  }
  ::-webkit-scrollbar-thumb {
    background: rgba(0,212,255,0.2);
    border-radius: 3px;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: rgba(0,212,255,0.4);
  }

  /* 页面内容进入动画 */
  main > div > div {
    animation: fadeInUp 0.35s ease-out;
  }

  /* 操作按钮hover发光 */
  .MuiIconButton-root {
    transition: all 0.25s ease !important;
  }
  .MuiIconButton-root:hover {
    box-shadow: 0 0 10px rgba(0,212,255,0.15);
    background: rgba(0,212,255,0.06) !important;
  }

  /* 表格行号间距微调 */
  .MuiTableCell-root {
    padding-top: 10px !important;
    padding-bottom: 10px !important;
  }

  /* Dialog 表单统一间距与样式 */
  .MuiDialogContent-root .MuiGrid-container {
    row-gap: 16px;
  }
  .MuiDialogContent-root .MuiGrid-container > .MuiGrid-root {
    padding-top: 0 !important;
  }
  /* FormControl 在 Dialog 中统一高度 */
  .MuiDialogContent-root .MuiFormControl-root {
    margin-top: 0;
    margin-bottom: 0;
  }
  /* Dialog 中 Divider 统一间距 */
  .MuiDialogContent-root .MuiDivider-root {
    margin-top: 4px;
    margin-bottom: 4px;
    border-color: rgba(0,212,255,0.1);
  }
  /* FormControl InputLabel 统一 */
  .MuiFormControl-root .MuiInputLabel-root {
    font-size: 13px;
    font-weight: 500;
  }

  /* 选中文字颜色 */
  ::selection {
    background: rgba(0,212,255,0.25);
    color: #fff;
  }
`;
document.head.appendChild(globalCyberStyles);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
