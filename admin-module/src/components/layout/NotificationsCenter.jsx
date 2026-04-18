import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  IconButton, Badge, Popover, Box, Typography, Button,
  List, ListItem, ListItemIcon, ListItemText, Chip, Tooltip
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import PublishIcon from '@mui/icons-material/Publish';
import CampaignIcon from '@mui/icons-material/Campaign';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import CloseIcon from '@mui/icons-material/Close';
import client from '../../api/client.js';
import { tokens } from '../../theme/tokens.js';

const TYPE_CONFIG = {
  success:            { icon: CheckCircleOutlineIcon, color: tokens.semantic.success },
  info:               { icon: InfoOutlinedIcon,       color: tokens.semantic.info },
  warning:            { icon: WarningAmberIcon,       color: tokens.semantic.warning },
  error:              { icon: ErrorOutlineIcon,       color: tokens.semantic.error },
  ai_complete:        { icon: AutoAwesomeIcon,        color: tokens.brand.teal },
  publish_success:    { icon: PublishIcon,             color: tokens.semantic.success },
  publish_failed:     { icon: PublishIcon,             color: tokens.semantic.error },
  campaign_ready:     { icon: CampaignIcon,           color: tokens.brand.gold },
  content_suggestion: { icon: LightbulbIcon,          color: tokens.brand.teal },
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "zojuist";
  if (mins < 60) return mins + "m geleden";
  const hours = Math.floor(mins / 60);
  if (hours < 24) return hours + "u geleden";
  const days = Math.floor(hours / 24);
  if (days < 7) return days + "d geleden";
  return new Date(dateStr).toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
}

function groupByDay(notifications) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);
  const groups = { today: [], yesterday: [], thisWeek: [], older: [] };
  for (const n of notifications) {
    const d = new Date(n.created_at); d.setHours(0, 0, 0, 0);
    if (d >= today) groups.today.push(n);
    else if (d >= yesterday) groups.yesterday.push(n);
    else if (d >= weekAgo) groups.thisWeek.push(n);
    else groups.older.push(n);
  }
  return groups;
}

