import React, { useState, useEffect } from "react";

const NUM_USERS = 100000;
const NUM_TESTS = 10;
const NUM_SUBJECTS = 5;
const COLORS_COUNT = NUM_TESTS * NUM_SUBJECTS; // 50
const BITS_PER_COLOR = 2;
const BITS_PER_USER = COLORS_COUNT * BITS_PER_COLOR; // 100 bits
const BYTES_PER_USER = Math.ceil(BITS_PER_USER / 8); // 13 bytes

const COLOR_CODES = {
  red: 0,
  yellow: 1,
  green: 2,
  blue: 3,
};
const COLOR_NAMES = ["قرمز", "زرد", "سبز", "آبی"];

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

function calcWeightedScore(colors, testIndex) {
  // جمع رنگ‌ها در یک آزمون با وزن درس برابر شماره درس (1 تا 5)
  let score = 0;
  for (let subj = 0; subj < NUM_SUBJECTS; subj++) {
    const color = colors[testIndex * NUM_SUBJECTS + subj];
    score += color * (subj + 1);
  }
  return score;
}

function calcTotalScore(colors) {
  // جمع کل رنگ‌ها با وزن درس * آزمون (درس شماره subj + 1) * (آزمون شماره test + 1)
  // اینجا فقط جمع ساده ضریب دروس می‌گیریم چون آزمون‌ها جدا جدا هستند
  // ولی در صورت نیاز می‌توانیم ضریب آزمون هم اضافه کنیم
  let total = 0;
  for (let t = 0; t < NUM_TESTS; t++) {
    for (let s = 0; s < NUM_SUBJECTS; s++) {
      total += colors[t * NUM_SUBJECTS + s] * (s + 1);
    }
  }
  return total;
}

