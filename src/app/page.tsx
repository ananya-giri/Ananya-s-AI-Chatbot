"use client";
import {
  useState,
  useRef,
  useEffect,
  useCallback,
  ChangeEvent,
} from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion } from "framer-motion";

interface Message {
  id: number;
  sender: "user" | "bot" | "system";
  text: string;
  timestamp: string;
}

declare global {
  interface Window {
    pdfjsLib: any;
  }
}

const API_KEY = "AIzaSyAPLxbwh2YgsiyYoYERHvIkjjTrKBNYxoo";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

export default function ChatbotUI() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [pdfContent, setPdfContent] = useState(""); // <== NEW STATE
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const getCurrentTime = () =>
    new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

  const sendMessage = async () => {
    if (!input.trim()) return;

    const newUserMessage: Message = {
      id: Date.now(),
      sender: "user",
      text: input,
      timestamp: getCurrentTime(),
    };

    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);
    setInput("");
    setIsTyping(true);

    try {
      const prompt = pdfContent
        ? `You are an assistant. Here's some content from a PDF the user uploaded:\n\n"${pdfContent.slice(
            0,
            3000
          )}"\n\nNow answer the user's question based on it:\n${input}`
        : input;

      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
        }),
      });

      const data = await response.json();
      const botReply =
        data?.candidates?.[0]?.content?.parts?.[0]?.text ??
        "Sorry, I couldn't understand that.";

      const botMessage: Message = {
        id: Date.now() + 1,
        sender: "bot",
        text: botReply,
        timestamp: getCurrentTime(),
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: Date.now() + 2,
        sender: "bot",
        text: "Error fetching response from AI.",
        timestamp: getCurrentTime(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") sendMessage();
  };

  const loadPDFScript = useCallback(() => {
    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js";
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";
    };
    document.body.appendChild(script);
  }, []);

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== "application/pdf") return;

    const fileReader = new FileReader();
    fileReader.onload = async function () {
      const typedArray = new Uint8Array(fileReader.result as ArrayBuffer);
      const pdf = await window.pdfjsLib.getDocument(typedArray).promise;
      let fullText = "";

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(" ");
        fullText += pageText + "\n";
      }

      console.log("Parsed PDF Content:\n", fullText);
      setPdfContent(fullText); // <== Save parsed content

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          sender: "system",
          text: `📄 1 PDF file uploaded: ${file.name}`,
          timestamp: getCurrentTime(),
        },
      ]);
    };

    fileReader.readAsArrayBuffer(file);
  };

  useEffect(() => {
    loadPDFScript();
  }, [loadPDFScript]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  return (
    <div
      className="flex flex-col h-screen max-h-screen p-4 bg-gray-100 dark:bg-gray-900 bg-cover bg-center bg-fixed"
      style={{
        backgroundImage: "url('/images/bg.jpg')",
      }}
    >
      <h1 className="text-3xl font-bold mb-6 text-center text-gray-800 dark:text-white drop-shadow-lg">
        Ananya's AI Chatbot
      </h1>

      <Card
        className="relative flex flex-col flex-grow max-h-[600px] overflow-hidden rounded-xl shadow-lg bg-cover bg-center bg-no-repeat mx-auto w-full max-w-2xl border-4 border-pink-400 dark:border-pink-600"
        style={{
          backgroundImage:
            "url('https://c4.wallpaperflare.com/wallpaper/633/456/843/flower-flowers-background-pink-widescreen-hd-wallpaper-thumb.jpg')",
        }}
      >
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-white/80 via-white/60 to-white/40 dark:from-black/80 dark:via-black/60 dark:to-black/30 backdrop-blur-md" />

        <ScrollArea className="flex-grow p-4 space-y-4 overflow-y-auto relative z-10">
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex items-start gap-2 ${
                msg.sender === "user"
                  ? "justify-end"
                  : "justify-start"
              }`}
            >
              {msg.sender === "bot" && <div className="text-2xl">🤖</div>}
              <div
                className={`max-w-md px-4 py-2 rounded-xl shadow-sm whitespace-pre-wrap text-sm ${
                  msg.sender === "user"
                    ? "bg-pink-500 text-white"
                    : msg.sender === "system"
                    ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
                    : "bg-gray-300 text-gray-900 dark:bg-gray-700 dark:text-white"
                }`}
              >
                <div>{msg.text}</div>
                <div className="text-xs mt-1 text-right opacity-70">
                  {msg.timestamp}
                </div>
              </div>
              {msg.sender === "user" && <div className="text-2xl">👤</div>}
            </motion.div>
          ))}

          {isTyping && (
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <div className="text-2xl">🤖</div>
              <div className="italic animate-pulse">Bot is typing...</div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </ScrollArea>

        <CardContent className="p-4 border-t flex flex-col sm:flex-row gap-2 relative z-10 bg-white/80 dark:bg-gray-800/70 backdrop-blur-md">
          <Input
            type="text"
            placeholder="Type your question..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-grow rounded-full px-5 py-2 border border-pink-400 dark:border-pink-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-pink-400 transition-all shadow-md"
          />
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileUpload}
            className="border p-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white rounded-md"
          />
          <Button
              onClick={sendMessage}
              className="bg-pink-500 hover:bg-green-400 text-white px-6 py-2 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              🚀 Send
            </Button>
        </CardContent>
      </Card>
    </div>
  );
}
