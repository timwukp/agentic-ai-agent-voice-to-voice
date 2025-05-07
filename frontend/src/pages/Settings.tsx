import { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Divider,
  Switch,
  FormControlLabel,
  Button,
  Slider,
  Stack,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  SelectChangeEvent,
} from '@mui/material';
import { useActions } from '../hooks/useActions';
import { useTypedSelector } from '../hooks/useTypedSelector';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `settings-tab-${index}`,
    'aria-controls': `settings-tabpanel-${index}`,
  };
}

const Settings = () => {
  const [tabValue, setTabValue] = useState(0);
  const [voiceType, setVoiceType] = useState('female');
  const [voiceSpeed, setVoiceSpeed] = useState(1.0);
  
  const { setDarkMode } = useActions();
  const { darkMode } = useTypedSelector(state => state.ui);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleVoiceTypeChange = (event: SelectChangeEvent) => {
    setVoiceType(event.target.value);
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 6 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Settings
      </Typography>

      <Paper sx={{ mt: 4, borderRadius: 2 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="settings tabs">
            <Tab label="General" {...a11yProps(0)} />
            <Tab label="Voice" {...a11yProps(1)} />
            <Tab label="Account" {...a11yProps(2)} />
            <Tab label="Advanced" {...a11yProps(3)} />
          </Tabs>
        </Box>

        {/* General Settings */}
        <TabPanel value={tabValue} index={0}>
          <List>
            <ListItem>
              <ListItemText 
                primary="Dark Mode" 
                secondary="Switch between light and dark themes" 
              />
              <ListItemSecondaryAction>
                <Switch 
                  edge="end" 
                  checked={darkMode} 
                  onChange={() => setDarkMode(!darkMode)} 
                />
              </ListItemSecondaryAction>
            </ListItem>
            <Divider />
            <ListItem>
              <ListItemText 
                primary="Notifications" 
                secondary="Enable or disable all notifications" 
              />
              <ListItemSecondaryAction>
                <Switch edge="end" defaultChecked />
              </ListItemSecondaryAction>
            </ListItem>
            <Divider />
            <ListItem>
              <ListItemText 
                primary="Sound Effects" 
                secondary="Play sound when recording starts and ends" 
              />
              <ListItemSecondaryAction>
                <Switch edge="end" defaultChecked />
              </ListItemSecondaryAction>
            </ListItem>
          </List>
        </TabPanel>

        {/* Voice Settings */}
        <TabPanel value={tabValue} index={1}>
          <Stack spacing={4}>
            <Box>
              <Typography id="voice-type-label" gutterBottom>
                Assistant Voice
              </Typography>
              <FormControl fullWidth>
                <InputLabel id="voice-type-label">Voice Type</InputLabel>
                <Select
                  labelId="voice-type-label"
                  id="voice-type-select"
                  value={voiceType}
                  label="Voice Type"
                  onChange={handleVoiceTypeChange}
                >
                  <MenuItem value="female">Female</MenuItem>
                  <MenuItem value="male">Male</MenuItem>
                  <MenuItem value="neural">Neural (HD)</MenuItem>
                </Select>
              </FormControl>
            </Box>
            
            <Box>
              <Typography id="voice-speed-label" gutterBottom>
                Speech Rate: {voiceSpeed.toFixed(1)}x
              </Typography>
              <Slider
                aria-labelledby="voice-speed-label"
                value={voiceSpeed}
                min={0.5}
                max={2}
                step={0.1}
                onChange={(_, value) => setVoiceSpeed(value as number)}
                marks={[
                  { value: 0.5, label: '0.5x' },
                  { value: 1.0, label: '1.0x' },
                  { value: 1.5, label: '1.5x' },
                  { value: 2.0, label: '2.0x' },
                ]}
              />
            </Box>
            
            <Box>
              <Button variant="contained">
                Test Voice
              </Button>
            </Box>
          </Stack>
        </TabPanel>

        {/* Account Settings */}
        <TabPanel value={tabValue} index={2}>
          <Stack spacing={3}>
            <Typography variant="h6">Account Information</Typography>
            <List>
              <ListItem>
                <ListItemText primary="Email" secondary="user@example.com" />
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemText primary="Account Type" secondary="Premium" />
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemText primary="Usage Credits" secondary="500 minutes remaining" />
              </ListItem>
            </List>
            
            <Box sx={{ mt: 3 }}>
              <Button variant="outlined" color="secondary" sx={{ mr: 2 }}>
                Change Password
              </Button>
              <Button variant="contained" color="primary">
                Upgrade Account
              </Button>
            </Box>
          </Stack>
        </TabPanel>

        {/* Advanced Settings */}
        <TabPanel value={tabValue} index={3}>
          <Stack spacing={4}>
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Data Management
              </Typography>
              <Button variant="outlined" color="warning">
                Clear All Conversations
              </Button>
            </Box>
            
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                API Configuration
              </Typography>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>AI Model</InputLabel>
                <Select
                  defaultValue="bedrock-nova"
                  label="AI Model"
                >
                  <MenuItem value="bedrock-nova">Amazon Bedrock Nova</MenuItem>
                  <MenuItem value="bedrock-claude">Amazon Bedrock Claude</MenuItem>
                  <MenuItem value="custom">Custom API</MenuItem>
                </Select>
              </FormControl>
            </Box>
            
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Privacy
              </Typography>
              <FormControlLabel 
                control={<Switch defaultChecked />} 
                label="Save conversation history" 
              />
            </Box>
          </Stack>
        </TabPanel>
      </Paper>
    </Container>
  );
};

export default Settings;