const express = require('express');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();
const upload = multer({ dest: 'uploads/' });

const API_KEY = "AQ.Ab8RN6KZ3Q9dPc8dn0TopAx8hWKbz8U_gG6w1y0oVIJ-zZpNhA";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${API_KEY}`;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const EMILY_PROMPT = "You are Emily, a chic, stunning American girl living in Paris. Tone: sweet, playful, teasing, flirty. Keep replies strictly to 1 or 2 spoken sentences. Never use thought tags or bullet points.";

app.post('/api/chat', upload.single('audio'), async (req, res) => {
  const filePath = req.file ? req.file.path : null;

  try {
    let parts = [];

    if (filePath) {
      console.log("[Emily] Voice received. Encoding audio...");
      const base64Data = fs.readFileSync(filePath).toString('base64');
      parts.push({
        inlineData: {
          mimeType: "audio/webm",
          data: base64Data
        }
      });
      parts.push({ text: "Respond playfully as Emily to what I just said." });
    } else if (req.body && req.body.message) {
      console.log("[Emily] Text received:", req.body.message);
      parts.push({ text: req.body.message });
    } else {
      return res.status(400).json({ error: "Empty input" });
    }

    const payload = {
      systemInstruction: {
        parts: [{ text: EMILY_PROMPT }]
      },
      contents: [
        {
          role: "user",
          parts: parts
        }
      ]
    };

    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);

    if (data.error) {
      console.error("[Gemini Error]", data.error);
      return res.status(500).json({ error: data.error.message });
    }

    const reply = data.candidates?.[0]?.content?.parts?.find(p => p.text)?.text?.trim()
      || "Bonjour mon chéri, are you just going to stare at me?";

    console.log("[Emily] Replied:", reply);
    res.json({ reply });
  } catch (err) {
    console.error("[Server Error]", err);
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.status(500).json({ error: err.message });
  }
});

const PORT = 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n====================================`);
  console.log(`Emily AI Server Ready on http://localhost:${PORT}`);
  console.log(`====================================\n`);
});
