import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { developer_message, user_message, model = 'gpt-4.1-mini' } = req.body;
    console.log('API route received request:', { user_message, model });

    if (!developer_message || !user_message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get the backend URL from environment variables
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    console.log('Forwarding to backend:', backendUrl);
    
    // Forward the request to the Python backend
    const response = await fetch(`${backendUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        developer_message,
        user_message,
        model,
      }),
    });

    console.log('Backend response status:', response.status);

    if (!response.ok) {
      console.error('Backend error:', response.status, response.statusText);
      const errorData = await response.json().catch(() => ({ detail: 'Backend service error' }));
      return res.status(response.status).json({ detail: errorData.detail || 'Backend service error' });
    }

    // Check if response is JSON (for file management commands)
    const contentType = response.headers.get('content-type');
    console.log('Backend response content-type:', contentType);
    
    if (contentType && contentType.includes('application/json')) {
      // Handle JSON response (file management commands)
      const jsonData = await response.json();
      console.log('Received JSON response:', jsonData);
      return res.status(200).json(jsonData);
    } else {
      // Handle streaming response (regular chat)
      // Set headers for streaming
      res.writeHead(200, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Transfer-Encoding': 'chunked',
      });

      // Stream the response
      if (response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        try {
          console.log('Starting to stream response...');
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              console.log('Stream complete');
              break;
            }
            
            const chunk = decoder.decode(value, { stream: true });
            console.log('Streaming chunk:', chunk);
            res.write(chunk);
          }
        } finally {
          reader.releaseLock();
        }
      }

      res.end();
    }
  } catch (error) {
    console.error('API Route Error:', error);
    
    // Make sure we haven't already sent headers
    if (!res.headersSent) {
      res.status(500).json({ 
        detail: error instanceof Error ? error.message : 'Internal server error' 
      });
    } else {
      res.end();
    }
  }
} 