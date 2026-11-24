import { useEffect, useRef } from "react";
import driveTruck from "../Assets/Images/logistics/hero-truck-drive.webp";

/**
 * Loading road for the Logistics "no exact matches" box (EmptyResults).
 * The truck follows real progress: every finished wider search (`done` of `total`)
 * moves it one stretch forward; while a search is still running it creeps on, slowing
 * the longer it takes, so it never looks stuck. When `finished` turns true it speeds
 * off the road and calls `onArrive`, and the caller then shows the message or results.
 */
export default function LogisticsTruckRoad({ done = 0, total = 1, finished = false, onArrive, label = "Looking further afield…" }) {
  const roadRef = useRef(null);
  const truckRef = useRef(null);
  const live = useRef({ done, total, finished, segStart: 0, x: 0, arrived: false });
  const arriveRef = useRef(onArrive);
  arriveRef.current = onArrive;

  // A finished search starts a new stretch of road
  useEffect(() => {
    const s = live.current;
    if (done !== s.done) s.segStart = performance.now();
    s.done = done;
    s.total = Math.max(1, total);
    s.finished = finished;
  }, [done, total, finished]);

  useEffect(() => {
    const s = live.current;
    s.segStart = performance.now();
    let raf = 0;
    const arrive = () => {
      if (s.arrived) return;
      s.arrived = true;
      cancelAnimationFrame(raf);
      if (arriveRef.current) arriveRef.current();
    };
    const frame = (now) => {
      const road = roadRef.current;
      const truck = truckRef.current;
      if (!road || !truck) return;
      const tw = truck.getBoundingClientRect().width || 105;
      const run = road.clientWidth + tw;
      if (s.finished) {
        s.x += (1.02 - s.x) * 0.12 + 0.004;
      } else {
        const seg = 0.92 / s.total;
        const elapsed = (now - s.segStart) / 1000;
        const target = s.done * seg + seg * 0.85 * (1 - Math.exp(-elapsed / 1.2));
        s.x += (target - s.x) * 0.08;
      }
      truck.style.transform = `translateX(${-tw + s.x * run}px)`;
      road.setAttribute("aria-valuenow", String(Math.round(Math.min(1, s.x) * 100)));
      if (s.finished && s.x >= 1) {
        arrive();
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Background tab: animation frames pause, so don't hold the answer back
  useEffect(() => {
    if (!finished) return undefined;
    const t = setTimeout(() => {
      const s = live.current;
      if (!s.arrived) {
        s.arrived = true;
        if (arriveRef.current) arriveRef.current();
      }
    }, 1500);
    return () => clearTimeout(t);
  }, [finished]);

  return (
    <div
      className="truck-road"
      ref={roadRef}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={0}
      data-testid="truck-road"
    >
      <img className="truck-road__truck" ref={truckRef} src={driveTruck} alt="" />
      <span className="truck-road__label">{label}</span>
    </div>
  );
}
