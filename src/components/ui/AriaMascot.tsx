import React from 'react';
import { motion } from 'framer-motion';

type MascotState = 'idle' | 'happy' | 'thinking' | 'sad' | 'excited';

interface AriaMascotProps {
state: MascotState;
}

export const AriaMascot = ({ state }: AriaMascotProps) => {
const expressions = {
idle: '👋',
happy: '😊',
thinking: '🤔',
sad: '😟',
excited: '🤩'
};

return (
<motion.div
initial={{ scale: 0 }}
animate={{
scale: 1,
y: [0, -10, 0],
rotate: state === 'excited' ? [0, -10, 10, 0] : 0
}}
transition={{
y: { repeat: Infinity, duration: 2, ease: "easeInOut" },
rotate: { duration: 0.5 }
}}
className="text-6xl cursor-pointer select-none"
>
{expressions[state]}
</motion.div>
);
};
