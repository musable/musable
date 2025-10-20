import React, { useRef, useState, useCallback } from 'react';
import {
  SpeakerWaveIcon,
  SpeakerXMarkIcon
} from '@heroicons/react/24/outline';
import { usePlayerStore } from '../../stores/playerStore';

const VolumeControl: React.FC = () => {
  const { volume, isMuted, setVolume, toggleMute } = usePlayerStore();
  const volumeRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const updateVolume = useCallback((clientX: number) => {
    if (!volumeRef.current) return;

    const rect = volumeRef.current.getBoundingClientRect();
    const clickX = clientX - rect.left;
    const sliderPosition = Math.max(0, Math.min(1, clickX / rect.width));

    // Convert linear slider position to logarithmic volume (gain = sliderValue^2)
    const logarithmicVolume = Math.pow(sliderPosition, 2);

    setVolume(logarithmicVolume);
  }, [setVolume]);

  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
    updateVolume(event.clientX);
  };

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (isDragging) {
      updateVolume(event.clientX);
    }
  }, [isDragging, updateVolume]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleVolumeChange = (event: React.MouseEvent<HTMLDivElement>) => {
    updateVolume(event.clientX);
  };

  const handleWheel = useCallback((event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();

    // Get current slider position (inverse of volume)
    const currentSliderPosition = Math.sqrt(volume);

    // Adjust by 5% per scroll tick (negative deltaY = scroll up = increase volume)
    const scrollDelta = -event.deltaY / 100;
    const adjustment = scrollDelta * 0.05;

    const newSliderPosition = Math.max(0, Math.min(1, currentSliderPosition + adjustment));
    const newVolume = Math.pow(newSliderPosition, 2);

    setVolume(newVolume);
  }, [volume, setVolume]);

  // Convert logarithmic volume back to linear slider position for display (sqrt to invert the ^2)
  const displayVolume = isMuted ? 0 : volume;
  const sliderPosition = Math.sqrt(displayVolume); // Inverse of ^2
  const volumePercentage = sliderPosition * 100;

  return (
    <div className="flex items-center space-x-3">
      {/* Mute/Unmute button */}
      <button
        onClick={toggleMute}
        className="p-1 text-gray-400 hover:text-white transition-colors"
        title={isMuted ? 'Unmute' : 'Mute'}
      >
        {isMuted || volume === 0 ? (
          <SpeakerXMarkIcon className="w-5 h-5" />
        ) : (
          <SpeakerWaveIcon className="w-5 h-5" />
        )}
      </button>

      {/* Volume slider */}
      <div
        ref={volumeRef}
        onClick={handleVolumeChange}
        onMouseDown={handleMouseDown}
        onWheel={handleWheel}
        className="w-20 h-1 bg-gray-600 rounded-full cursor-pointer group"
      >
        <div
          className="h-full bg-white rounded-full relative transition-all group-hover:bg-primary"
          style={{ width: `${volumePercentage}%` }}
        >
          <div className="absolute right-0 top-1/2 transform translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      {/* Volume percentage (hidden on mobile) */}
      <span className="text-xs text-gray-400 w-8 text-center hidden sm:block">
        {Math.round(volumePercentage)}
      </span>
    </div>
  );
};

export default VolumeControl;