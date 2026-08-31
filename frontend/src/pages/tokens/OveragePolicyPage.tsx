import { useState } from 'react';
import {
  Box, Card, CardContent, Typography, Grid, TextField, Button,
  Switch, FormControlLabel, RadioGroup, Radio, FormControl,
  FormLabel, Chip, Divider, Alert, Autocomplete,
} from '@mui/material';
import { Save, RestartAlt, Notifications, Shield, PersonOff } from '@mui/icons-material';
import { PageHeader } from '../../components/shared';

const MOCK_NOTIFY_PEOPLE = [
  { label: '管理员 (admin)', value: 'admin' },
  { label: '张三 (EMP001)', value: 'zhangsan' },
  { label: '李四 (EMP002)', value: 'lisi' },
  { label: '运维组 (ops-group)', value: 'ops-group' },
];

export default function OveragePolicyPage() {
  // 卡片1：个人Token超限策略
  const [personalPolicy, setPersonalPolicy] = useState({
    strategy: 'block', // block | warn
    alert_enabled: true,
    alert_threshold: 80,
    notify_in_app: true,
    notify_wechat: false,
    notify_email: false,
  });

  // 卡片2：资源池额度告警
  const [adminPolicy, setAdminPolicy] = useState({
    account_alert_enabled: true,
    account_alert_threshold: 85,
    account_alert_people: [] as any[],
  });

  // 卡片3：告警通知人配置
  const [notifyPeople, setNotifyPeople] = useState<any[]>([
    { label: '管理员 (admin)', value: 'admin' },
  ]);
  const [notifyChannels, setNotifyChannels] = useState({
    in_app: true,
    wechat: true,
    email: false,
    sms: false,
  });

  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleReset = () => {
    setPersonalPolicy({ strategy: 'block', alert_enabled: true, alert_threshold: 80, notify_in_app: true, notify_wechat: false, notify_email: false });
    setAdminPolicy({ account_alert_enabled: true, account_alert_threshold: 85, account_alert_people: [] });
    setNotifyPeople([{ label: '管理员 (admin)', value: 'admin' }]);
    setNotifyChannels({ in_app: true, wechat: true, email: false, sms: false });
  };

  return (
    <Box>
      <PageHeader title="超额策略" subtitle="配置 Token 超限后的处理方式和告警通知规则" />

      {saved && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSaved(false)}>策略配置已保存</Alert>}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* =================== 卡片1：个人Token超限策略 =================== */}
        <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <PersonOff color="primary" />
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>个人 Token 超限策略</Typography>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
              当个人额度及其可用资源池共享额度均耗尽后
            </Typography>

            <FormControl sx={{ mb: 2 }}>
              <FormLabel sx={{ fontSize: 13, fontWeight: 600, mb: 1 }}>超限后策略</FormLabel>
              <RadioGroup value={personalPolicy.strategy} onChange={e => setPersonalPolicy({ ...personalPolicy, strategy: e.target.value })}>
                <FormControlLabel value="block" control={<Radio size="small" />} label={
                  <Box>
                    <Typography variant="body2">当日/当月停用</Typography>
                    <Typography variant="caption" color="text.secondary">提示用户「额度已用完，请联系管理员」</Typography>
                  </Box>
                } />
                <FormControlLabel value="warn" control={<Radio size="small" />} label={
                  <Box>
                    <Typography variant="body2">仅警告不限制</Typography>
                    <Typography variant="caption" color="text.secondary">继续使用，仅管理员收到通知</Typography>
                  </Box>
                } />
              </RadioGroup>
            </FormControl>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Switch checked={personalPolicy.alert_enabled} onChange={e => setPersonalPolicy({ ...personalPolicy, alert_enabled: e.target.checked })} />
              <Typography variant="body2">启用提前提醒</Typography>
            </Box>

            {personalPolicy.alert_enabled && (
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid size={4}>
                  <TextField fullWidth size="small" label="触发阈值 (%)" type="number" value={personalPolicy.alert_threshold} onChange={e => setPersonalPolicy({ ...personalPolicy, alert_threshold: Number(e.target.value) })} helperText="达到此百分比时提醒" />
                </Grid>
                <Grid size={8}>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>提醒方式</Typography>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <FormControlLabel control={<Switch size="small" checked={personalPolicy.notify_in_app} onChange={e => setPersonalPolicy({ ...personalPolicy, notify_in_app: e.target.checked })} />} label="站内消息" />
                    <FormControlLabel control={<Switch size="small" checked={personalPolicy.notify_wechat} onChange={e => setPersonalPolicy({ ...personalPolicy, notify_wechat: e.target.checked })} />} label="企业微信" />
                    <FormControlLabel control={<Switch size="small" checked={personalPolicy.notify_email} onChange={e => setPersonalPolicy({ ...personalPolicy, notify_email: e.target.checked })} />} label="邮件" />
                  </Box>
                </Grid>
              </Grid>
            )}
          </CardContent>
        </Card>

        {/* =================== 卡片2：管理员Token超限策略 =================== */}
        <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Shield color="primary" />
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>资源池额度告警</Typography>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
              资源池共享额度接近耗尽时的告警规则
            </Typography>

            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>平台公共账户总额度告警</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Switch checked={adminPolicy.account_alert_enabled} onChange={e => setAdminPolicy({ ...adminPolicy, account_alert_enabled: e.target.checked })} />
              <Typography variant="body2">启用账户总额度告警</Typography>
            </Box>

            {adminPolicy.account_alert_enabled && (
              <Grid container spacing={2}>
                <Grid size={4}>
                  <TextField fullWidth size="small" label="告警阈值 (%)" type="number" value={adminPolicy.account_alert_threshold} onChange={e => setAdminPolicy({ ...adminPolicy, account_alert_threshold: Number(e.target.value) })} />
                </Grid>
                <Grid size={8}>
                  <Autocomplete
                    multiple
                    options={MOCK_NOTIFY_PEOPLE}
                    value={adminPolicy.account_alert_people}
                    onChange={(_, v) => setAdminPolicy({ ...adminPolicy, account_alert_people: v })}
                    renderInput={(params) => <TextField {...params} size="small" label="告警通知人" placeholder="选择通知人..." />}
                  />
                </Grid>
              </Grid>
            )}
          </CardContent>
        </Card>

        {/* =================== 卡片3：告警通知人配置 =================== */}
        <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Notifications color="primary" />
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>告警通知人配置</Typography>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
              全局告警通知接收人，当触发任何 Token 相关告警时通知
            </Typography>

            <Grid container spacing={2}>
              <Grid size={6}>
                <Autocomplete
                  multiple
                  options={MOCK_NOTIFY_PEOPLE}
                  value={notifyPeople}
                  onChange={(_, v) => setNotifyPeople(v)}
                  renderInput={(params) => <TextField {...params} label="通知人" placeholder="选择通知人..." />}
                />
              </Grid>
              <Grid size={6}>
                <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>通知渠道</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  <Chip label="站内消息" variant={notifyChannels.in_app ? 'filled' : 'outlined'} color={notifyChannels.in_app ? 'primary' : 'default'} onClick={() => setNotifyChannels({ ...notifyChannels, in_app: !notifyChannels.in_app })} clickable />
                  <Chip label="企业微信" variant={notifyChannels.wechat ? 'filled' : 'outlined'} color={notifyChannels.wechat ? 'primary' : 'default'} onClick={() => setNotifyChannels({ ...notifyChannels, wechat: !notifyChannels.wechat })} clickable />
                  <Chip label="邮件" variant={notifyChannels.email ? 'filled' : 'outlined'} color={notifyChannels.email ? 'primary' : 'default'} onClick={() => setNotifyChannels({ ...notifyChannels, email: !notifyChannels.email })} clickable />
                  <Chip label="短信" variant={notifyChannels.sms ? 'filled' : 'outlined'} color={notifyChannels.sms ? 'primary' : 'default'} onClick={() => setNotifyChannels({ ...notifyChannels, sms: !notifyChannels.sms })} clickable />
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* =================== 底部操作栏 =================== */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, pt: 1 }}>
          <Button variant="outlined" startIcon={<RestartAlt />} onClick={handleReset}>恢复默认</Button>
          <Button variant="contained" startIcon={<Save />} onClick={handleSave}>保存配置</Button>
        </Box>
      </Box>
    </Box>
  );
}
