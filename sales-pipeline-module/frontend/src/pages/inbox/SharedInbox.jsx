/**
 * Shared Inbox Page - Team email inbox management
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemAvatar,
  Avatar,
  IconButton,
  Chip,
  TextField,
  InputAdornment,
  Button,
  Divider,
  Menu,
  MenuItem,
  Badge,
  Tooltip,
  Tabs,
  Tab,
  Paper,
  Skeleton
} from '@mui/material';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Archive as ArchiveIcon,
  Delete as DeleteIcon,
  Reply as ReplyIcon,
  Forward as ForwardIcon,
  MoreVert as MoreIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Label as LabelIcon,
  Person as PersonIcon,
  AttachFile as AttachIcon,
  Schedule as ScheduleIcon,
  Inbox as InboxIcon,
  Send as SendIcon,
  Drafts as DraftsIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { sharedInboxAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';

// Message List Item
const MessageItem = ({ message, selected, onClick, onStar }) => (
  <ListItemButton
    selected={selected}
    onClick={() => onClick(message)}
    sx={{
      borderLeft: message.readAt ? 'none' : '3px solid',
      borderColor: 'primary.main',
      bgcolor: message.readAt ? 'transparent' : 'action.hover'
    }}
  >
    <ListItemAvatar>
      <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.dark' }}>
        {message.from?.charAt(0)?.toUpperCase() || 'U'}
      </Avatar>
    </ListItemAvatar>
    <ListItemText
      primary={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography
            variant="subtitle2"
            fontWeight={message.readAt ? 400 : 600}
            noWrap
            sx={{ flex: 1 }}
          >
            {message.from}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
          </Typography>
        </Box>
      }
      secondary={
        <>
          <Typography
            variant="body2"
            fontWeight={message.readAt ? 400 : 500}
            noWrap
            color="text.primary"
          >
            {message.subject}
          </Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            {message.preview}
          </Typography>
        </>
      }
    />
    <IconButton
      size="small"
      onClick={(e) => {
        e.stopPropagation();
        onStar(message.id);
      }}
    >
      {message.starred ? (
        <StarIcon sx={{ color: 'warning.main' }} fontSize="small" />
      ) : (
        <StarBorderIcon fontSize="small" />
      )}
    </IconButton>
  </ListItemButton>
);

// Message View
const MessageView = ({ message, onReply, onForward, onArchive, onDelete, onAssign }) => {
  const [anchorEl, setAnchorEl] = useState(null);

  if (!message) {
    return (
      <Box
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'text.secondary'
        }}
      >
        <InboxIcon sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
        <Typography variant="h6">Select a message to view</Typography>
        <Typography variant="body2">
          Choose a message from the list to read its contents
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Typography variant="h6" fontWeight={600}>
            {message.subject}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Tooltip title="Reply">
              <IconButton size="small" onClick={() => onReply(message)}>
                <ReplyIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Forward">
              <IconButton size="small" onClick={() => onForward(message)}>
                <ForwardIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Archive">
              <IconButton size="small" onClick={() => onArchive(message.id)}>
                <ArchiveIcon />
              </IconButton>
            </Tooltip>
            <IconButton size="small" onClick={(e) => setAnchorEl(e.currentTarget)}>
              <MoreIcon />
            </IconButton>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.dark' }}>
            {message.from?.charAt(0)?.toUpperCase()}
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2" fontWeight={600}>
              {message.from}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              To: {message.to} &bull; {new Date(message.createdAt).toLocaleString()}
            </Typography>
          </Box>
          {message.assignedTo && (
            <Chip
              icon={<PersonIcon />}
              label={`Assigned to ${message.assignedTo.firstName}`}
              size="small"
              color="primary"
              variant="outlined"
            />
          )}
        </Box>
      </Box>

      {/* Message Body */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        <Typography
          variant="body1"
          sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}
        >
          {message.body || message.content}
        </Typography>

        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Attachments ({message.attachments.length})
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {message.attachments.map((attachment, index) => (
                <Chip
                  key={index}
                  icon={<AttachIcon />}
                  label={attachment.name}
                  variant="outlined"
                  onClick={() => {}}
                />
              ))}
            </Box>
          </Box>
        )}
      </Box>

      {/* Quick Reply */}
      <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <TextField
          fullWidth
          multiline
          rows={2}
          placeholder="Type a quick reply..."
          variant="outlined"
          size="small"
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton color="primary">
                  <SendIcon />
                </IconButton>
              </InputAdornment>
            )
          }}
        />
      </Box>

      {/* Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem onClick={() => { onAssign(message); setAnchorEl(null); }}>
          <PersonIcon sx={{ mr: 1 }} fontSize="small" /> Assign to...
        </MenuItem>
        <MenuItem onClick={() => setAnchorEl(null)}>
          <LabelIcon sx={{ mr: 1 }} fontSize="small" /> Add label
        </MenuItem>
        <MenuItem onClick={() => setAnchorEl(null)}>
          <ScheduleIcon sx={{ mr: 1 }} fontSize="small" /> Snooze
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => { onDelete(message.id); setAnchorEl(null); }} sx={{ color: 'error.main' }}>
          <DeleteIcon sx={{ mr: 1 }} fontSize="small" /> Delete
        </MenuItem>
      </Menu>
    </Box>
  );
};

const SharedInbox = () => {
  const { inboxId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [inboxes, setInboxes] = useState([]);
  const [currentInbox, setCurrentInbox] = useState(null);
  const [messages, setMessages] = useState([]);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [filterAnchor, setFilterAnchor] = useState(null);

  useEffect(() => {
    loadInboxes();
  }, []);

  useEffect(() => {
    if (inboxId && inboxes.length > 0) {
      const inbox = inboxes.find((i) => i.id === inboxId);
      if (inbox) {
        setCurrentInbox(inbox);
        loadMessages(inbox.id);
      }
    } else if (inboxes.length > 0) {
      setCurrentInbox(inboxes[0]);
      loadMessages(inboxes[0].id);
    }
  }, [inboxId, inboxes]);

  const loadInboxes = async () => {
    try {
      const { data } = await sharedInboxAPI.getInboxes();
      setInboxes(data.data || []);
    } catch (error) {
      // Use mock data
      setInboxes([
        { id: '1', name: 'Sales', email: 'sales@company.com', unreadCount: 5 },
        { id: '2', name: 'Support', email: 'support@company.com', unreadCount: 12 }
      ]);
    }
  };

  const loadMessages = async (id) => {
    setLoading(true);
    try {
      const { data } = await sharedInboxAPI.getMessages(id, { tab: ['inbox', 'sent', 'drafts'][activeTab] });
      setMessages(data.data?.messages || data.data || []);
    } catch (error) {
      // Use mock data
      setMessages([
        {
          id: '1',
          from: 'John Smith <john@acme.com>',
          to: 'sales@company.com',
          subject: 'Re: Enterprise License Inquiry',
          preview: 'Thank you for the information. We would like to schedule a demo...',
          body: 'Hi,\n\nThank you for the information about your enterprise licensing options. We would like to schedule a demo to discuss this further with our team.\n\nCould you please let us know your availability for next week?\n\nBest regards,\nJohn Smith\nAcme Corporation',
          createdAt: new Date().toISOString(),
          readAt: null,
          starred: true,
          attachments: []
        },
        {
          id: '2',
          from: 'Sarah Johnson <sarah@techstart.io>',
          to: 'sales@company.com',
          subject: 'Partnership Opportunity',
          preview: 'I came across your platform and I think there could be a great synergy...',
          body: 'Hello,\n\nI came across your platform and I think there could be a great synergy between our companies. We are looking for a CRM solution for our growing team.\n\nWould you be open to a brief call to discuss?\n\nThanks,\nSarah Johnson\nTechStart.io',
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          readAt: new Date().toISOString(),
          starred: false,
          attachments: [{ name: 'requirements.pdf', size: 125000 }]
        },
        {
          id: '3',
          from: 'Michael Chen <mchen@globaltech.com>',
          to: 'sales@company.com',
          subject: 'Quote Request - 50 Users',
          preview: 'We need a quote for 50 user licenses for our sales team...',
          body: 'Hi Sales Team,\n\nWe need a quote for 50 user licenses for our sales team. We are interested in the Professional plan with WhatsApp integration.\n\nPlease include any volume discounts available.\n\nRegards,\nMichael Chen\nGlobal Tech Solutions',
          createdAt: new Date(Date.now() - 7200000).toISOString(),
          readAt: null,
          starred: false,
          attachments: []
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectMessage = async (message) => {
    setSelectedMessage(message);
    if (!message.readAt && currentInbox) {
      try {
        await sharedInboxAPI.markAsRead(currentInbox.id, message.id);
        setMessages((prev) =>
          prev.map((m) => (m.id === message.id ? { ...m, readAt: new Date().toISOString() } : m))
        );
      } catch (error) {
        // Handle silently
      }
    }
  };

  const handleStar = async (messageId) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, starred: !m.starred } : m))
    );
  };

  const handleArchive = async (messageId) => {
    if (currentInbox) {
      try {
        await sharedInboxAPI.archive(currentInbox.id, messageId);
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
        if (selectedMessage?.id === messageId) {
          setSelectedMessage(null);
        }
      } catch (error) {
        // Handle error
      }
    }
  };

  const handleRefresh = () => {
    if (currentInbox) {
      loadMessages(currentInbox.id);
    }
  };

  const filteredMessages = messages.filter(
    (m) =>
      m.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.from?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.preview?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const unreadCount = messages.filter((m) => !m.readAt).length;

  return (
    <Box sx={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>
            Shared Inbox
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {currentInbox?.name || 'Select an inbox'} &bull; {unreadCount} unread messages
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="contained" startIcon={<SendIcon />}>
            Compose
          </Button>
        </Box>
      </Box>

      {/* Main Content */}
      <Card sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Inbox Sidebar */}
        <Box
          sx={{
            width: 200,
            borderRight: '1px solid',
            borderColor: 'divider',
            display: { xs: 'none', md: 'block' }
          }}
        >
          <List disablePadding>
            {inboxes.map((inbox) => (
              <ListItemButton
                key={inbox.id}
                selected={currentInbox?.id === inbox.id}
                onClick={() => {
                  setCurrentInbox(inbox);
                  navigate(`/inbox/${inbox.id}`);
                }}
              >
                <ListItemText primary={inbox.name} />
                {inbox.unreadCount > 0 && (
                  <Badge badgeContent={inbox.unreadCount} color="primary" />
                )}
              </ListItemButton>
            ))}
          </List>
        </Box>

        {/* Message List */}
        <Box sx={{ width: 400, borderRight: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: 'column' }}>
          {/* Tabs */}
          <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tab icon={<InboxIcon />} iconPosition="start" label="Inbox" />
            <Tab icon={<SendIcon />} iconPosition="start" label="Sent" />
            <Tab icon={<DraftsIcon />} iconPosition="start" label="Drafts" />
          </Tabs>

          {/* Search & Filters */}
          <Box sx={{ p: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={handleRefresh}>
                      <RefreshIcon />
                    </IconButton>
                    <IconButton size="small" onClick={(e) => setFilterAnchor(e.currentTarget)}>
                      <FilterIcon />
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
          </Box>

          {/* Message List */}
          <List sx={{ flex: 1, overflow: 'auto', p: 0 }}>
            {loading ? (
              Array(5)
                .fill(0)
                .map((_, i) => (
                  <ListItem key={i}>
                    <ListItemAvatar>
                      <Skeleton variant="circular" width={40} height={40} />
                    </ListItemAvatar>
                    <ListItemText
                      primary={<Skeleton width={150} />}
                      secondary={<Skeleton width={250} />}
                    />
                  </ListItem>
                ))
            ) : filteredMessages.length > 0 ? (
              filteredMessages.map((message) => (
                <MessageItem
                  key={message.id}
                  message={message}
                  selected={selectedMessage?.id === message.id}
                  onClick={handleSelectMessage}
                  onStar={handleStar}
                />
              ))
            ) : (
              <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
                <InboxIcon sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
                <Typography>No messages found</Typography>
              </Box>
            )}
          </List>
        </Box>

        {/* Message View */}
        <Box sx={{ flex: 1 }}>
          <MessageView
            message={selectedMessage}
            onReply={() => {}}
            onForward={() => {}}
            onArchive={handleArchive}
            onDelete={() => {}}
            onAssign={() => {}}
          />
        </Box>
      </Card>

      {/* Filter Menu */}
      <Menu anchorEl={filterAnchor} open={Boolean(filterAnchor)} onClose={() => setFilterAnchor(null)}>
        <MenuItem>All Messages</MenuItem>
        <MenuItem>Unread</MenuItem>
        <MenuItem>Starred</MenuItem>
        <MenuItem>With Attachments</MenuItem>
        <Divider />
        <MenuItem>Assigned to Me</MenuItem>
        <MenuItem>Unassigned</MenuItem>
      </Menu>
    </Box>
  );
};

export default SharedInbox;
