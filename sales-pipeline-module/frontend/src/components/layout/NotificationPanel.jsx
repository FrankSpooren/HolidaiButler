/**
 * Notification Panel - Dropdown notification list
 */

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Popover,
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Button,
  Divider,
  IconButton,
  Chip
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  CheckCircle as CheckIcon,
  Close as CloseIcon,
  TaskAlt as TaskIcon,
  Handshake as DealIcon,
  Email as EmailIcon,
  Event as EventIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import useNotificationStore from '../../store/notificationStore';

const getNotificationIcon = (type) => {
  switch (type) {
    case 'task':
      return <TaskIcon />;
    case 'deal':
      return <DealIcon />;
    case 'email':
      return <EmailIcon />;
    case 'meeting':
      return <EventIcon />;
    case 'alert':
      return <WarningIcon />;
    default:
      return <NotificationsIcon />;
  }
};

const getNotificationColor = (type) => {
  switch (type) {
    case 'task':
      return 'primary';
    case 'deal':
      return 'success';
    case 'email':
      return 'info';
    case 'meeting':
      return 'secondary';
    case 'alert':
      return 'warning';
    default:
      return 'default';
  }
};

const NotificationPanel = ({ anchorEl, open, onClose }) => {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    fetchNotifications,
    markAsRead,
    markAllAsRead
  } = useNotificationStore();

  useEffect(() => {
    if (open) {
      fetchNotifications({ limit: 10 });
    }
  }, [open, fetchNotifications]);

  const handleNotificationClick = async (notification) => {
    if (!notification.readAt) {
      await markAsRead(notification.id);
    }

    // Navigate based on notification type
    if (notification.link) {
      navigate(notification.link);
    } else if (notification.dealId) {
      navigate(`/deals/${notification.dealId}`);
    } else if (notification.taskId) {
      navigate('/tasks');
    } else if (notification.contactId) {
      navigate(`/contacts/${notification.contactId}`);
    }

    onClose();
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
  };

  return (
    <Popover
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'right'
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right'
      }}
      PaperProps={{
        sx: {
          width: 380,
          maxHeight: 480,
          overflow: 'hidden',
          mt: 1
        }
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid',
          borderColor: 'divider'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Notifications
          </Typography>
          {unreadCount > 0 && (
            <Chip
              size="small"
              label={unreadCount}
              color="primary"
              sx={{ height: 20, fontSize: '0.75rem' }}
            />
          )}
        </Box>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Mark all as read */}
      {unreadCount > 0 && (
        <Box sx={{ px: 2, py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Button
            size="small"
            startIcon={<CheckIcon />}
            onClick={handleMarkAllRead}
            sx={{ textTransform: 'none' }}
          >
            Mark all as read
          </Button>
        </Box>
      )}

      {/* Notification List */}
      <Box sx={{ overflow: 'auto', maxHeight: 320 }}>
        {notifications.length > 0 ? (
          <List disablePadding>
            {notifications.map((notification) => (
              <ListItem
                key={notification.id}
                alignItems="flex-start"
                onClick={() => handleNotificationClick(notification)}
                sx={{
                  cursor: 'pointer',
                  bgcolor: notification.readAt ? 'transparent' : 'action.hover',
                  '&:hover': {
                    bgcolor: 'action.selected'
                  }
                }}
              >
                <ListItemAvatar>
                  <Avatar
                    sx={{
                      bgcolor: `${getNotificationColor(notification.type)}.light`,
                      color: `${getNotificationColor(notification.type)}.dark`,
                      width: 40,
                      height: 40
                    }}
                  >
                    {getNotificationIcon(notification.type)}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Typography
                      variant="subtitle2"
                      sx={{
                        fontWeight: notification.readAt ? 400 : 600
                      }}
                    >
                      {notification.title}
                    </Typography>
                  }
                  secondary={
                    <>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}
                      >
                        {notification.message}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ mt: 0.5, display: 'block' }}
                      >
                        {formatDistanceToNow(new Date(notification.createdAt), {
                          addSuffix: true
                        })}
                      </Typography>
                    </>
                  }
                />
                {!notification.readAt && (
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: 'primary.main',
                      mt: 1.5
                    }}
                  />
                )}
              </ListItem>
            ))}
          </List>
        ) : (
          <Box
            sx={{
              p: 4,
              textAlign: 'center',
              color: 'text.secondary'
            }}
          >
            <NotificationsIcon sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
            <Typography variant="body2">No notifications yet</Typography>
          </Box>
        )}
      </Box>

      {/* Footer */}
      <Divider />
      <Box sx={{ p: 1.5, textAlign: 'center' }}>
        <Button
          size="small"
          onClick={() => {
            navigate('/settings/notifications');
            onClose();
          }}
          sx={{ textTransform: 'none' }}
        >
          View all notifications
        </Button>
      </Box>
    </Popover>
  );
};

export default NotificationPanel;
