import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import { AxiosHeaders } from 'axios';
import { handleMockRequest } from './mockData';

// 模拟网络延迟（200~600ms）
const delay = () => new Promise<void>(resolve => {
  setTimeout(resolve, 200 + Math.random() * 400);
});

/**
 * Axios Mock 适配器
 * 当 VITE_MOCK_ENABLED=true 时，拦截所有 API 请求并返回 mock 数据
 */
export async function mockAdapter(config: any): Promise<AxiosResponse> {
  await delay();

  const method = (config.method || 'get').toLowerCase();
  const url = config.url || '';
  const params = config.params || {};
  const data = config.data ? (typeof config.data === 'string' ? JSON.parse(config.data) : config.data) : undefined;

  const responseBody = handleMockRequest(method, url, params, data);

  return {
    data: responseBody,
    status: 200,
    statusText: 'OK',
    headers: new AxiosHeaders({ 'content-type': 'application/json' }),
    config,
  };
}
