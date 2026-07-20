import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FaQuestionCircle } from 'react-icons/fa';
import './Tooltip.css';

function Tooltip({ text }) {
  const [show, setShow] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const iconRef = useRef(null);
  const tooltipRef = useRef(null);

  useEffect(() => {
    if (show && iconRef.current) {
      const rect = iconRef.current.getBoundingClientRect();
      setPosition({
        top: rect.top - 10, // Немного выше иконки
        left: rect.left + rect.width / 2
      });
    }
  }, [show]);

  return (
    <>
      <span className="tooltip-container" ref={iconRef}>
        <FaQuestionCircle 
          className="tooltip-icon"
          onMouseEnter={() => setShow(true)}
          onMouseLeave={() => setShow(false)}
        />
      </span>
      {show && createPortal(
        <div 
          className="tooltip-portal"
          style={{
            position: 'fixed',
            top: position.top - 40,
            left: position.left,
            transform: 'translateX(-50%)',
            zIndex: 99999,
            pointerEvents: 'none'
          }}
        >
          <div className="tooltip-text-portal">{text}</div>
        </div>,
        document.body
      )}
    </>
  );
}

export default Tooltip;