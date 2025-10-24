import ChatbotIcon from "./ChatbotIcon";

const ChatMessage = ({ role, text }) => {
  return (
    <div className={`message ${role === "model" ? "bot" : "user"}-message`}>
      {role === "model" && <ChatbotIcon />}
      <p className="message-text">{text}</p>
    </div>
  );
};

export default ChatMessage;
