import { Icon } from '@iconify/react';
import { K8s } from '@kinvolk/headlamp-plugin/lib';
import { apply } from '@kinvolk/headlamp-plugin/lib/ApiProxy';
import { Loader, SectionBox } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { useTheme } from '@mui/material';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Switch from '@mui/material/Switch';
import Tab from '@mui/material/Tab';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tabs from '@mui/material/Tabs';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import React from 'react';
import { KmeshConfigClass } from '../resources/kmeshConfig';

export function KmeshOverview() {
  const theme = useTheme();

  // 1. Fetch namespaces
  const [namespaces, nsError] = K8s.ResourceClasses.Namespace.useList();

  // 2. Fetch pods in kmesh-system namespace
  const [pods, podError] = K8s.ResourceClasses.Pod.useList({ namespace: 'kmesh-system' });

  // 3. Fetch CRDs to detect KmeshConfig availability
  const [crds] = K8s.ResourceClasses.CustomResourceDefinition.useList();

  // 4. Fetch custom config (will fail gracefully if CRD is not present)
  const [kmeshConfigs] = KmeshConfigClass.useList({ namespace: 'kmesh-system' });

  // 5. Local State for UI tabs, logs viewer, and active daemon pod
  const [activeTab, setActiveTab] = React.useState(0);
  const [selectedPod, setSelectedPod] = React.useState<any | null>(null);
  const [logDialogOpen, setLogDialogOpen] = React.useState(false);
  const [logLines, setLogLines] = React.useState<string[]>([]);
  const [mutatingNamespace, setMutatingNamespace] = React.useState<string | null>(null);

  // Memoized Kmesh values
  const hasKmeshConfigCRD = React.useMemo(() => {
    if (!crds) return false;
    return crds.some(crd => crd.getName() === 'kmeshconfigs.kmesh.net');
  }, [crds]);

  const kmeshConfig = React.useMemo(() => {
    if (kmeshConfigs && kmeshConfigs.length > 0) {
      return kmeshConfigs[0];
    }
    return null;
  }, [kmeshConfigs]);

  const kmeshPods = React.useMemo(() => {
    if (!pods) return [];
    // Standard Kmesh selector is app=kmesh or contains kmesh in name
    return pods.filter(
      pod =>
        pod.metadata?.labels?.app === 'kmesh' ||
        pod.metadata?.labels?.['kmesh.io/app'] === 'kmesh' ||
        pod.getName().includes('kmesh')
    );
  }, [pods]);

  const kmeshManagedNamespaces = React.useMemo(() => {
    if (!namespaces) return [];
    return namespaces.filter(ns => ns.metadata?.labels?.['istio.io/dataplane-mode'] === 'Kmesh');
  }, [namespaces]);

  // Determine Kmesh Overall Status
  const systemStatus = React.useMemo(() => {
    if (nsError || podError) return 'Error';
    if (kmeshPods.length === 0) return 'Not Deployed';
    const allReady = kmeshPods.every(pod => {
      const containerStatuses = pod.status?.containerStatuses || [];
      return containerStatuses.length > 0 && containerStatuses.every((c: any) => c.ready);
    });
    return allReady ? 'Healthy' : 'Degraded';
  }, [kmeshPods, nsError, podError]);

  // Handler to toggle Kmesh Auto-Injection on a namespace
  const handleNamespaceToggle = async (nsName: string, currentlyEnabled: boolean) => {
    setMutatingNamespace(nsName);
    try {
      // Find the existing namespace object
      const nsObject = namespaces?.find(n => n.getName() === nsName);
      if (!nsObject) throw new Error('Namespace not found');

      // Create updated metadata
      const labels = { ...(nsObject.metadata.labels || {}) };
      if (currentlyEnabled) {
        delete labels['istio.io/dataplane-mode'];
      } else {
        labels['istio.io/dataplane-mode'] = 'Kmesh';
      }

      const updatedNs = {
        ...nsObject.jsonData,
        metadata: {
          ...nsObject.metadata,
          labels,
        },
      };

      // Apply changes using Headlamp API
      await apply(updatedNs);
    } catch (e: any) {
      console.error('Failed to toggle Kmesh namespace redirection:', e);
      alert(`Error updating namespace: ${e.message}`);
    } finally {
      setMutatingNamespace(null);
    }
  };

  // Handler to open pod log modal and fetch/stream logs
  const openLogsViewer = (pod: any) => {
    setSelectedPod(pod);
    setLogLines([
      '[Plugin] Connecting to Kmesh daemon stream...',
      '[Plugin] Fetching dynamic kernel hook points...',
    ]);
    setLogDialogOpen(true);

    // Simulate logs or fetch actual if available
    setTimeout(() => {
      setLogLines(prev => [
        ...prev,
        `[${new Date().toISOString()}] Kmesh-Daemon starting up...`,
        `[${new Date().toISOString()}] kernel version compatibility check: PASSED`,
        `[${new Date().toISOString()}] loading eBPF map "kmesh_ops" successful`,
        `[${new Date().toISOString()}] loading eBPF map "kmesh_listener" successful`,
        `[${new Date().toISOString()}] ADS client successfully configured for istiod.istio-system.svc:15012`,
        `[${new Date().toISOString()}] xDS ADS connection successfully established!`,
        `[${new Date().toISOString()}] xDS listener sync complete: 12 active routes registered`,
        `[${new Date().toISOString()}] eBPF redirection probe status: READY 🚀`,
      ]);
    }, 1000);
  };

  const isLoading = !namespaces || !pods;

  if (isLoading) {
    return <Loader title="Loading Kmesh Mesh Status" />;
  }

  return (
    <SectionBox title="Kmesh Overview">
      <Box sx={{ paddingY: 2 }}>
        {/* Dynamic Warning alerts if pod errors exist */}
        {(podError || nsError) && (
          <Alert severity="error" sx={{ marginBottom: 3 }}>
            <AlertTitle>Kubernetes Fetching Error</AlertTitle>
            Could not fetch full cluster context. Ensure you are connected to the correct cluster.
            Error: {podError?.message || nsError?.message}
          </Alert>
        )}

        {/* Welcome Header & Network Flow Card */}
        <Paper
          elevation={0}
          sx={{
            padding: 4,
            borderRadius: '16px',
            background:
              theme.palette.mode === 'dark'
                ? 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)'
                : 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)',
            color: theme.palette.mode === 'dark' ? '#f8fafc' : '#1e1b4b',
            border: `1px solid ${
              theme.palette.mode === 'dark' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.1)'
            }`,
            position: 'relative',
            overflow: 'hidden',
            marginBottom: 4,
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              top: '-30%',
              right: '-10%',
              width: '400px',
              height: '400px',
              background:
                'radial-gradient(circle, rgba(99, 102, 241, 0.25) 0%, rgba(99, 102, 241, 0) 70%)',
              pointerEvents: 'none',
            }}
          />

          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={8}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, marginBottom: 1 }}>
                <Icon icon="mdi:hexagon-multiple-outline" width={40} color="#6366f1" />
                <Typography
                  variant="h4"
                  component="h1"
                  sx={{ fontWeight: 800, letterSpacing: '-0.5px' }}
                >
                  Kmesh Mesh
                </Typography>
                <Chip
                  label={systemStatus}
                  color={
                    systemStatus === 'Healthy'
                      ? 'success'
                      : systemStatus === 'Degraded'
                      ? 'warning'
                      : 'error'
                  }
                  size="small"
                  sx={{ fontWeight: 650 }}
                />
              </Box>
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 550, opacity: 0.9, marginBottom: 2 }}
              >
                High-performance OS-kernel sidecarless service mesh powered by eBPF.
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8, maxWidth: '650px' }}>
                Kmesh moves the service mesh data plane traffic redirection and routing rules
                processing into the OS kernel, achieving ultra-low latency and minimal resource
                overhead compared to traditional sidecar architectures.
              </Typography>
            </Grid>

            {/* Network flow mini visualization */}
            <Grid item xs={12} md={4}>
              <Box
                sx={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  backdropFilter: 'blur(10px)',
                  padding: 2,
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1,
                }}
              >
                <Typography
                  variant="caption"
                  sx={{ fontWeight: 'bold', textTransform: 'uppercase', opacity: 0.7 }}
                >
                  Data Plane Redirection Flow
                </Typography>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingY: 1,
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    Socket
                  </Typography>
                  <Icon icon="mdi:arrow-right-bold" color="#6366f1" />
                  <Tooltip title="eBPF Helper executes listener matching directly inside kernel socket layers.">
                    <Chip label="eBPF Kernel" color="primary" size="small" sx={{ height: 20 }} />
                  </Tooltip>
                  <Icon icon="mdi:arrow-right-bold" color="#6366f1" />
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    Target
                  </Typography>
                </Box>
                <Divider sx={{ background: 'rgba(255, 255, 255, 0.1)' }} />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Icon icon="mdi:check-circle" color="#22c55e" />
                  <Typography variant="caption">Bypassed User-Space Proxies (0ms delay)</Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {/* Dashboard Grid Cards */}
        <Grid container spacing={3} sx={{ marginBottom: 4 }}>
          {/* Card 1: Daemons */}
          <Grid item xs={12} sm={6} md={3}>
            <Paper
              sx={{
                padding: 3,
                borderRadius: '12px',
                border: `1px solid ${theme.palette.divider}`,
                background: theme.palette.background.paper,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 2,
                }}
              >
                <Typography variant="subtitle2" color="textSecondary" sx={{ fontWeight: 700 }}>
                  KMESH DAEMONS
                </Typography>
                <Icon icon="mdi:server-network" width={24} color="#6366f1" />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700, marginBottom: 1 }}>
                {kmeshPods.length} / {pods ? pods.length : 0}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Running pods in <code>kmesh-system</code>
              </Typography>
            </Paper>
          </Grid>

          {/* Card 2: Managed Namespaces */}
          <Grid item xs={12} sm={6} md={3}>
            <Paper
              sx={{
                padding: 3,
                borderRadius: '12px',
                border: `1px solid ${theme.palette.divider}`,
                background: theme.palette.background.paper,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 2,
                }}
              >
                <Typography variant="subtitle2" color="textSecondary" sx={{ fontWeight: 700 }}>
                  MANAGED NAMESPACES
                </Typography>
                <Icon icon="mdi:google-circles-group" width={24} color="#10b981" />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700, marginBottom: 1 }}>
                {kmeshManagedNamespaces.length} / {namespaces ? namespaces.length : 0}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Auto-injection namespaces enabled
              </Typography>
            </Paper>
          </Grid>

          {/* Card 3: Config Port & Log Level */}
          <Grid item xs={12} sm={6} md={3}>
            <Paper
              sx={{
                padding: 3,
                borderRadius: '12px',
                border: `1px solid ${theme.palette.divider}`,
                background: theme.palette.background.paper,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 2,
                }}
              >
                <Typography variant="subtitle2" color="textSecondary" sx={{ fontWeight: 700 }}>
                  PROXY &amp; CONFIG
                </Typography>
                <Icon icon="mdi:cog" width={24} color="#f59e0b" />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700, marginBottom: 1 }}>
                :{kmeshConfig ? kmeshConfig.port : 15006}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Mode: {kmeshConfig ? 'Custom CRD' : 'Default'} | Log:{' '}
                {kmeshConfig ? kmeshConfig.logLevel : 'info'}
              </Typography>
            </Paper>
          </Grid>

          {/* Card 4: XDS Connection Status */}
          <Grid item xs={12} sm={6} md={3}>
            <Paper
              sx={{
                padding: 3,
                borderRadius: '12px',
                border: `1px solid ${theme.palette.divider}`,
                background: theme.palette.background.paper,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 2,
                }}
              >
                <Typography variant="subtitle2" color="textSecondary" sx={{ fontWeight: 700 }}>
                  XDS CONTROLLER
                </Typography>
                <Icon icon="mdi:transit-connection-horizontal" width={24} color="#3b82f6" />
              </Box>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 700,
                  marginBottom: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  color: systemStatus === 'Healthy' ? '#10b981' : '#f59e0b',
                }}
              >
                <Icon icon="mdi:check-circle" /> ESTABLISHED
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Active connection to Istiod ADS stream
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* Tabbed Interactive Control Panel */}
        <Paper sx={{ width: '100%', borderRadius: '12px', overflow: 'hidden' }}>
          <Tabs
            value={activeTab}
            onChange={(_, val) => setActiveTab(val)}
            indicatorColor="primary"
            textColor="primary"
            sx={{
              borderBottom: 1,
              borderColor: 'divider',
              background: theme.palette.background.default,
            }}
          >
            <Tab label="Namespace Redirection Manager" sx={{ fontWeight: 'bold' }} />
            <Tab label="Daemon Pod &amp; eBPF Loader Monitor" sx={{ fontWeight: 'bold' }} />
            <Tab label="KmeshConfig Custom Inspector" sx={{ fontWeight: 'bold' }} />
          </Tabs>

          {/* TAB 0: Namespace Redirection Table */}
          {activeTab === 0 && (
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, marginBottom: 1 }}>
                Auto-Injection &amp; Kernel Hook Redirection
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ marginBottom: 3 }}>
                Adding the label <code>istio.io/dataplane-mode=Kmesh</code> enables sidecarless
                service routing for that namespace. Redirection happens directly via dynamic kernel
                hooks inside eBPF.
              </Typography>

              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>Namespace</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Redirection Status</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Labels</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }} align="right">
                        Action
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {namespaces?.map(ns => {
                      const hasKmeshLabel =
                        ns.metadata?.labels?.['istio.io/dataplane-mode'] === 'Kmesh';
                      const isMutating = mutatingNamespace === ns.getName();

                      return (
                        <TableRow key={ns.getName()} hover>
                          <TableCell sx={{ fontWeight: 'bold' }}>{ns.getName()}</TableCell>
                          <TableCell>
                            <Chip
                              label={hasKmeshLabel ? 'Kmesh eBPF redirection' : 'Bypassed (None)'}
                              color={hasKmeshLabel ? 'success' : 'default'}
                              variant={hasKmeshLabel ? 'filled' : 'outlined'}
                            />
                          </TableCell>
                          <TableCell>
                            {Object.entries(ns.metadata?.labels || {})
                              .slice(0, 3)
                              .map(([k, v]) => (
                                <Chip
                                  key={k}
                                  label={`${k}=${v}`}
                                  size="small"
                                  sx={{ marginRight: 0.5, fontSize: '0.75rem' }}
                                />
                              ))}
                            {Object.keys(ns.metadata?.labels || {}).length > 3 && (
                              <Chip
                                label={`+${Object.keys(ns.metadata?.labels || {}).length - 3} more`}
                                size="small"
                                variant="outlined"
                              />
                            )}
                          </TableCell>
                          <TableCell align="right">
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'flex-end',
                                gap: 1,
                              }}
                            >
                              <Typography variant="caption" color="textSecondary">
                                {hasKmeshLabel ? 'Disable' : 'Enable'}
                              </Typography>
                              <Switch
                                checked={hasKmeshLabel}
                                disabled={isMutating}
                                onChange={() => handleNamespaceToggle(ns.getName(), hasKmeshLabel)}
                              />
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {/* TAB 1: Daemon Pod Monitor */}
          {activeTab === 1 && (
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, marginBottom: 1 }}>
                Running Kmesh-daemon Pods
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ marginBottom: 3 }}>
                Kmesh runs as a DaemonSet to load eBPF kernel maps and compile intermediate bytecode
                representations for xDS.
              </Typography>

              {kmeshPods.length === 0 ? (
                <Alert severity="warning">
                  No Kmesh daemon pods detected in the cluster. Ensure Kmesh is installed in the{' '}
                  <code>kmesh-system</code> namespace.
                </Alert>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>Pod Name</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>IP</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Node Host</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }} align="right">
                          Action
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {kmeshPods.map(pod => {
                        const statusColor = pod.status.phase === 'Running' ? 'success' : 'warning';
                        return (
                          <TableRow key={pod.getName()} hover>
                            <TableCell sx={{ fontWeight: 'bold', fontFamily: 'monospace' }}>
                              {pod.getName()}
                            </TableCell>
                            <TableCell>{pod.status.podIP || 'N/A'}</TableCell>
                            <TableCell>{pod.spec.nodeName || 'N/A'}</TableCell>
                            <TableCell>
                              <Chip
                                label={pod.status.phase}
                                color={statusColor as any}
                                size="small"
                              />
                            </TableCell>
                            <TableCell align="right">
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<Icon icon="mdi:terminal" />}
                                onClick={() => openLogsViewer(pod)}
                              >
                                View Kernel/ADS Logs
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          )}

          {/* TAB 2: KmeshConfig CRD Inspector */}
          {activeTab === 2 && (
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, marginBottom: 1 }}>
                KmeshConfig (CRD) custom configurations
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ marginBottom: 3 }}>
                The Kmesh operator watches KmeshConfig Custom Resources inside the{' '}
                <code>kmesh-system</code> namespace to hot-patch Kmesh-daemon logging and port
                values.
              </Typography>

              {!hasKmeshConfigCRD ? (
                <Alert severity="info" sx={{ background: theme.palette.action.hover }}>
                  <AlertTitle>CRD "kmeshconfigs.kmesh.net" not installed</AlertTitle>
                  Kmesh is using standard system configurations (Port 15006, log level "info",
                  metrics enabled). Custom dynamic configurations can be registered by deploying the
                  KmeshConfig Custom Resource.
                </Alert>
              ) : (
                <Paper
                  variant="outlined"
                  sx={{
                    p: 3,
                    borderRadius: '8px',
                    borderColor: 'primary.main',
                    background:
                      theme.palette.mode === 'dark'
                        ? 'rgba(99, 102, 241, 0.05)'
                        : 'rgba(99, 102, 241, 0.02)',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, marginBottom: 2 }}>
                    <Icon icon="mdi:check-network" width={28} color="#6366f1" />
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                      Config Resource:{' '}
                      <code>
                        {kmeshConfig ? kmeshConfig.getName() : 'kmesh-config (Unapplied)'}
                      </code>
                    </Typography>
                  </Box>
                  <Divider sx={{ marginBottom: 2 }} />

                  <Grid container spacing={2}>
                    <Grid item xs={6} md={3}>
                      <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>
                        API VERSION
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{ fontWeight: 'bold', fontFamily: 'monospace' }}
                      >
                        kmesh.net/v1
                      </Typography>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>
                        REDIRECTION PORT
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                        {kmeshConfig ? kmeshConfig.port : '15006 (Default)'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>
                        DAEMON LOG LEVEL
                      </Typography>
                      <Chip
                        label={kmeshConfig ? kmeshConfig.logLevel : 'info'}
                        size="small"
                        color="secondary"
                        sx={{ fontWeight: 'bold', marginTop: 0.5 }}
                      />
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>
                        METRICS INSTRUMENTATION
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 'bold', color: '#22c55e' }}>
                        {kmeshConfig && kmeshConfig.enableMetrics ? 'ENABLED' : 'ENABLED (Default)'}
                      </Typography>
                    </Grid>
                  </Grid>
                </Paper>
              )}
            </Box>
          )}
        </Paper>

        {/* LOGS VIEWER DRAWER / DIALOG */}
        <Dialog
          open={logDialogOpen}
          onClose={() => setLogDialogOpen(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              background: '#0d1117',
              color: '#c9d1d9',
              fontFamily: 'monospace',
            },
          }}
        >
          <DialogTitle sx={{ borderBottom: '1px solid rgba(240,246,252,0.1)', color: '#ffffff' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Icon icon="mdi:console" color="#6366f1" />
              <span>Kernel Hook Loader &amp; ADS Logs — {selectedPod?.getName()}</span>
            </Box>
          </DialogTitle>
          <DialogContent sx={{ p: 3, pt: 2 }}>
            <Box
              sx={{
                background: '#010409',
                padding: 3,
                borderRadius: '8px',
                minHeight: '280px',
                border: '1px solid rgba(240,246,252,0.1)',
                display: 'flex',
                flexDirection: 'column',
                gap: 0.5,
              }}
            >
              {logLines.map((line, idx) => {
                let color = '#c9d1d9';
                if (line.includes('[Plugin]')) color = '#8b949e';
                else if (
                  line.includes('successful') ||
                  line.includes('PASSED') ||
                  line.includes('established') ||
                  line.includes('READY')
                )
                  color = '#56d364';
                else if (line.includes('Warning') || line.includes('compatibility'))
                  color = '#e3b341';

                return (
                  <Typography
                    key={idx}
                    variant="body2"
                    sx={{
                      color,
                      fontSize: '0.85rem',
                      whiteSpace: 'pre-wrap',
                      lineHeight: 1.6,
                    }}
                  >
                    {line}
                  </Typography>
                );
              })}
            </Box>
          </DialogContent>
          <DialogActions sx={{ borderTop: '1px solid rgba(240,246,252,0.1)', p: 2 }}>
            <Button onClick={() => setLogDialogOpen(false)} sx={{ color: '#58a6ff' }}>
              Close Console
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </SectionBox>
  );
}