function App() {
  const [dataArray, setDataArray] = useState(null);
  const [userId, setUserId] = useState(1);
  const [testId, setTestId] = useState(1);
  const [subjectId, setSubjectId] = useState(1);
  const [selectedColor, setSelectedColor] = useState(0);
  const [message, setMessage] = useState("");
  const [topN, setTopN] = useState(10);
  const [statsOutput, setStatsOutput] = useState("");

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
      setMessage("مقادیر وارد شده نامعتبر است");
      return;
    }

    const newData = new Uint8Array(dataArray);
    setColor(newData, userId - 1, testId - 1, subjectId - 1, selectedColor);
    setDataArray(newData);
    setMessage(`رنگ درس ${subjectId} آزمون ${testId} برای شرکت‌کننده ${userId} ذخیره شد.`);
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
      setMessage("مقادیر وارد شده نامعتبر است");
      return;
    }

    const colorCode = getColor(dataArray, userId - 1, testId - 1, subjectId - 1);
    setMessage(`رنگ ذخیره شده: ${COLOR_NAMES[colorCode]} (کد ${colorCode})`);
  };

  // محاسبه میانگین پاسخگویی در هر درس و آزمون
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

    let result = "میانگین رنگ‌ها (0=قرمز تا 3=آبی):\n";
    for (let t = 0; t < NUM_TESTS; t++) {
      result += `آزمون ${t + 1}:\n`;
      for (let s = 0; s < NUM_SUBJECTS; s++) {
        const avg = (sumByTestSubject[t][s] / NUM_USERS).toFixed(3);
        result += `  درس ${s + 1}: ${avg}\n`;
      }
    }
    setStatsOutput(result);
  };

  // N نفر برتر (رنگ آبی) در یک درس در یک آزمون
  const topNBlueInTestSubject = () => {
    if (!dataArray) return;

    if (
      testId < 1 ||
      testId > NUM_TESTS ||
      subjectId < 1 ||
      subjectId > NUM_SUBJECTS
    ) {
      setMessage("مقادیر آزمون یا درس نامعتبر است");
      return;
    }

    let blueUsers = [];
    for (let u = 0; u < NUM_USERS; u++) {
      const color = getColor(dataArray, u, testId - 1, subjectId - 1);
      if (color === 3) {
        blueUsers.push(u + 1);
      }
    }
    blueUsers = blueUsers.slice(0, topN);
    setStatsOutput(
      `N=${topN} نفر برتر با رنگ آبی در آزمون ${testId} درس ${subjectId}:\n${blueUsers.join(
        ", "
      )}`
    );
  };

  // N نفر برتر کل آزمون با توجه به ضرایب دروس
  const topNInTestWeighted = () => {
    if (!dataArray) return;

    if (testId < 1 || testId > NUM_TESTS) {
      setMessage("شماره آزمون نامعتبر است");
      return;
    }

    let scores = [];
    for (let u = 0; u < NUM_USERS; u++) {
      // امتیاز کل شرکت‌کننده در آزمون بر اساس وزن دروس
      let score = 0;
      for (let s = 0; s < NUM_SUBJECTS; s++) {
        const c = getColor(dataArray, u, testId - 1, s);
        score += c * (s + 1);
      }
      scores.push({ user: u + 1, score });
    }

    scores.sort((a, b) => b.score - a.score);
    const topUsers = scores.slice(0, topN).map((x) => `${x.user} (${x.score})`);

    setStatsOutput(`N=${topN} نفر برتر در آزمون ${testId}:\n${topUsers.join(", ")}`);
  };

  // N نفر برتر کل آزمون‌ها
  const topNInAllTests = () => {
    if (!dataArray) return;

    let scores = [];
    for (let u = 0; u < NUM_USERS; u++) {
      // محاسبه مجموع نمرات weighted برای همه آزمون‌ها
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
    const topUsers = scores.slice(0, topN).map((x) => `${x.user} (${x.score})`);

    setStatsOutput(`N=${topN} نفر برتر کل آزمون‌ها:\n${topUsers.join(", ")}`);
  };

  return (
    <div
      style={{
        maxWidth: 600,
        margin: "20px auto",
        fontFamily: "Segoe UI, Tahoma, Geneva, Verdana, sans-serif",
        direction: "rtl",
        padding: 20,
        border: "1px solid #ccc",
        borderRadius: 10,
        backgroundColor: "#f9f9f9",
      }}
    >
      <h2 style={{ textAlign: "center", marginBottom: 20 }}>سیستم رنگ‌بندی پاسخ‌ها</h2>

      <div style={{ display: "flex", gap: 10, marginBottom: 15 }}>
        <div style={{ flex: 1 }}>
          <label>شناسه شرکت‌کننده (1 تا {NUM_USERS}):</label>
          <input
            type="number"
            value={userId}
            onChange={(e) => setUserId(Number(e.target.value))}
            min={1}
            max={NUM_USERS}
            style={{ width: "100%", padding: 5, fontSize: 14 }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label>شماره آزمون (1 تا {NUM_TESTS}):</label>
          <input
            type="number"
            value={testId}
            onChange={(e) => setTestId(Number(e.target.value))}
            min={1}
            max={NUM_TESTS}
            style={{ width: "100%", padding: 5, fontSize: 14 }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label>شماره درس (1 تا {NUM_SUBJECTS}):</label>
          <input
            type="number"
            value={subjectId}
            onChange={(e) => setSubjectId(Number(e.target.value))}
            min={1}
            max={NUM_SUBJECTS}
            style={{ width: "100%", padding: 5, fontSize: 14 }}
          />
        </div>
      </div>

      <div style={{ marginBottom: 15 }}>
        <label>انتخاب رنگ:</label>
        <select
          value={selectedColor}
          onChange={(e) => setSelectedColor(Number(e.target.value))}
          style={{ width: "100%", padding: 5, fontSize: 14 }}
        >
          {COLOR_NAMES.map((name, i) => (
            <option key={i} value={i}>
              {name}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={handleSetColor}
        style={{
          width: "100%",
          padding: "10px",
          backgroundColor: "#4CAF50",
          color: "white",
          border: "none",
          borderRadius: 5,
          fontSize: 16,
          cursor: "pointer",
          marginBottom: 10,
        }}
      >
        ذخیره رنگ
      </button>

      <button
        onClick={handleGetColor}
        style={{
          width: "100%",
          padding: "10px",
          backgroundColor: "#2196F3",
          color: "white",
          border: "none",
          borderRadius: 5,
          fontSize: 16,
          cursor: "pointer",
          marginBottom: 20,
        }}
      >
        نمایش رنگ ذخیره شده
      </button>

      <div style={{ marginBottom: 15 }}>
        <label>تعداد N برای آمارگیری:</label>
        <input
          type="number"
          value={topN}
          onChange={(e) => setTopN(Number(e.target.value))}
          min={1}
          max={1000}
          style={{ width: 100, padding: 5, fontSize: 14 }}
        />
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
        <button
          onClick={calcAverage}
          style={buttonStyle}
          title="میانگین پاسخ‌ها در هر درس و آزمون"
        >
          میانگین پاسخگویی
        </button>

        <button
          onClick={topNBlueInTestSubject}
          style={buttonStyle}
          title="N نفر برتر با رنگ آبی در یک درس و آزمون"
        >
          N نفر برتر (آبی) درس آزمون
        </button>

        <button
          onClick={topNInTestWeighted}
          style={buttonStyle}
          title="N نفر برتر کل آزمون با وزن درس"
        >
          N نفر برتر در آزمون
        </button>

        <button
          onClick={topNInAllTests}
          style={buttonStyle}
          title="N نفر برتر کل آزمون‌ها"
        >
          N نفر برتر کل آزمون‌ها
        </button>
      </div>

      <div
        style={{
          whiteSpace: "pre-line",
          backgroundColor: "#fff",
          border: "1px solid #ddd",
          padding: 15,
          borderRadius: 8,
          minHeight: 120,
          fontSize: 14,
          color: "#333",
          overflowY: "auto",
          maxHeight: 300,
        }}
      >
        {statsOutput || message}
      </div>
    </div>
  );
}

const buttonStyle = {
  flex: "1 1 45%",
  padding: "10px",
  backgroundColor: "#1976d2",
  color: "white",
  border: "none",
  borderRadius: 5,
  fontSize: 14,
  cursor: "pointer",
};

export default App;
