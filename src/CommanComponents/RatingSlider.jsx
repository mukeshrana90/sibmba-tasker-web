import  { useState, useEffect } from 'react';
import { Range } from 'react-range';

const RatingSlider = ({ ratingvalue, setRatingValue }) => {
  const STEP = 1;
  const MIN = 0;
  const MAX = 5;
  const [localValue, setLocalValue] = useState(ratingvalue);

  // Debounce effect
  useEffect(() => {
    const handler = setTimeout(() => {
      setRatingValue(localValue);
    }, 300); // 300ms debounce

    return () => {
      clearTimeout(handler);
    };
  }, [localValue, setRatingValue]);

  return (
    <div style={{ padding: '2rem', width: '285px' }}>
      <Range
        values={localValue}
        step={STEP}
        min={MIN}
        max={MAX}
        onChange={setLocalValue} // Update local state immediately
        renderTrack={({ props, children }) => (
          <div
            {...props}
            style={{
              ...props.style,
              height: '6px',
              width: '100%',
              background: '#ddd',
              position: 'relative',
              borderRadius: '4px',
            }}
          >
            {/* MARKS */}
            {[...Array(MAX + 1)].map((_, i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: `${(i / MAX) * 100}%`,
                  top: '-6px',
                  transform: 'translateX(-50%)',
                  width: '6px',
                  height: '18px',
                  background: i <= localValue[0] ? '#548BF4' : '#aaa',
                  borderRadius: '2px',
                }}
              />
            ))}
            {children}
          </div>
        )}
        renderThumb={({ props }) => (
          <div
            {...props}
            style={{
              ...props.style,
              height: '20px',
              width: '20px',
              backgroundColor: '#548BF4',
              borderRadius: '50%',
              boxShadow: '0 2px 6px #AAA',
            }}
          />
        )}
      />
      <div style={{ marginTop: '10px', textAlign: 'center' }}>
        Rating: {localValue[0]}
      </div>
    </div>
  );
};

export default RatingSlider;
