import { useState } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Button, Chip, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress,
} from '@mui/material';
import { RestartAlt, Warning, CheckCircle, Error, Cloud, Storage, SmartToy, Hub } from '@mui/icons-material';
import { useMutation } from '@tanstack/react-query';
import { PageHeader } from '../../components/shared';
import { systemRestartApi } from '../../api/client';

interface ServiceItem {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  risk: 'low' | 'medium' | 'high';
}

const services: ServiceItem[] = [
  {
    id: 'api',
    name: 'API Server',
    description: 'Main REST API service handling all HTTP requests',
    icon: <Cloud sx={{ fontSize: 32 }} />,
    color: 'primary',
    risk: 'high',
  },
  {
    id: 'worker',
    name: 'Worker Service',
    description: 'Background job processor for async tasks',
    icon: <SmartToy sx={{ fontSize: 32 }} />,
    color: 'info',
    risk: 'medium',
  },
  {
    id: 'scheduler',
    name: 'Scheduler',
    description: 'Cron and scheduled task executor',
    icon: <Hub sx={{ fontSize: 32 }} />,
    color: 'secondary',
    risk: 'low',
  },
  {
    id: 'cache',
    name: 'Cache Service',
    description: 'Redis cache layer for session and data caching',
    icon: <Storage sx={{ fontSize: 32 }} />,
    color: 'warning',
    risk: 'medium',
  },
];

const riskLabels: Record<string, { label: string; color: 'success' | 'warning' | 'error' }> = {
  low: { label: 'Low Risk', color: 'success' },
  medium: { label: 'Medium Risk', color: 'warning' },
  high: { label: 'High Risk', color: 'error' },
};

export default function RestartPage() {
  const [confirmService, setConfirmService] = useState<ServiceItem | null>(null);
  const [lastResult, setLastResult] = useState<{ service: string; success: boolean } | null>(null);

  const restartMutation = useMutation({
    mutationFn: (service: string) => systemRestartApi.restart(service),
    onSuccess: (_, service) => {
      setLastResult({ service, success: true });
      setConfirmService(null);
    },
    onError: (_, service) => {
      setLastResult({ service, success: false });
      setConfirmService(null);
    },
  });

  const handleRestart = () => {
    if (confirmService) {
      restartMutation.mutate(confirmService.id);
    }
  };

  return (
    <Box>
      <PageHeader
        title="服务重启"
        subtitle="重启平台服务（生产环境请谨慎操作）"
      />

      {lastResult && (
        <Alert
          severity={lastResult.success ? 'success' : 'error'}
          onClose={() => setLastResult(null)}
          sx={{ mb: 3 }}
        >
          {lastResult.success
            ? `Service "${lastResult.service}" restart initiated successfully. It may take a few seconds to come back online.`
            : `Failed to restart service "${lastResult.service}". Please check logs for details.`
          }
        </Alert>
      )}

      <Alert severity="warning" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>Warning:</strong> Restarting services will cause temporary downtime. Ensure you have proper authorization before proceeding.
          Production restarts should follow your organization's change management process.
        </Typography>
      </Alert>

      <Grid container spacing={2}>
        {services.map((service) => (
          <Grid size={{ xs: 12, sm: 6, md: 6 }} key={service.id}>
            <Card
              sx={{
                height: '100%',
                borderLeft: 4,
                borderColor: `${service.color}.main`,
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{
                      width: 56, height: 56, borderRadius: 2,
                      bgcolor: `${service.color}.light`, color: `${service.color}.dark`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {service.icon}
                    </Box>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>{service.name}</Typography>
                      <Chip
                        label={riskLabels[service.risk].label}
                        size="small"
                        color={riskLabels[service.risk].color}
                        variant="outlined"
                        sx={{ mt: 0.5, fontSize: 10, height: 20 }}
                      />
                    </Box>
                  </Box>
                </Box>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {service.description}
                </Typography>

                <Button
                  variant="outlined"
                  color="warning"
                  startIcon={restartMutation.isPending && restartMutation.variables === service.id ? <CircularProgress size={16} /> : <RestartAlt />}
                  onClick={() => setConfirmService(service)}
                  disabled={restartMutation.isPending}
                  fullWidth
                >
                  {restartMutation.isPending && restartMutation.variables === service.id ? 'Restarting...' : 'Restart Service'}
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Confirmation Dialog */}
      <Dialog open={!!confirmService} onClose={() => setConfirmService(null)}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 600 }}>
          <Warning color="warning" />
          Confirm Service Restart
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Are you sure you want to restart <strong>{confirmService?.name}</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This will cause temporary service interruption. Active connections may be dropped and in-progress requests may fail.
          </Typography>
          {confirmService?.risk === 'high' && (
            <Alert severity="error" sx={{ mt: 2 }}>
              This is a high-risk service. Restarting it will affect all users.
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmService(null)}>Cancel</Button>
          <Button variant="contained" color="warning" onClick={handleRestart} startIcon={<RestartAlt />}>
            Restart
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