export default function NotificationsCenter() {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const intervalRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const { data } = await client.get("/notifications?limit=20");
      if (data.success) {
        setNotifications(data.data.notifications);
        setUnread(data.data.unread);
      }
    } catch (e) { /* silent polling */ }
  }, []);

  useEffect(() => {
    fetchNotifications();
    intervalRef.current = setInterval(fetchNotifications, 30000);
    return () => clearInterval(intervalRef.current);
  }, [fetchNotifications]);

  const handleOpen = (e) => { setAnchorEl(e.currentTarget); fetchNotifications(); };

  const handleMarkRead = async (id) => {
    try {
      await client.patch("/notifications/" + id + "/read");
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
      setUnread(prev => Math.max(0, prev - 1));
    } catch (e) { /* silent */ }
  };

  const handleMarkAllRead = async () => {
    try {
      await client.post("/notifications/read-all");
      setNotifications(prev => prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
      setUnread(0);
    } catch (e) { /* silent */ }
  };

  const handleDismiss = async (id, e) => {
    e.stopPropagation();
    try {
      await client.delete("/notifications/" + id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (e2) { /* silent */ }
  };

  const handleClickNotification = (n) => {
    if (!n.read_at) handleMarkRead(n.id);
    if (n.action_url) { setAnchorEl(null); const [path, query] = n.action_url.split("?"); navigate(path); if (query) { const params = new URLSearchParams(query); const tab = params.get("tab"); if (tab !== null) { setTimeout(() => window.dispatchEvent(new CustomEvent("hb:content-studio-tab", { detail: parseInt(tab) })), 100); } } }
  };

  const open = Boolean(anchorEl);
  const groups = groupByDay(notifications);

  const renderGroup = (label, items) => {
    if (!items.length) return null;
    return (
      <Box key={label}>
        <Typography variant="caption" sx={{ px: 2, py: 0.5, display: "block", color: "text.secondary", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", fontSize: "0.65rem" }}>
          {label}
        </Typography>
        <List disablePadding>
          {items.map(n => {
            const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.info;
            const Icon = cfg.icon;
            const isUnread = !n.read_at;
            return (
              <ListItem
                key={n.id}
                onClick={() => handleClickNotification(n)}
                sx={{
                  cursor: "pointer", px: 2, py: 1,
                  bgcolor: isUnread ? "rgba(2, 195, 154, 0.04)" : "transparent",
                  "&:hover": { bgcolor: "action.hover" },
                  borderLeft: isUnread ? "3px solid " + tokens.brand.teal : "3px solid transparent",
                }}
                secondaryAction={
                  <Tooltip title="Verwijderen">
                    <IconButton size="small" onClick={(e) => handleDismiss(n.id, e)} sx={{ opacity: 0.5, "&:hover": { opacity: 1 } }}>
                      <CloseIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Tooltip>
                }
              >
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <Icon sx={{ fontSize: 20, color: cfg.color }} />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography variant="body2" sx={{ fontWeight: isUnread ? 600 : 400, fontSize: "0.8rem", pr: 3 }}>
                      {n.title}
                    </Typography>
                  }
                  secondary={
                    <Box>
                      <Typography variant="caption" sx={{ color: "text.secondary", display: "block", fontSize: "0.7rem", pr: 3 }}>
                        {n.message && n.message.length > 80 ? n.message.slice(0, 80) + "..." : n.message}
                      </Typography>
                      <Box sx={{ display: "flex", gap: 1, mt: 0.5, alignItems: "center" }}>
                        <Typography variant="caption" sx={{ color: "text.disabled", fontSize: "0.65rem" }}>
                          {timeAgo(n.created_at)}
                        </Typography>
                        {n.action_label && (
                          <Chip label={n.action_label} size="small" sx={{ height: 18, fontSize: "0.6rem", bgcolor: tokens.brand.tealDim, color: tokens.brand.teal }} />
                        )}
                      </Box>
                    </Box>
                  }
                />
              </ListItem>
            );
          })}
        </List>
      </Box>
    );
  };

  return (
    <>
      <Tooltip title="Notificaties">
        <IconButton onClick={handleOpen} size="small" color="inherit">
          <Badge badgeContent={unread} color="error" max={99}
            sx={{ "& .MuiBadge-badge": { fontSize: "0.65rem", height: 16, minWidth: 16 } }}
          >
            <NotificationsIcon fontSize="small" />
          </Badge>
        </IconButton>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { sx: { width: 400, maxHeight: 520, bgcolor: "background.paper", border: "1px solid " + tokens.border.subtle } } }}
      >
        <Box sx={{ px: 2, py: 1.5, display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid " + tokens.border.subtle }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Notificaties {unread > 0 && <Chip label={unread} size="small" color="primary" sx={{ ml: 1, height: 18, fontSize: "0.65rem" }} />}
          </Typography>
          {unread > 0 && (
            <Button size="small" startIcon={<DoneAllIcon sx={{ fontSize: 14 }} />} onClick={handleMarkAllRead}
              sx={{ fontSize: "0.7rem", textTransform: "none", color: tokens.brand.teal }}
            >
              Alles gelezen
            </Button>
          )}
        </Box>

        <Box sx={{ overflowY: "auto", maxHeight: 440 }}>
          {notifications.length === 0 ? (
            <Box sx={{ p: 4, textAlign: "center" }}>
              <NotificationsIcon sx={{ fontSize: 40, color: "text.disabled", mb: 1 }} />
              <Typography variant="body2" color="text.secondary">Geen notificaties</Typography>
            </Box>
          ) : (
            <>
              {renderGroup("Vandaag", groups.today)}
              {renderGroup("Gisteren", groups.yesterday)}
              {renderGroup("Deze week", groups.thisWeek)}
              {renderGroup("Eerder", groups.older)}
            </>
          )}
        </Box>
      </Popover>
    </>
  );
}
