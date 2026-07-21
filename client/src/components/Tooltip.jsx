// client/src/components/Tooltip.jsx
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FaQuestionCircle } from 'react-icons/fa';
import './Tooltip.css';

function Tooltip({ text, children }) {
  const [show, setShow] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const containerRef = useRef(null);
  const tooltipRef = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (show && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const tooltipHeight = tooltipRef.current?.offsetHeight || 40;
      setPosition({
        top: rect.top - tooltipHeight - 8,
        left: rect.left + rect.width / 2
      });
    }
  }, [show]);

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => setShow(true), 200);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setShow(false);
  };

  return (
    <>
      <span 
        className="tooltip-container" 
        ref={containerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children || <FaQuestionCircle className="tooltip-icon" />}
      </span>
      {show && createPortal(
        <div 
          className="tooltip-portal"
          style={{
            position: 'fixed',
            top: position.top,
            left: position.left,
            transform: 'translateX(-50%)',
            zIndex: 99999,
            pointerEvents: 'none'
          }}
        >
          <div className="tooltip-text-portal" ref={tooltipRef}>
            {text}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

export default Tooltip;