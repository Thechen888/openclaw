import { Box, Card, CardContent, Typography, TextField, Button, useTheme } from '@mui/material';
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      bgcolor: 'background.default',
      p: 2,
    }}>
      <Card sx={{ maxWidth: 400, width: '100%', borderRadius: 3 }}>
        <CardContent sx={{ p: 4 }}>
          {/* Logo */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Box sx={{
              width: 56, height: 56, borderRadius: 3, mx: 'auto', mb: 2,
              background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: 700, fontSize: 22,
            }}>
              OC
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>OpenClaw</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              智能运营平台
            </Typography>
          </Box>

          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth label="用户名" value={username}
              onChange={(e) => setUsername(e.target.value)}
              sx={{ mb: 2 }} autoFocus
            />
            <TextField
              fullWidth label="密码" type="password" value={password}
              onChange={(e) => setPassword(e.target.value)}
              sx={{ mb: 2 }}
            />
            {error && (
              <Typography variant="body2" color="error" sx={{ mb: 2 }}>
                {error}
              </Typography>
            )}
            <Button
              fullWidth type="submit" variant="contained" size="large"
              disabled={loading || !username || !password}
              startIcon={<Lock fontSize="small" />}
              sx={{ py: 1.5, fontSize: 15, fontWeight: 600 }}
            >
              {loading ? '登录中...' : '登 录'}
            </Button>
          </Box>

          <Typography variant="caption" color="text.secondary"
            sx={{ display: 'block', textAlign: 'center', mt: 3 }}>
            默认账号：admin / admin123
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
