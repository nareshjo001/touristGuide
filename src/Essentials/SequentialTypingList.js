import React, { useState } from "react";
import TypingEffect from "../Essentials/Typingeffect";

const SequentialTypingList = ({ items }) => {
  const [typedItems, setTypedItems] = useState([]); 
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleComplete = () => {
    // Prevent re-adding the last item infinitely
    if (currentIndex >= items.length) return;

    setTypedItems((prev) => [...prev, items[currentIndex]]);

    if (currentIndex < items.length - 1) {
      setTimeout(() => setCurrentIndex((prev) => prev + 1), 300);
    } else {
      // mark finished: push index beyond array length
      setCurrentIndex(items.length);
    }
  };

  return (
    <ul style={{
      listStyle:"none",
      textAlign:"center",
      whiteSpace: 'pre-wrap',
      lineHeight: '1.5',
      fontFamily: 'monospace',
      fontSize: '1.02rem'
    }}>
      {typedItems.map((item, i) => (
        <li key={`done-${i}`}>{item}</li>
      ))}

      {currentIndex < items.length && (
        <li key={`typing-${currentIndex}`}>
          <TypingEffect
            text={items[currentIndex]}
            speed={30}
            onComplete={handleComplete}
          />
        </li>
      )}
    </ul>
  );
};

export default SequentialTypingList;