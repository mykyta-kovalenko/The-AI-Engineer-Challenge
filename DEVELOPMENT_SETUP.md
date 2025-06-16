# Development Setup Guide

This guide explains how to run both the frontend and backend services for the AI terminal interface.

## Prerequisites

- Node.js 18+ and npm
- Python 3.8+
- OpenAI API key

## Backend Setup (Python FastAPI)

1. Navigate to the API directory:

```bash
cd api
```

2. Create a virtual environment:

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:

```bash
pip install -r requirements.txt
```

4. Set your OpenAI API key as an environment variable:

```bash
# On macOS/Linux:
export OPENAI_API_KEY="your-openai-api-key-here"

# On Windows:
set OPENAI_API_KEY=your-openai-api-key-here
```

5. Start the backend server:

```bash
python app.py
```

The backend will run on `http://localhost:8000`

## Frontend Setup (Next.js)

1. Navigate to the frontend directory:

```bash
cd frontend
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env.local` file with:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

4. Start the development server:

```bash
npm run dev
```

The frontend will run on `http://localhost:3000`

## Running Both Services

For the best development experience:

1. **Terminal 1** - Backend:

```bash
cd api
source venv/bin/activate
export OPENAI_API_KEY="your-key-here"
python app.py
```

2. **Terminal 2** - Frontend:

```bash
cd frontend
npm run dev
```

3. Open `http://localhost:3000` in your browser

## Environment Variables

### Backend (Required)

- `OPENAI_API_KEY`: Your OpenAI API key

### Frontend (Optional)

- `NEXT_PUBLIC_API_URL`: Backend URL (defaults to `http://localhost:8000`)

## Features

- ✅ Real-time streaming chat with OpenAI GPT-4
- ✅ Retro terminal interface with Matrix theme
- ✅ Error handling for API failures
- ✅ Input disabled during typing animations
- ✅ Proper text wrapping and scrolling
- ✅ Authentic CRT terminal aesthetics

## Troubleshooting

### Backend Issues

- Ensure your OpenAI API key is valid and has credits
- Check that port 8000 is not in use by another service
- Verify all Python dependencies are installed

### Frontend Issues

- Make sure the backend is running on the configured URL
- Check browser console for any JavaScript errors
- Ensure Node.js version is 18 or higher

### API Connection Issues

- Verify the `NEXT_PUBLIC_API_URL` environment variable is set correctly
- Check that both services can communicate (no firewall blocking)
- Look at both terminal outputs for error messages
