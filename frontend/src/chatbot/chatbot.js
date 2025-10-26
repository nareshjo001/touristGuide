import React, { useContext, useState } from "react";
import ChatbotIcon from "./ChatbotIcon";
import ChatMessage from "./ChatMessage";
import "./Chatbot.css";
import {v4 as uuidv4} from "uuid";
import { AuthContext } from "../context/AuthContext.js";

const Chatbot = ({ setAiData }) => {
  const [conversationId] = useState(uuidv4());

  const {userInfo} = useContext(AuthContext);
  const userId = userInfo ? userInfo._id : "default-user";
  
  const [userPrompt, setUserPrompt] = useState('');
  const [messages, setMessages] = useState([
    { role: "model", text: "Hey there 👋 How can I help you today?" }
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e) => {
    setUserPrompt(e.target.value);
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return; // Don't submit while waiting for a response

    // Add user message to chat
    const userMessage = { role: "user", text: userPrompt };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setUserPrompt(""); // Clear input immediately

    try {
      // --- This is the new AI integration ---
      const response = await fetch("http://localhost:5001/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userPrompt,
          userId: userId, // TODO: Pass a real user ID here
          conversationId: conversationId // TODO: Pass a unique convo ID
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const aiResponse = await response.json();

      // Add the real AI answer to the chat
      const botMessage = { role: "model", text: aiResponse.answer };
      setMessages((prev) => [...prev, botMessage]);

      // Pass the retrieved sources to the parent component
      // This will be a list of objects, e.g., [{ name: "Marina Beach", ... }]
      if (aiResponse.sources && Array.isArray(aiResponse.sources) && aiResponse.sources.length > 0) {
        setAiData(aiResponse.sources); 
      }
      // --- End of new AI integration ---

    } catch (error) {
      console.error("Failed to fetch AI response:", error);
      // Add an error message to the chat
      const errorMessage = { role: "model", text: "Sorry, I'm having trouble connecting. Please try again." };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chatbot-container">
      {/* Header */}
      <div className="chat-header">
        <div className="header-info">
          <ChatbotIcon />
          <h2 className="logo-text">Chatbot</h2>
        </div>
        <button>
          <span className="material-symbols-rounded">keyboard_arrow_down</span>
        </button>
      </div>

      {/* Chat Body */}
      <div className="chat-body">
        {messages.map((msg, index) => (
          <ChatMessage key={index} role={msg.role} text={msg.text} />
        ))}
      </div>

      {/* Footer */}
      <div className="chat-footer">
        <form className="chat-form" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder={isLoading ? "Waiting for response..." : "Message..."}
            id="message-input"
            value={userPrompt}
            onChange={handleInputChange}
            disabled={isLoading}
            required
          />
          <button type="button" className="material-symbols-rounded mic" disabled={isLoading}>
            mic
          </button>
          <button type="submit" className="material-symbols-rounded send" disabled={isLoading}>
            arrow_upward
          </button>
        </form>
      </div>
    </div>
  );
};

export default Chatbot;