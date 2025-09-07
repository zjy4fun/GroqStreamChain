import React, { useEffect, useRef, useState } from 'react';

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState('Connecting...');
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const getWebSocketBase = () => {
      if (window.APP_CONFIG && window.APP_CONFIG.BACKEND_WS_BASE) {
        const base = window.APP_CONFIG.BACKEND_WS_BASE.trim();
        return base.endsWith('/') ? base.slice(0, -1) : base;
      }
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${protocol}//${window.location.host}`;
    };

    const connectWebSocket = () => {
      setStatus('Connecting...');
      if (socketRef.current) socketRef.current.close();
      const wsUrl = `${getWebSocketBase()}/ws/chat`;
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        setStatus('Connected');
      };
      socket.onclose = () => {
        setStatus('Disconnected');
        // Auto reconnect
        setTimeout(connectWebSocket, 2000);
      };
      socket.onerror = console.error;
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'initial_message') {
            setMessages((prev) => [...prev, { role: 'assistant', content: data.content }]);
          } else if (data.type === 'stream') {
            setMessages((prev) => {
              if (prev.length && prev[prev.length - 1].role === 'assistant_stream') {
                const updated = [...prev];
                updated[updated.length - 1].content += data.content;
                return updated;
              }
              return [...prev, { role: 'assistant_stream', content: data.content }];
            });
          } else if (data.type === 'stream_end') {
            setMessages((prev) => {
              return prev.map((msg) => (msg.role === 'assistant_stream' ? { ...msg, role: 'assistant' } : msg));
            });
          }
        } catch (e) {
          console.error(e);
        }
      };
    };

    connectWebSocket();
  }, []);

  useEffect(scrollToBottom, [messages]);

  const sendMessage = () => {
    const content = input.trim();
    if (!content) return;
    setMessages((prev) => [...prev, { role: 'user', content }]);
    socketRef.current?.send(JSON.stringify({ message: content }));
    setInput('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="chat-container">
      <header>
        <h1>Let's Chat with GroqStreamChain 🤖💬</h1>
        <div id="connection-status" className={status.toLowerCase()}>{status}</div>
      </header>

      <div id="chat-messages" className="messages-container">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`message ${msg.role === 'user' ? 'user-message' : 'assistant-message'}`}
            dangerouslySetInnerHTML={{ __html: msg.content }}
          ></div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="input-container">
        <textarea
          id="message-input"
          rows={3}
          placeholder="Type your message here..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
        />
        <button id="send-button" onClick={sendMessage} disabled={status !== 'Connected'}>
          Send
        </button>
      </div>
    </div>
  );
}

export default App;