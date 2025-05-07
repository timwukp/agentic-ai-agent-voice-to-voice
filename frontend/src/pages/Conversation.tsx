import { useEffect, useState } from 'react';
import { 
  Box, Container, Typography, Paper, 
  IconButton, Divider, Grid, useMediaQuery, 
  useTheme, CircularProgress 
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useTypedSelector } from '../hooks/useTypedSelector';
import { useActions } from '../hooks/useActions';
import MessageList from '../components/conversation/MessageList';
import VoiceRecorder from '../components/conversation/VoiceRecorder';
import { fetchMessages } from '../store/slices/conversationSlice';
import { useDispatch } from 'react-redux';
import { ConversationMessage } from '../types';
import { v4 as uuidv4 } from 'uuid';

const Conversation = () => {
  const { id } = useParams<{ id: string }>();
  const theme = useTheme();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const { setCurrentConversation, clearMessages } = useActions();
  const { currentConversation, messages, loading, isProcessing } = useTypedSelector(state => state.conversation);
  const [localMessages, setLocalMessages] = useState<ConversationMessage[]>([]);
  
  // Handle initial setup based on conversation ID
  useEffect(() => {
    // Clear messages when component mounts
    clearMessages();
    
    if (id && id !== 'new') {
      // Existing conversation
      dispatch(fetchMessages(id));
    } else {
      // New conversation
      setCurrentConversation(null);
      
      // Add welcome message for new conversations
      const welcomeMessage: ConversationMessage = {
        id: uuidv4(),
        content: "Hello! I'm your AI voice assistant. How can I help you today?",
        timestamp: new Date().toISOString(),
        type: 'assistant'
      };
      setLocalMessages([welcomeMessage]);
    }
    
    // Clean up when component unmounts
    return () => {
      clearMessages();
    };
  }, [id, dispatch, clearMessages, setCurrentConversation]);
  
  // Update local messages when redux messages change
  useEffect(() => {
    if (messages.length > 0) {
      setLocalMessages(messages);
    }
  }, [messages]);

  const handleBack = () => {
    navigate('/');
  };

  return (
    <Container maxWidth="md" sx={{ mt: { xs: 2, md: 4 }, height: '100%' }}>
      <Paper 
        elevation={3}
        sx={{
          height: '80vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 3,
          overflow: 'hidden',
          bgcolor: 'background.default'
        }}
      >
        {/* Header */}
        <Box sx={{ 
          p: 2, 
          bgcolor: 'background.paper',
          display: 'flex',
          alignItems: 'center',
          borderBottom: '1px solid',
          borderColor: 'divider'
        }}>
          <IconButton onClick={handleBack} sx={{ mr: 1 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1, ml: 1 }}>
            {currentConversation ? currentConversation.title : 'New Conversation'}
          </Typography>
        </Box>

        {/* Message List */}
        <Box sx={{ 
          flexGrow: 1, 
          display: 'flex', 
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <MessageList 
            messages={localMessages}
            loading={loading}
            isProcessing={isProcessing}
          />
        </Box>

        {/* Voice Controls */}
        <Box sx={{ 
          p: 2, 
          bgcolor: 'background.paper',
          borderTop: '1px solid',
          borderColor: 'divider'
        }}>
          <Grid container justifyContent="center">
            <Grid item xs={12} sm={8} md={6}>
              <VoiceRecorder />
            </Grid>
          </Grid>
        </Box>
      </Paper>
    </Container>
  );
};

export default Conversation;