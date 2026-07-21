// client/src/components/Periodic/PeriodicTimeline.jsx

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import './PeriodicTimeline.css';

const DEFAULT_COLORS = [
  '#ef4444', '#3b82f6', '#22c55e', '#f59e0b',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316',
  '#06b6d4', '#84cc16',
];

function getTickInterval(windowMinutes) {
  if (windowMinutes <= 30) return 5;
  if (windowMinutes <= 60) return 5;
  if (windowMinutes <= 90) return 10;
  if (windowMinutes <= 120) return 10;
  if (windowMinutes <= 180) return 15;
  if (windowMinutes <= 240) return 20;
  return 30;
}

function getSnapStep(windowMinutes) {
  if (windowMinutes <= 60) return 5;
  if (windowMinutes <= 120) return 10;
  if (windowMinutes <= 180) return 15;
  return 30;
}

function formatTime(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatTimeShort(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}`;
  return `${m} мин`;
}

function generateMarkers(interval, offset, windowSeconds) {
  const markers = [];
  const effectiveOffset = ((offset % interval) + interval) % interval;
  for (let t = effectiveOffset; t <= windowSeconds; t += interval) {
    markers.push(Math.round(t));
  }
  return markers;
}

function PeriodicTimeline({ events, onUpdate }) {
  const [windowMinutes, setWindowMinutes] = useState(60);
  const windowSeconds = windowMinutes * 60;
  const tickIntervalMin = getTickInterval(windowMinutes);
  const snapStep = getSnapStep(windowMinutes);

  // Локальные offsets для drag без спама сохранений
  const [localOffsets, setLocalOffsets] = useState({});
  const [dragging, setDragging] = useState(null); // { eventName, startX, startOffset }
  const trackRefs = useRef({}); // ref на каждый row-track

  const resolvedOffsets = useMemo(() => {
    if (dragging) {
      return localOffsets;
    }
    const offsets = {};
    Object.entries(events || {}).forEach(([name, e]) => {
      if (e.enabled && e.interval > 0) {
        offsets[name] = e.offset || 0;
      }
    });
    return offsets;
  }, [events, dragging, localOffsets]);

  // Активные события
  const activeEvents = useMemo(() => {
    return Object.entries(events || {})
      .filter(([, e]) => e.enabled && e.interval > 0)
      .map(([name, e], index) => ({
        name,
        interval: e.interval,
        offset: resolvedOffsets[name] ?? (e.offset || 0),
        color: e.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
        displayName: e.name || name,
      }));
  }, [events, resolvedOffsets]);

  // Промежуточные отметки
  const ticks = useMemo(() => {
    const result = [];
    const tickSec = tickIntervalMin * 60;
    for (let t = 0; t <= windowSeconds; t += tickSec) {
      result.push(t);
    }
    return result;
  }, [windowSeconds, tickIntervalMin]);

  // Коллизии
  const collisions = useMemo(() => {
    const timeMap = new Map();
    activeEvents.forEach(ev => {
      const markers = generateMarkers(ev.interval, ev.offset, windowSeconds);
      markers.forEach(t => {
        if (!timeMap.has(t)) timeMap.set(t, []);
        timeMap.get(t).push(ev.name);
      });
    });
    const result = new Set();
    timeMap.forEach((names, time) => {
      if (names.length > 1) result.add(time);
    });
    return result;
  }, [activeEvents, windowSeconds]);

  // --- Drag logic ---
  const handleMouseDown = useCallback((e, eventName, currentOffset) => {
    e.preventDefault();
    setDragging({ eventName, startX: e.clientX, startOffset: currentOffset });
  }, []);

  const handleTouchStart = useCallback((e, eventName, currentOffset) => {
    const touch = e.touches[0];
    setDragging({ eventName, startX: touch.clientX, startOffset: currentOffset });
  }, []);

  useEffect(() => {
    if (!dragging) return;

    const eventData = activeEvents.find(ev => ev.name === dragging.eventName);
    if (!eventData) return;

    const trackEl = trackRefs.current[dragging.eventName];
    if (!trackEl) return;

    const handleMove = (clientX) => {
      const rect = trackEl.getBoundingClientRect();
      const deltaRatio = (clientX - dragging.startX) / rect.width;
      const deltaSeconds = deltaRatio * windowSeconds;

      let newOffset = dragging.startOffset + deltaSeconds;
      newOffset = Math.round(newOffset / snapStep) * snapStep;

      const interval = eventData.interval;
      newOffset = ((newOffset % interval) + interval) % interval;

      setLocalOffsets(prev => ({ ...prev, [dragging.eventName]: newOffset }));
    };

    const onMouseMove = (e) => handleMove(e.clientX);
    const onTouchMove = (e) => {
      e.preventDefault();
      handleMove(e.touches[0].clientX);
    };

    const onEnd = () => {
      // Сохраняем offset в конфиг при отпускании
      const finalOffset = localOffsets[dragging.eventName] ?? dragging.startOffset;
      const eventName = dragging.eventName;
      setDragging(null);

      // Обновляем конфиг через onUpdate
      const newEvents = { ...events };
      if (newEvents[eventName]) {
        newEvents[eventName] = {
          ...newEvents[eventName],
          offset: Math.round(finalOffset),
        };
        onUpdate(newEvents);
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onEnd);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onEnd);
    };
  }, [dragging, activeEvents, windowSeconds, snapStep, events, onUpdate, localOffsets]);

  // Сохранение ref для onEnd — нужно актуальное значение localOffsets
  // useEffect выше перезаписывает обработчики при каждом изменении localOffsets,
  // поэтому onEnd всегда видит актуальный localOffsets

  if (activeEvents.length === 0) {
    return null;
  }

  const ROW_HEIGHT = 40;
  const AXIS_HEIGHT = 28;

  const formatWindowLabel = (mins) => {
    if (mins >= 60) {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return m > 0 ? `${h} ч ${m} мин` : `${h} ч`;
    }
    return `${mins} мин`;
  };

  return (
    <div className="periodic-timeline">
      <div className="timeline-header">
        <h3>⏱️ Таймлайн событий</h3>
        <div className="timeline-window-control">
          <label>Тайм-окно:</label>
          <input
            type="range"
            min={30}
            max={300}
            step={10}
            value={windowMinutes}
            onChange={(e) => setWindowMinutes(Number(e.target.value))}
          />
          <span className="window-value">{formatWindowLabel(windowMinutes)}</span>
        </div>
        {collisions.size > 0 && (
          <div className="collision-warning">
            ⚠️ Наложения: {collisions.size}
          </div>
        )}
      </div>

      <div className="timeline-body">
        {/* Ось времени */}
        <div className="timeline-axis" style={{ height: AXIS_HEIGHT }}>
          {ticks.map(t => (
            <div
              key={t}
              className="timeline-tick"
              style={{ left: `${(t / windowSeconds) * 100}%` }}
            >
              <div className="tick-line" />
              <span className="tick-label">{formatTimeShort(t)}</span>
            </div>
          ))}
        </div>

        {/* Строки событий */}
        <div className="timeline-rows">
          {activeEvents.map((ev) => {
            const markers = generateMarkers(ev.interval, ev.offset, windowSeconds);
            const isDraggingThis = dragging?.eventName === ev.name;

            return (
              <div
                key={ev.name}
                className="timeline-row"
                style={{ height: ROW_HEIGHT }}
              >
                <div className="row-label" title={ev.displayName}>
                  <span
                    className="row-color-dot"
                    style={{ backgroundColor: ev.color }}
                  />
                  <span className="row-name">{ev.displayName}</span>
                </div>

                <div
                  className="row-track"
                  ref={el => { trackRefs.current[ev.name] = el; }}
                >
                  <div
                    className="row-line"
                    style={{ backgroundColor: ev.color + '20' }}
                  />

                  {/* Вертикальные линии сетки */}
                  {ticks.map(t => (
                    <div
                      key={t}
                      className="row-grid-line"
                      style={{ left: `${(t / windowSeconds) * 100}%` }}
                    />
                  ))}

                  {markers.map((t, i) => {
                    const leftPercent = (t / windowSeconds) * 100;
                    const isCollision = collisions.has(t);

                    return (
                      <div
                        key={i}
                        className={[
                          'timeline-marker',
                          isDraggingThis ? 'dragging' : '',
                          isCollision ? 'collision' : '',
                        ].filter(Boolean).join(' ')}
                        style={{
                          left: `${leftPercent}%`,
                          backgroundColor: ev.color,
                          borderColor: isCollision ? '#fff' : ev.color,
                        }}
                        title={`${ev.displayName}: ${formatTime(t)}${isCollision ? ' ⚠️ наложение' : ''}`}
                        onMouseDown={(e) => handleMouseDown(e, ev.name, ev.offset)}
                        onTouchStart={(e) => handleTouchStart(e, ev.name, ev.offset)}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="timeline-hint">
        💡 Перетаскивайте метки для настройки смещения — все метки одного события сдвигаются вместе.
        {dragging && (
          <span className="timeline-dragging-info">
            {' '}Смещение: {formatTime(localOffsets[dragging.eventName] || 0)}
          </span>
        )}
      </div>
    </div>
  );
}

export default PeriodicTimeline;