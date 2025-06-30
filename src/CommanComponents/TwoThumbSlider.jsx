import React, { useState, useEffect, useRef } from 'react';
import { Range } from 'react-range';

const KilometerRangeSlider = ({ kmValues, setKmValues }) => {
  const STEP = 1;
  const MIN = 0;
  const MAX = 100;

  const [localKmValues, setLocalKmValues] = useState(kmValues);
  const debounceTimeout = useRef(null);

  useEffect(() => {
    // Clear previous debounce timeout
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    // Set new debounce timeout
    debounceTimeout.current = setTimeout(() => {
      setKmValues(localKmValues);
    }, 500); // debounce delay in ms

    // Cleanup timeout on unmount
    return () => {
      clearTimeout(debounceTimeout.current);
    };
  }, [localKmValues, setKmValues]);

  return (
    <div style={{ margin: '2rem', width: '220px' }}>
      <Range
        values={localKmValues}
        step={STEP}
        min={MIN}
        max={MAX}
        onChange={setLocalKmValues}
        renderTrack={({ props, children }) => (
          <div
            {...props}
            style={{
              ...props.style,
              height: '6px',
              background: 'lightgray',
              width: '100%',
              borderRadius: '4px',
              position: 'relative',
            }}
          >
            {children}
          </div>
        )}
        renderThumb={({ props, isDragged }) => (
          <div
            {...props}
            style={{
              ...props.style,
              height: '20px',
              width: '20px',
              backgroundColor: isDragged ? '#548BF4' : '#CCC',
              borderRadius: '50%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              boxShadow: '0px 2px 6px #AAA',
            }}
          />
        )}
      />
      <output style={{ marginTop: '10px', display: 'block', textAlign: 'center' }}>
        {localKmValues[0]} km - {localKmValues[1]} km
      </output>
    </div>
  );
};

export default KilometerRangeSlider;
