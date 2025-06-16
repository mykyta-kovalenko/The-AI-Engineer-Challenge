# 🟩 Matrix Terminal Frontend

Welcome to the Matrix, Operator! This is your retro cyberpunk terminal for chatting with LLMs—complete with digital rain, CRT glow, and a healthy dose of nostalgia.

## 🚀 Getting Started

1. **Install dependencies:**

   ```sh
   npm install
   ```

2. **Set up your OpenAI API key:**

   - Create a file called `.env.local` in the `frontend/` directory (this file is ignored by git).
   - Add your key like this:
     ```env
     NEXT_PUBLIC_OPENAI_API_KEY=sk-...your-key-here...
     ```
   - **Never commit your API key!**

3. **Run the development server:**
   ```sh
   npm run dev
   ```
   Then open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🖥️ Features (WIP)

- Matrix digital rain background
- CRT scanlines and glow
- Animated typing effect
- Blinking cursor
- Minimal terminal chat UI
- Streams responses from your local `/api/chat` backend
