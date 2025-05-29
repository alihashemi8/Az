import React, { useState, useEffect } from "react";
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { 
  Box, 
  Button, 
  Container, 
  Grid, 
  Paper, 
  TextField, 
  Typography, 
  Select, 
  MenuItem, 
  InputLabel, 
  FormControl,
  Divider,
  Chip,
  List,
  ListItem,
  ListItemText,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  Snackbar
} from '@mui/material';

const NUM_USERS = 100000;
const NUM_TESTS = 10;
const NUM_SUBJECTS = 5;
const COLORS_COUNT = NUM_TESTS * NUM_SUBJECTS;
const BITS_PER_COLOR = 2;
const BITS_PER_USER = COLORS_COUNT * BITS_PER_COLOR;
const BYTES_PER_USER = Math.ceil(BITS_PER_USER / 8);

const COLOR_CODES = {
  red: 0,
  yellow: 1,
  green: 2,
  blue: 3,
};

const COLOR_NAMES = ["قرمز", "زرد", "سبز", "آبی"];
const COLOR_VARIANTS = ['error', 'warning', 'success', 'info'];

const theme = createTheme({
  direction: 'rtl',
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
  typography: {
    fontFamily: 'IRANSans, Arial, sans-serif',
  },
});

function randomColorCode() {
  return Math.floor(Math.random() * 4);
}

const createDataArray = () => new Uint8Array(BYTES_PER_USER * NUM_USERS);

function setColor(dataArray, userIndex, testIndex, subjectIndex, colorCode) {
  const colorIndex = testIndex * NUM_SUBJECTS + subjectIndex;
  const bitPos = userIndex * BITS_PER_USER + colorIndex * BITS_PER_COLOR;
  const bytePos = Math.floor(bitPos / 8);
  const bitOffset = bitPos % 8;

  dataArray[bytePos] &= ~(3 << bitOffset);
  dataArray[bytePos] |= (colorCode & 3) << bitOffset;

  if (bitOffset > 6) {
    dataArray[bytePos + 1] &= ~(3 >> (8 - bitOffset));
    dataArray[bytePos + 1] |= (colorCode & 3) >> (8 - bitOffset);
  }
}

function getColor(dataArray, userIndex, testIndex, subjectIndex) {
  const colorIndex = testIndex * NUM_SUBJECTS + subjectIndex;
  const bitPos = userIndex * BITS_PER_USER + colorIndex * BITS_PER_COLOR;
  const bytePos = Math.floor(bitPos / 8);
  const bitOffset = bitPos % 8;

  let value = (dataArray[bytePos] >> bitOffset) & 3;

  if (bitOffset > 6) {
    const nextBits = dataArray[bytePos + 1] & ((1 << (bitOffset - 6)) - 1);
    value |= nextBits << (8 - bitOffset);
  }

  return value;
}

