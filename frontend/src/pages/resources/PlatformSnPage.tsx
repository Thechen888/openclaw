import {
  Box, Card, CardContent, Typography, Alert, Grid, Divider,
} from '@mui/material';
import {
  Fingerprint, DeveloperBoard, Storage, Memory, Event,
  VerifiedUser, WorkspacePremium, SmartToy, People,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { PageHeader, LoadingState } from '../../components/shared';
import api from '../../api/client';

interface PlatformSn {
  serial_no: string;
  hardware_fingerprint: string;
  machine_id: string;
  cpu_signature: string;
  bound_at: string;
  platform_version: string;
  license_level: string;
  max_agents: number;
  max_users: number;
  expires_at: string;
}

const formatDateTime = (iso: string) => {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

const formatDate = (iso: string) => {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
};

interface RowProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}

function InfoRow({ icon, label, value, mono }: RowProps) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', py: 1.25 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary', minWidth: 140 }}>
        <Box sx={{ display: 'flex', color: 'text.secondary', '& svg': { fontSize: 18 } }}>{icon}</Box>
        <Typography variant="body2" color="text.secondary">{label}</Typography>
      </Box>
      <Typography
        variant="body2"
        sx={{
          flex: 1,
          fontWeight: 500,
          fontFamily: mono ? 'monospace' : undefined,
          wordBreak: 'break-all',
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}

export default function PlatformSnPage() {
  const snQ = useQuery({
    queryKey: ['platform-sn'],
    queryFn: () => api.get('/system/platform-sn'),
  });

  const sn: PlatformSn | null = snQ.data?.data?.data || null;

  return (
    <Box>
      <PageHeader
        title="平台SN"
        subtitle="平台硬件标识与授权信息（只读）"
      />

      <Alert severity="info" sx={{ mb: 3 }}>
        平台SN绑定当前硬件实例，写入配置文件后不可修改。任何迁移或复制行为需要重新授权。
      </Alert>

      {snQ.isLoading || !sn ? (
        <LoadingState />
      ) : (
        <Grid container spacing={3}>
          {/* 设备信息 */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
                  设备信息
                </Typography>
                <Divider sx={{ mb: 1 }} />
                <InfoRow
                  icon={<Fingerprint />}
                  label="序列号"
                  value={sn.serial_no}
                  mono
                />
                <InfoRow
                  icon={<DeveloperBoard />}
                  label="硬件指纹"
                  value={sn.hardware_fingerprint}
                  mono
                />
                <InfoRow
                  icon={<Storage />}
                  label="机器ID"
                  value={sn.machine_id}
                  mono
                />
                <InfoRow
                  icon={<Memory />}
                  label="CPU标识"
                  value={sn.cpu_signature}
                />
                <InfoRow
                  icon={<Event />}
                  label="绑定时间"
                  value={formatDateTime(sn.bound_at)}
                />
              </CardContent>
            </Card>
          </Grid>

          {/* 授权信息 */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
                  授权信息
                </Typography>
                <Divider sx={{ mb: 1 }} />
                <InfoRow
                  icon={<VerifiedUser />}
                  label="平台版本"
                  value={sn.platform_version}
                />
                <InfoRow
                  icon={<WorkspacePremium />}
                  label="授权等级"
                  value={
                    <Box
                      component="span"
                      sx={{
                        fontWeight: 700,
                        letterSpacing: 1,
                        color: 'primary.main',
                      }}
                    >
                      {sn.license_level}
                    </Box>
                  }
                />
                <InfoRow
                  icon={<SmartToy />}
                  label="最大Agent数"
                  value={sn.max_agents}
                />
                <InfoRow
                  icon={<People />}
                  label="最大用户数"
                  value={sn.max_users}
                />
                <InfoRow
                  icon={<Event />}
                  label="过期时间"
                  value={formatDate(sn.expires_at)}
                />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}
