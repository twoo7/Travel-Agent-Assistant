"use client";

import { useRef, useLayoutEffect } from "react";
import { motion, useMotionValue, animate, type PanInfo } from "framer-motion";

const PEEK_PX = 200; // px visible when collapsed (drag handle + name + action bar)
const SPRING = { type: "spring" as const, stiffness: 360, damping: 38 };

interface Props {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function BottomSheet({ open, onClose, children }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const y = useMotionValue(0);
  const isExpanded = useRef(false);

  useLayoutEffect(() => {
    if (!open || !ref.current) return;
    const h = ref.current.offsetHeight;
    y.set(h);
    animate(y, h - PEEK_PX, SPRING);
    isExpanded.current = false;
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleDragEnd(_: unknown, info: PanInfo) {
    const h = ref.current?.offsetHeight ?? 500;
    const collapsedY = h - PEEK_PX;
    const cur = y.get();
    const vel = info.velocity.y;

    const draggedDown = vel > 300 || (vel >= 0 && cur > collapsedY + 80);
    const draggedUp   = vel < -300 || cur < collapsedY - 80;

    if (draggedDown) {
      if (isExpanded.current) {
        isExpanded.current = false;
        animate(y, collapsedY, SPRING);
      } else {
        animate(y, h + 20, { ...SPRING, stiffness: 280 }).then(onClose);
      }
    } else if (draggedUp) {
      isExpanded.current = true;
      animate(y, 0, SPRING);
    } else {
      const target = cur < collapsedY * 0.5 ? 0 : collapsedY;
      isExpanded.current = target === 0;
      animate(y, target, SPRING);
    }
  }

  if (!open) return null;

  return (
    <motion.div
      ref={ref}
      style={{ y, touchAction: "none", height: "75vh" }}
      drag="y"
      dragMomentum={false}
      onDrag={() => { if (y.get() < 0) y.set(0); }}
      onDragEnd={handleDragEnd}
      className="absolute bottom-0 left-0 right-0 md:w-[420px] md:mx-auto z-50 rounded-t-2xl shadow-[0_-4px_24px_rgba(0,0,0,0.10)] overflow-hidden flex flex-col bg-surface border border-b-0 border-border"
    >
      {/* Drag handle */}
      <div className="flex-none flex justify-center pt-2.5 pb-1 cursor-grab active:cursor-grabbing select-none">
        <div className="w-9 h-1 rounded-full bg-border2" />
      </div>
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {children}
      </div>
    </motion.div>
  );
}
