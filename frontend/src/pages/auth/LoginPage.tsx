import { Box, Card, CardContent, Typography, TextField, Button, Chip, useTheme } from '@mui/material';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { Lock } from '@mui/icons-material';

export default function LoginPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const DEMO_ACCOUNTS = [
    { username: 'admin',       label: '张伟 · 超管' },
    { username: 'chenzhiyuan', label: '陈志远 · 总经理' },
    { username: 'lisi',        label: '李思 · 营销中心负责人' },
    { username: 'zhoujiu',     label: '周九 · 销售部负责人' },
    { username: 'wangwu',      label: '王五 · 普通成员' },
  ];

  const doLogin = async (u: string, pwd: string) => {
    setError('');
    setLoading(true);
    try {
      await login(u, pwd);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await doLogin(username, password);
  };

  const handleDemoLogin = (u: string) => {
    setUsername(u);
    setPassword('demo123');
    void doLogin(u, 'demo123');
  };

  return (
    <Box sx={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      bgcolor: '#050507',
      p: 2,
      position: 'relative',
      overflow: 'hidden',
      /* 动态网格背景 */
      '&::before': {
        content: '""',
        position: 'absolute',
        inset: 0,
        backgroundImage: `
          linear-gradient(rgba(0,212,255,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,212,255,0.03) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
        animation: 'fadeInUp 1.5s ease-out',
      },
      /* 径向光晕 */
      '&::after': {
        content: '""',
        position: 'absolute',
        top: '30%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '600px',
        height: '600px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(0,212,255,0.08) 0%, rgba(124,58,237,0.04) 40%, transparent 70%)',
        filter: 'blur(40px)',
        pointerEvents: 'none',
      },
    }}>
      <Card sx={{
        maxWidth: 420, width: '100%', borderRadius: 3,
        position: 'relative', zIndex: 1,
        background: 'rgba(15,17,23,0.85)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid rgba(0,212,255,0.15)',
        boxShadow: '0 0 40px rgba(0,212,255,0.08), 0 8px 32px rgba(0,0,0,0.4)',
        animation: 'fadeInUp 0.8s ease-out',
      }}>
        <CardContent sx={{ p: 4 }}>
          {/* Logo */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Box sx={{
              width: 64, height: 64, borderRadius: 3, mx: 'auto', mb: 2,
              background: 'linear-gradient(135deg, #00D4FF, #7C3AED)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: 800, fontSize: 24,
              boxShadow: '0 0 30px rgba(0,212,255,0.4), 0 0 60px rgba(124,58,237,0.2)',
              animation: 'logoGlow 3s ease-in-out infinite',
              letterSpacing: '2px',
            }}>
              OC
            </Box>
            <Typography variant="h5" sx={{
              fontWeight: 800,
              background: 'linear-gradient(135deg, #E8ECF0 20%, #00D4FF 80%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '2px',
            }}>
              OpenClaw
            </Typography>
            <Typography variant="body2" sx={{
              mt: 0.5,
              color: 'rgba(0,212,255,0.5)',
              letterSpacing: '4px',
              fontSize: 12,
            }}>
              智 能 运 营 平 台
            </Typography>
          </Box>

          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth label="用户名" value={username}
              onChange={(e) => setUsername(e.target.value)}
              sx={{
                mb: 2.5,
                '& .MuiOutlinedInput-root': {
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#00D4FF',
                    boxShadow: '0 0 12px rgba(0,212,255,0.2)',
                  },
                },
                '& .MuiInputLabel-root.Mui-focused': { color: '#00D4FF' },
              }}
              autoFocus
            />
            <TextField
              fullWidth label="密码" type="password" value={password}
              onChange={(e) => setPassword(e.target.value)}
              sx={{
                mb: 2.5,
                '& .MuiOutlinedInput-root': {
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#00D4FF',
                    boxShadow: '0 0 12px rgba(0,212,255,0.2)',
                  },
                },
                '& .MuiInputLabel-root.Mui-focused': { color: '#00D4FF' },
              }}
            />
            {error && (
              <Typography variant="body2" sx={{
                mb: 2, color: '#FF006E',
                textShadow: '0 0 8px rgba(255,0,110,0.4)',
              }}>
                {error}
              </Typography>
            )}
            <Button
              fullWidth type="submit" variant="contained" size="large"
              disabled={loading || !username || !password}
              startIcon={<Lock fontSize="small" />}
              sx={{
                py: 1.5, fontSize: 15, fontWeight: 700,
                background: 'linear-gradient(135deg, #00D4FF 0%, #7C3AED 100%)',
                letterSpacing: '3px',
                boxShadow: '0 0 20px rgba(0,212,255,0.3)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  background: 'linear-gradient(135deg, #00D4FF 0%, #7C3AED 100%)',
                  boxShadow: '0 0 30px rgba(0,212,255,0.5), 0 0 60px rgba(124,58,237,0.3)',
                  transform: 'translateY(-1px)',
                },
                '&.Mui-disabled': {
                  background: 'rgba(0,212,255,0.15)',
                  color: 'rgba(255,255,255,0.3)',
                },
              }}
            >
              {loading ? '登录中...' : '登 录'}
            </Button>
          </Box>

          <Typography variant="caption"
            sx={{
              display: 'block', textAlign: 'center', mt: 3,
              color: 'rgba(0,212,255,0.35)',
            }}>
            默认账号：admin / admin123
          </Typography>

          {/* 演示账号快速登录 */}
          <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center' }}>
            <Typography variant="caption" sx={{ width: '100%', textAlign: 'center', color: 'rgba(232,236,240,0.5)', mb: 0.5 }}>
              演示账号（点击直接登录）
            </Typography>
            {DEMO_ACCOUNTS.map((acc) => (
              <Chip
                key={acc.username}
                label={acc.label}
                size="small"
                disabled={loading}
                onClick={() => handleDemoLogin(acc.username)}
                sx={{
                  borderColor: 'rgba(0,212,255,0.35)',
                  color: 'rgba(0,212,255,0.85)',
                  fontSize: 12,
                  '&:hover': { borderColor: '#00D4FF', bgcolor: 'rgba(0,212,255,0.08)' },
                }}
              />
            ))}
          </Box>
        </CardContent>
      </Card>

      {/* 底部版本信息 */}
      <Typography variant="caption" sx={{
        position: 'absolute',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        color: 'rgba(0,212,255,0.2)',
        letterSpacing: '2px',
        fontSize: 10,
        zIndex: 1,
      }}>
        OPENCLAW v1.0 &nbsp;·&nbsp; POWERED BY AI
      </Typography>
    </Box>
  );
}
