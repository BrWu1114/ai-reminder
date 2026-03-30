import { useState, useEffect, useRef, useCallback } from "react";
import { sendChat, getChatHistory, clearChatHistory } from "../api";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

export default function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    getChatHistory().then((history: Message[]) => {
      if (history.length > 0) setMessages(history);
      else
        setMessages([
          {
            role: "assistant",
            content:
              "Hey! I'm your personal reminder assistant. Tell me what you're up to, and I'll help you stay on top of things. 😊",
          },
        ]);
    });
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: "user", content: text.trim() };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const reply = await sendChat(text.trim());
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch (err: any) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: `⚠️ Error: ${err.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  const toggleVoice = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice input not supported in this browser.");
      return;
    }
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      send(transcript);
    };
    recognition.onend = () => setListening(false);
    recognition.start();
    recognitionRef.current = recognition;
    setListening(true);
  };

  const handleClear = async () => {
    await clearChatHistory();
    setMessages([
      {
        role: "assistant",
        content: "Conversation cleared! What's on your mind?",
      },
    ]);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>💬 Assistant</span>
        <button onClick={handleClear} style={styles.clearBtn}>Clear</button>
      </div>

      <div style={styles.messages}>
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              ...styles.bubble,
              ...(msg.role === "user" ? styles.userBubble : styles.aiBubble),
            }}
          >
            {msg.content}
          </div>
        ))}
        {loading && (
          <div style={{ ...styles.bubble, ...styles.aiBubble, opacity: 0.6 }}>
            <span style={styles.typing}>●●●</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={styles.inputRow}>
        <textarea
          style={styles.textarea}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message or use voice..."
          rows={2}
          disabled={loading}
        />
        <div style={styles.btnCol}>
          <button
            onClick={toggleVoice}
            style={{ ...styles.iconBtn, background: listening ? "#e05c5c" : "#2e2e3e" }}
            title="Voice input"
          >
            {listening ? "⏹" : "🎤"}
          </button>
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || loading}
            style={{ ...styles.iconBtn, background: "#6c6cf0" }}
            title="Send"
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    background: "#13131a",
    borderRadius: 12,
    overflow: "hidden",
    border: "1px solid #2e2e3e",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 16px",
    borderBottom: "1px solid #2e2e3e",
  },
  title: { fontWeight: 600, fontSize: 15 },
  clearBtn: {
    background: "transparent",
    color: "#888",
    fontSize: 12,
    padding: "4px 8px",
    border: "1px solid #2e2e3e",
  },
  messages: {
    flex: 1,
    overflowY: "auto",
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  bubble: {
    maxWidth: "80%",
    padding: "10px 14px",
    borderRadius: 14,
    fontSize: 14,
    lineHeight: 1.5,
    whiteSpace: "pre-wrap",
  },
  userBubble: {
    background: "#6c6cf0",
    color: "#fff",
    alignSelf: "flex-end",
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    background: "#1e1e2a",
    color: "#e8e8f0",
    alignSelf: "flex-start",
    borderBottomLeftRadius: 4,
  },
  typing: { letterSpacing: 4, fontSize: 12 },
  inputRow: {
    display: "flex",
    gap: 8,
    padding: "12px 16px",
    borderTop: "1px solid #2e2e3e",
    alignItems: "flex-end",
  },
  textarea: { flex: 1, resize: "none", borderRadius: 10 },
  btnCol: { display: "flex", flexDirection: "column", gap: 6 },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    color: "#fff",
    fontSize: 16,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
};