function App() {
  const [dataArray, setDataArray] = useState(null);
  const [userId, setUserId] = useState(1);
  const [testId, setTestId] = useState(1);
  const [subjectId, setSubjectId] = useState(1);
  const [selectedColor, setSelectedColor] = useState(0);
  const [topN, setTopN] = useState(10);
  const [activeTab, setActiveTab] = useState('edit');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [stats, setStats] = useState({
    averages: [],
    topBlue: [],
    topTest: [],
    topOverall: []
  });

  // تولید داده‌های رندوم و مقداردهی اولیه
  useEffect(() => {
    const arr = createDataArray();
    for (let u = 0; u < NUM_USERS; u++) {
      for (let t = 0; t < NUM_TESTS; t++) {
        for (let s = 0; s < NUM_SUBJECTS; s++) {
          setColor(arr, u, t, s, randomColorCode());
        }
      }
    }
    setDataArray(arr);
  }, []);

  const showSnackbar = (message, severity = 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleSetColor = () => {
    if (!dataArray) return;

    if (
      userId < 1 ||
      userId > NUM_USERS ||
      testId < 1 ||
      testId > NUM_TESTS ||
      subjectId < 1 ||
      subjectId > NUM_SUBJECTS
    ) {
      showSnackbar("مقادیر وارد شده نامعتبر است", 'error');
      return;
    }

    const newData = new Uint8Array(dataArray);
    setColor(newData, userId - 1, testId - 1, subjectId - 1, selectedColor);
    setDataArray(newData);
    showSnackbar(`رنگ درس ${subjectId} آزمون ${testId} برای شرکت‌کننده ${userId} ذخیره شد.`, 'success');
  };

  const handleGetColor = () => {
    if (!dataArray) return;

    if (
      userId < 1 ||
      userId > NUM_USERS ||
      testId < 1 ||
      testId > NUM_TESTS ||
      subjectId < 1 ||
      subjectId > NUM_SUBJECTS
    ) {
      showSnackbar("مقادیر وارد شده نامعتبر است", 'error');
      return;
    }

    const colorCode = getColor(dataArray, userId - 1, testId - 1, subjectId - 1);
    showSnackbar(`رنگ ذخیره شده: ${COLOR_NAMES[colorCode]} (کد ${colorCode})`, 'info');
  };

  const calcAverage = () => {
    if (!dataArray) return;

    let sumByTestSubject = Array(NUM_TESTS)
      .fill(0)
      .map(() => Array(NUM_SUBJECTS).fill(0));

    for (let u = 0; u < NUM_USERS; u++) {
      for (let t = 0; t < NUM_TESTS; t++) {
        for (let s = 0; s < NUM_SUBJECTS; s++) {
          sumByTestSubject[t][s] += getColor(dataArray, u, t, s);
        }
      }
    }

    const averages = sumByTestSubject.map(test => 
      test.map(sum => parseFloat((sum / NUM_USERS).toFixed(2)))
    );

    setStats(prev => ({ ...prev, averages }));
    setActiveTab('averages');
    showSnackbar('میانگین پاسخ‌ها محاسبه شد', 'success');
  };

  const topNBlueInTestSubject = () => {
    if (!dataArray) return;

    if (testId < 1 || testId > NUM_TESTS || subjectId < 1 || subjectId > NUM_SUBJECTS) {
      showSnackbar("مقادیر آزمون یا درس نامعتبر است", 'error');
      return;
    }

    let blueUsers = [];
    for (let u = 0; u < NUM_USERS; u++) {
      const color = getColor(dataArray, u, testId - 1, subjectId - 1);
      if (color === 3) {
        blueUsers.push(u + 1);
        if (blueUsers.length >= topN) break;
      }
    }

    setStats(prev => ({ ...prev, topBlue: blueUsers }));
    setActiveTab('topBlue');
    showSnackbar(`${blueUsers.length} نفر با رنگ آبی یافت شد`, 'info');
  };

  const topNInTestWeighted = () => {
    if (!dataArray) return;

    if (testId < 1 || testId > NUM_TESTS) {
      showSnackbar("شماره آزمون نامعتبر است", 'error');
      return;
    }

    let scores = [];
    for (let u = 0; u < NUM_USERS; u++) {
      let score = 0;
      for (let s = 0; s < NUM_SUBJECTS; s++) {
        const c = getColor(dataArray, u, testId - 1, s);
        score += c * (s + 1);
      }
      scores.push({ user: u + 1, score });
    }

    scores.sort((a, b) => b.score - a.score);
    const topUsers = scores.slice(0, topN);

    setStats(prev => ({ ...prev, topTest: topUsers }));
    setActiveTab('topTest');
    showSnackbar(`نتایج ${topN} نفر برتر آزمون محاسبه شد`, 'success');
  };

  const topNInAllTests = () => {
    if (!dataArray) return;

    let scores = [];
    for (let u = 0; u < NUM_USERS; u++) {
      let totalScore = 0;
      for (let t = 0; t < NUM_TESTS; t++) {
        for (let s = 0; s < NUM_SUBJECTS; s++) {
          const c = getColor(dataArray, u, t, s);
          totalScore += c * (s + 1);
        }
      }
      scores.push({ user: u + 1, score: totalScore });
    }

    scores.sort((a, b) => b.score - a.score);
    const topUsers = scores.slice(0, topN);

    setStats(prev => ({ ...prev, topOverall: topUsers }));
    setActiveTab('topOverall');
    showSnackbar(`نتایج ${topN} نفر برتر کل آزمون‌ها محاسبه شد`, 'success');
  };

  return (
    <ThemeProvider theme={theme}>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Paper elevation={3} sx={{ p: 3 }}>
          <Typography variant="h4" component="h1" gutterBottom align="center" color="primary">
            سیستم مدیریت نتایج آزمون‌ها
          </Typography>
          
          <Typography variant="subtitle1" gutterBottom align="center">
            مدیریت رنگ‌بندی پاسخ‌های {NUM_USERS.toLocaleString()} شرکت‌کننده در {NUM_TESTS} آزمون
          </Typography>

          <Divider sx={{ my: 3 }} />

          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Paper elevation={2} sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  ویرایش نتایج
                </Typography>

                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label={`شناسه شرکت‌کننده (1-${NUM_USERS})`}
                      type="number"
                      value={userId}
                      onChange={(e) => setUserId(Math.max(1, Math.min(NUM_USERS, parseInt(e.target.value) || 1)))}
                      InputProps={{ inputProps: { min: 1, max: NUM_USERS } }}
                    />
                  </Grid>

                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label={`شماره آزمون (1-${NUM_TESTS})`}
                      type="number"
                      value={testId}
                      onChange={(e) => setTestId(Math.max(1, Math.min(NUM_TESTS, parseInt(e.target.value) || 1)))}
                      InputProps={{ inputProps: { min: 1, max: NUM_TESTS } }}
                    />
                  </Grid>

                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label={`شماره درس (1-${NUM_SUBJECTS})`}
                      type="number"
                      value={subjectId}
                      onChange={(e) => setSubjectId(Math.max(1, Math.min(NUM_SUBJECTS, parseInt(e.target.value) || 1)))}
                      InputProps={{ inputProps: { min: 1, max: NUM_SUBJECTS } }}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      <InputLabel>رنگ</InputLabel>
                      <Select
                        value={selectedColor}
                        onChange={(e) => setSelectedColor(e.target.value)}
                        label="رنگ"
                      >
                        {COLOR_NAMES.map((name, index) => (
                          <MenuItem key={index} value={index}>
                            <Chip 
                              label={name} 
                              color={COLOR_VARIANTS[index]} 
                              sx={{ width: '100%' }}
                            />
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={6}>
                    <Button
                      fullWidth
                      variant="contained"
                      color="primary"
                      onClick={handleSetColor}
                      size="large"
                    >
                      ذخیره رنگ
                    </Button>
                  </Grid>

                  <Grid item xs={6}>
                    <Button
                      fullWidth
                      variant="outlined"
                      color="primary"
                      onClick={handleGetColor}
                      size="large"
                    >
                      نمایش رنگ
                    </Button>
                  </Grid>
                </Grid>
              </Paper>

              <Paper elevation={2} sx={{ p: 2, mt: 3 }}>
                <Typography variant="h6" gutterBottom>
                  آمارگیری
                </Typography>

                <TextField
                  fullWidth
                  label="تعداد نتایج (N)"
                  type="number"
                  value={topN}
                  onChange={(e) => setTopN(Math.max(1, parseInt(e.target.value) || 10))}
                  InputProps={{ inputProps: { min: 1 } }}
                  sx={{ mb: 2 }}
                />

                <Grid container spacing={1}>
                  <Grid item xs={12}>
                    <Button
                      fullWidth
                      variant="contained"
                      color="secondary"
                      onClick={calcAverage}
                      sx={{ mb: 1 }}
                    >
                      محاسبه میانگین
                    </Button>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Button
                      fullWidth
                      variant="outlined"
                      color="info"
                      onClick={topNBlueInTestSubject}
                      sx={{ mb: 1 }}
                    >
                      برترین‌های درس
                    </Button>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Button
                      fullWidth
                      variant="outlined"
                      color="info"
                      onClick={topNInTestWeighted}
                      sx={{ mb: 1 }}
                    >
                      برترین‌های آزمون
                    </Button>
                  </Grid>
                  <Grid item xs={12}>
                    <Button
                      fullWidth
                      variant="outlined"
                      color="success"
                      onClick={topNInAllTests}
                    >
                      برترین‌های کلی
                    </Button>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            <Grid item xs={12} md={8}>
              <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
                {activeTab === 'averages' && (
                  <div>
                    <Typography variant="h6" gutterBottom>
                      میانگین پاسخ‌ها در آزمون‌ها و دروس
                    </Typography>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>آزمون / درس</TableCell>
                            {Array.from({ length: NUM_SUBJECTS }, (_, i) => (
                              <TableCell key={i} align="center">درس {i+1}</TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {stats.averages.map((test, testIndex) => (
                            <TableRow key={testIndex}>
                              <TableCell>آزمون {testIndex + 1}</TableCell>
                              {test.map((avg, subjectIndex) => (
                                <TableCell 
                                  key={subjectIndex} 
                                  align="center"
                                  sx={{ 
                                    backgroundColor: `rgba(${
                                      avg === 0 ? '255,0,0' : 
                                      avg === 1 ? '255,255,0' : 
                                      avg === 2 ? '0,255,0' : '0,0,255'
                                    }, ${0.1 + avg * 0.2})` 
                                  }}
                                >
                                  {avg.toFixed(2)}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </div>
                )}

                {activeTab === 'topBlue' && (
                  <div>
                    <Typography variant="h6" gutterBottom>
                      {stats.topBlue.length} نفر برتر با رنگ آبی در آزمون {testId} درس {subjectId}
                    </Typography>
                    <List dense>
                      {stats.topBlue.map((user, index) => (
                        <ListItem key={user}>
                          <ListItemText 
                            primary={`${index + 1}. شرکت‌کننده ${user}`} 
                            secondary={`آزمون ${testId} - درس ${subjectId}`}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </div>
                )}

                {activeTab === 'topTest' && (
                  <div>
                    <Typography variant="h6" gutterBottom>
                      {topN} نفر برتر آزمون {testId} با امتیاز وزنی
                    </Typography>
                    <List dense>
                      {stats.topTest.map((item, index) => (
                        <ListItem key={item.user}>
                          <ListItemText 
                            primary={`${index + 1}. شرکت‌کننده ${item.user}`} 
                            secondary={`امتیاز: ${item.score}`}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </div>
                )}

                {activeTab === 'topOverall' && (
                  <div>
                    <Typography variant="h6" gutterBottom>
                      {topN} نفر برتر کل آزمون‌ها با امتیاز وزنی
                    </Typography>
                    <List dense>
                      {stats.topOverall.map((item, index) => (
                        <ListItem key={item.user}>
                          <ListItemText 
                            primary={`${index + 1}. شرکت‌کننده ${item.user}`} 
                            secondary={`امتیاز کل: ${item.score}`}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </div>
                )}

                {activeTab === 'edit' && (
                  <Box
                    display="flex"
                    justifyContent="center"
                    alignItems="center"
                    height="100%"
                    minHeight="300px"
                  >
                    <Typography variant="body1" color="textSecondary">
                      برای مشاهده آمار، یکی از گزینه‌های سمت چپ را انتخاب کنید
                    </Typography>
                  </Box>
                )}
              </Paper>
            </Grid>
          </Grid>
        </Paper>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        >
          <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Container>
    </ThemeProvider>
  );
}
export default App;