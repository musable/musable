import { useState, useCallback, useRef, useEffect } from 'react';
import { Song } from '../types';

interface ContextMenuState {
  isOpen: boolean;
  position: { x: number; y: number };
  song: Song | null;
}

export const useContextMenu = () => {
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    isOpen: false,
    position: { x: 0, y: 0 },
    song: null
  });

  const touchStartTime = useRef<number>(0);
  const touchTimer = useRef<NodeJS.Timeout | null>(null);
  const isLongPress = useRef<boolean>(false);

  const openContextMenu = useCallback((event: React.MouseEvent | MouseEvent, song: Song) => {
    event.preventDefault();
    event.stopPropagation();
    
    setContextMenu({
      isOpen: true,
      position: { x: event.clientX, y: event.clientY },
      song
    });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu({
      isOpen: false,
      position: { x: 0, y: 0 },
      song: null
    });
  }, []);

  // Handle right-click context menu
  const handleContextMenu = useCallback((event: React.MouseEvent, song: Song) => {
    openContextMenu(event, song);
  }, [openContextMenu]);

  // Handle mobile touch and hold
  const handleTouchStart = useCallback((event: React.TouchEvent, song: Song) => {
    touchStartTime.current = Date.now();
    isLongPress.current = false;

    // Clear any existing timer
    if (touchTimer.current) {
      clearTimeout(touchTimer.current);
    }

    // Start long press timer
    touchTimer.current = setTimeout(() => {
      isLongPress.current = true;
      const touch = event.touches[0];
      if (touch) {
        // Create a synthetic mouse event for consistency
        const syntheticEvent = {
          preventDefault: () => event.preventDefault(),
          stopPropagation: () => event.stopPropagation(),
          clientX: touch.clientX,
          clientY: touch.clientY
        } as MouseEvent;
        
        // Add haptic feedback if supported
        if ('vibrate' in navigator) {
          navigator.vibrate(50);
        }
        
        openContextMenu(syntheticEvent, song);
      }
    }, 500); // 500ms long press threshold
  }, [openContextMenu]);

  const handleTouchEnd = useCallback(() => {
    if (touchTimer.current) {
      clearTimeout(touchTimer.current);
    }
    
    // Reset long press flag after a short delay
    setTimeout(() => {
      isLongPress.current = false;
    }, 100);
  }, []);

  const handleTouchMove = useCallback(() => {
    // Cancel long press if user moves finger
    if (touchTimer.current) {
      clearTimeout(touchTimer.current);
    }
  }, []);

  // Handle click events - prevent if it was a long press
  const handleClick = useCallback((event: React.MouseEvent, originalHandler?: (event: React.MouseEvent) => void) => {
    if (isLongPress.current) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    
    if (originalHandler) {
      originalHandler(event);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (touchTimer.current) {
        clearTimeout(touchTimer.current);
      }
    };
  }, []);

  // Disable browser's default context menu globally
  useEffect(() => {
    const handleGlobalContextMenu = (event: MouseEvent) => {
      // Prevent default context menu everywhere
      event.preventDefault();
    };

    document.addEventListener('contextmenu', handleGlobalContextMenu);
    return () => {
      document.removeEventListener('contextmenu', handleGlobalContextMenu);
    };
  }, []);

  return {
    contextMenu,
    openContextMenu,
    closeContextMenu,
    handleContextMenu,
    handleTouchStart,
    handleTouchEnd,
    handleTouchMove,
    handleClick
  };
};