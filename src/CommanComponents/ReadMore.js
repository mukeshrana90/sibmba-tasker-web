import React, { useState } from 'react';

const ReadMore = ({ desc }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const maxLength = 100; 

  if (!desc) return null;

  const isTextLong = desc.length > maxLength;
  const displayText = isExpanded || !isTextLong ? desc : `${desc.slice(0, maxLength)}...`;

  const toggleReadMore = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <>
      <p className="text-gray-800">{displayText}</p>
      {isTextLong && (
        <button 
          onClick={toggleReadMore}
          className="read-more-btn text-blue-600 hover:text-blue-800 font-semibold mt-2"
        >
          {isExpanded ? 'Read Less' : 'Read More'}
        </button>
      )}
    </>
  );
};

export default ReadMore