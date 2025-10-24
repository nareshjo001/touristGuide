import React, { useState } from "react";
import ChatbotIcon from "./ChatbotIcon";
import ChatMessage from "./ChatMessage";
import "./Chatbot.css";

const Chatbot = ({ setAiData }) => {

  // Should be replaced by useState and content updated dyanmically based on AI fetched data
  const overview = {
    place : "Big Temple",
    overviewContent: `The Brihadeeswarar Temple, also known as the Big Temple, is located in Thanjavur, Tamil Nadu, and was built by Raja Raja Chola I in 1010 CE. Dedicated to Lord Shiva, it is a masterpiece of Dravidian architecture and a UNESCO World Heritage Site as part of the Great Living Chola Temples. The temple is famous for its towering vimana, which stands about 66 meters tall and is made entirely of granite, including an 80-ton capstone. Its walls are adorned with intricate carvings and frescoes depicting Shiva, Hindu epics, and Chola-era life. The temple also features a large tank used for rituals and hosts grand festivals like Maha Shivaratri, making it both a spiritual center and a cultural landmark.`
  }

  // Should be replaced by useState and content updated dyanmically based on AI fetched data
  const history = {
    place : "Brihadeeswarar Temple",
    history : [
      "The Brihadeeswarar Temple was commissioned by the Chola emperor Raja Raja Chola I in the early 11th century and completed in 1010 CE. It was built to honor Lord Shiva and to reflect the power, wealth, and devotion of the Chola dynasty. The temple’s scale and precision were unprecedented at the time, making it a landmark achievement in Indian architecture.",
      "Construction involved transporting massive granite blocks from quarries located several kilometers away, despite Thanjavur itself having no granite sources nearby. The temple’s inscriptions provide fascinating details about its planning and execution, including records of land grants, daily rituals, temple dancers, and musicians employed to serve the deity.",
      "Through the centuries, the temple remained a significant religious and cultural hub, even as various dynasties like the Nayaks and Marathas ruled Thanjavur. It survived invasions and natural disasters, retaining its grandeur. Today, it is celebrated as a UNESCO World Heritage Site, symbolizing over 1,000 years of unbroken worship and standing as a monument to Chola art, administration, and devotion."
    ]
  }

  // Should be replaced by useState and content updated dyanmically based on AI fetched data
  const festivals = {
    place : "Brihadeeswarar Temple",
    "festivals": [
      {
        "name": "Maha Shivaratri",
        "period": "February - March (Phalguna month)",
        "description": "Night-long prayers and special abhishekams are performed to honor Lord Shiva. Devotees fast and stay awake chanting hymns until dawn."
      },
      {
        "name": "Rathotsavam (Chariot Festival)",
        "period": "April - May (Tamil month Chithirai)",
        "description": "The temple’s massive wooden chariot carrying the deity is pulled by thousands of devotees through the streets of Thanjavur, accompanied by music and chants."
      },
      {
        "name": "Navaratri",
        "period": "September - October (Tamil month Purattasi)",
        "description": "Nine days of worship dedicated to the Goddess with special decorations, rituals, and cultural performances inside the temple."
      },
      {
        "name": "Aipassi Pournami",
        "period": "October - November (Full Moon of Aipassi month)",
        "description": "Special pujas and processions take place on the full moon day, considered highly auspicious for Lord Shiva worship."
      },
      {
        "name": "Kumbabishekam",
        "period": "Every 12 years (date fixed by temple authorities)",
        "description": "Grand consecration ceremony to re-energize the temple deity with elaborate rituals, Vedic chants, and huge gatherings of devotees."
      }
    ]
  }

  const [userPrompt, setUserPrompt] = useState('');
  const [messages, setMessages] = useState([
    { role: "model", text: "Hey there 👋 How can I help you today?" }
  ]);

  const botReplies = [
    "Want to know more ?",
    "Feel to ask more details ...",
    "Ask more information ...",
    "Ready to give more info ..."
  ];

  const handleInputChange = (e) => {
    setUserPrompt(e.target.value);
  }

  const generateAiData = (input) => {
    const lower = input.toLowerCase();

    if (lower.includes("overview")) return overview;
    if (lower.includes("history")) return history;
    if (lower.includes("festival")) return festivals;

    // Default: return null if nothing matched
    return null;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Add user message to chat
    const userMessage = { role: "user", text: userPrompt };
    setMessages((prev) => [...prev, userMessage]);

    // Determine AI data for right panel
    const aiContent = generateAiData(userPrompt);
    if (aiContent) {
      setAiData(aiContent); // update right-side panel dynamically
    }

    // Bot reply: always random text, never content
    setTimeout(() => {
      const botMessage = { role: "model", text: botReplies[Math.floor(Math.random() * botReplies.length)] };
      setMessages((prev) => [...prev, botMessage]);
    }, 500);

    // Clear input
    setUserPrompt("");
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
            placeholder="Message..."
            id="message-input"
            value={userPrompt}
            onChange={handleInputChange}
            required
          />
          <button type="button" className="material-symbols-rounded mic">
            mic
          </button>
          <button type="submit" className="material-symbols-rounded send">
            arrow_upward
          </button>
        </form>
      </div>
    </div>
  );
};

export default Chatbot;