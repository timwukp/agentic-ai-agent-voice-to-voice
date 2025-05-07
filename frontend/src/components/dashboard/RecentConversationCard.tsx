import { Card, CardActionArea, CardContent, Typography, Box, Chip } from '@mui/material';
import { Chat as ChatIcon, AccessTime as AccessTimeIcon } from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { Conversation } from '../../types';

interface RecentConversationCardProps {
  conversation: Conversation;
  onClick: (id: string) => void;
}

const RecentConversationCard = ({ conversation, onClick }: RecentConversationCardProps) => {
  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardActionArea 
        sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
        onClick={() => onClick(conversation.id)}
      >
        <CardContent sx={{ flexGrow: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <ChatIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6" component="div" noWrap>
              {conversation.title}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <AccessTimeIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              {formatDistanceToNow(new Date(conversation.lastModified), { addSuffix: true })}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
            <Chip 
              label="Continue" 
              color="primary" 
              size="small" 
              variant="outlined" 
            />
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
};

export default RecentConversationCard;