import { AnimatePresence, motion } from 'framer-motion';
import type { DragControls } from 'framer-motion';
import { GripVertical, X } from 'lucide-react';
import { ICON_SIZE } from '../config/constants';

export function DragHandle({
  show,
  dragControls,
  onPointerDown,
}: {
  show: boolean;
  dragControls?: DragControls;
  onPointerDown?: (e: React.PointerEvent<HTMLSpanElement>) => void;
}) {
  const handler = onPointerDown ?? (dragControls ? (e: React.PointerEvent<HTMLSpanElement>) => dragControls.start(e) : undefined);
  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.span
          style={{ overflow: 'hidden', flexShrink: 0, display: 'flex' }}
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 44, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <span className="task-edit-drag" title="Drag to reorder" onPointerDown={handler}>
            <GripVertical size={ICON_SIZE} />
          </span>
        </motion.span>
      )}
    </AnimatePresence>
  );
}

export function DeleteButton({
  show,
  onClick,
  title = 'Delete',
}: {
  show: boolean;
  onClick: () => void;
  title?: string;
}) {
  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.span
          style={{ overflow: 'hidden', flexShrink: 0, display: 'flex' }}
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 44, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <button className="task-edit-delete" onClick={onClick} title={title}>
            <X size={ICON_SIZE} />
          </button>
        </motion.span>
      )}
    </AnimatePresence>
  );
}
