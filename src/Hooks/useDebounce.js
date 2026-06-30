import { useState, useEffect } from "react";
const useDebouncedValue = (inputValue, delay) => {
    const [debouncedValue, setDebouncedValue] = useState(inputValue);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(inputValue);
        }, delay);
        // Clear the timeout if the effect is called again before the delay is over
        return () => {
            clearTimeout(handler);
        };
    }, [inputValue, delay]);
    return debouncedValue;
};
export default useDebouncedValue;