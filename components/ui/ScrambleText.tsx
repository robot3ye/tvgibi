'use client';

import React, { useRef, useState, useEffect } from 'react';

const chars = '!<>-_\\\\/[]{}—=+*^?#________';

const ScrambleText = ({ 
    text, 
    delay = 0, 
    className = '',
    hoverClassName = ''
}: { 
    text: string, 
    delay?: number,
    className?: string,
    hoverClassName?: string
}) => {
    const [displayText, setDisplayText] = useState('');
    const [isHovered, setIsHovered] = useState(false);
    const textRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        let timeout: NodeJS.Timeout;
        let frame: number;
        let iteration = 0;
        
        const scramble = () => {
            const length = text.length;
            let result = '';
            for (let i = 0; i < length; i++) {
                if (i < iteration) {
                    result += text[i];
                } else {
                    result += chars[Math.floor(Math.random() * chars.length)];
                }
            }
            setDisplayText(result);
            
            if (iteration < length) {
                iteration += 1 / 3; // speed of unscrambling
                frame = requestAnimationFrame(scramble);
            }
        };

        timeout = setTimeout(() => {
            frame = requestAnimationFrame(scramble);
        }, delay * 1000);

        return () => {
            clearTimeout(timeout);
            cancelAnimationFrame(frame);
        };
    }, [text, delay]);

    const handleMouseEnter = () => {
        setIsHovered(true);
        let frame: number;
        let iteration = 0;
        
        const scramble = () => {
            const length = text.length;
            let result = '';
            for (let i = 0; i < length; i++) {
                if (i < iteration) {
                    result += text[i];
                } else {
                    result += chars[Math.floor(Math.random() * chars.length)];
                }
            }
            if (textRef.current) {
                textRef.current.innerText = result;
            }
            
            if (iteration < length) {
                iteration += 1 / 2; // hover scramble speed
                frame = requestAnimationFrame(scramble);
            }
        };
        frame = requestAnimationFrame(scramble);
    };

    const handleMouseLeave = () => {
        setIsHovered(false);
        if (textRef.current) {
            textRef.current.innerText = text;
        }
    };

    const defaultClass = className || 'text-[#d3f800]';
    const defaultHoverClass = hoverClassName || 'text-[#00ffff] drop-shadow-[0_0_5px_rgba(0,255,255,0.8)]';

    return (
        <span 
            ref={textRef}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className={`transition-colors duration-200 ${isHovered ? defaultHoverClass : defaultClass}`}
        >
            {displayText}
        </span>
    );
};

export default ScrambleText;
