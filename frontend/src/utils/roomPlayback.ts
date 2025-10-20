import { Song } from '../types';
import { useRoomStore } from '../stores/roomStore';
import { usePlayerStore } from '../stores/playerStore';
import roomWebSocketService from '../services/roomService';
import toast from 'react-hot-toast';

/**
 * Unified playback handler that works both in room and solo mode
 * @param song - The song to play
 * @param songList - Optional list of songs to set as queue (only used in solo mode)
 */
export const handleRoomAwarePlayback = (song: Song, songList: Song[] = [song]) => {
  console.log('🎵 Room-aware playback called with song:', song.id, song.title);
  
  // Get room state
  const roomStore = useRoomStore.getState();
  const playerStore = usePlayerStore.getState();
  
  const isInRoom = roomStore.isInRoom();
  const isHost = roomStore.isHost();
  
  console.log('🎵 Room state - isInRoom:', isInRoom, 'isHost:', isHost);
  
  if (isInRoom) {
    if (isHost) {
      // Host: add to top of queue and auto-play for everyone
      console.log('🎵 Host mode: Adding to top of room queue and playing');
      roomWebSocketService.addToQueueTop(song.id);
      toast.success(`Playing "${song.title}" for everyone in the room`);
      
      // Host also plays locally
      console.log('🎵 Host also playing locally - setting queue and playing song');
      playerStore.setQueue(songList, songList.findIndex(s => s.id === song.id));
      playerStore.play(song);
      
      // Send room play command to synchronize with other users
      // Use setTimeout to ensure the song has started loading locally first
      setTimeout(() => {
        console.log('🎵 Sending room play command to synchronize with other users');
        roomWebSocketService.playRoom(song.id, 0);
      }, 100);
    } else {
      // Listeners: add to bottom of queue
      console.log('🎵 Listener mode: Adding to room queue');
      roomWebSocketService.addToQueue(song.id);
      toast.success(`Added "${song.title}" to room queue`);
    }
    return;
  }

  // Not in room: play locally
  console.log('🎵 Not in room: playing locally');
  playerStore.setQueue(songList, songList.findIndex(s => s.id === song.id));
  playerStore.play(song);
};

/**
 * Simplified version for cases where you don't need queue context
 */
export const playInRoom = (songId: number, songTitle: string) => {
  const roomStore = useRoomStore.getState();
  const isInRoom = roomStore.isInRoom();
  const isHost = roomStore.isHost();
  
  if (isInRoom) {
    if (isHost) {
      roomWebSocketService.addToQueueTop(songId);
      toast.success(`Playing "${songTitle}" for everyone in the room`);
      
      // Send room play command to synchronize with other users
      setTimeout(() => {
        roomWebSocketService.playRoom(songId, 0);
      }, 100);
    } else {
      roomWebSocketService.addToQueue(songId);
      toast.success(`Added "${songTitle}" to room queue`);
    }
    return true; // Handled in room
  }
  
  return false; // Not in room, caller should handle local playback
};

/**
 * Room-aware next song handler that works both in room and solo mode
 * When in a room, only the master host can remove the current song from the queue and play the next one
 * Regular hosts and listeners do nothing - only master host controls queue consumption
 */
export const handleRoomAwareNext = () => {
  const roomStore = useRoomStore.getState();
  const playerStore = usePlayerStore.getState();
  
  const isInRoom = roomStore.isInRoom();
  const isHost = roomStore.isHost();
  const isMasterHost = roomStore.isMasterHost();
  
  console.log('🎵 Room-aware next called - isInRoom:', isInRoom, 'isHost:', isHost, 'isMasterHost:', isMasterHost);
  
  if (isInRoom) {
    if (isMasterHost) {
      // Host: remove current song from queue and play next song
      const currentSong = playerStore.currentSong;
      const currentQueueItem = roomStore.queue.find(item => item.song_id === currentSong?.id);
      
      console.log('🎵 Current song:', currentSong?.id, 'Queue item:', currentQueueItem?.id);
      console.log('🎵 Room queue before removal:', roomStore.queue.map(item => ({ id: item.id, song_id: item.song_id, position: item.position })));
      
      if (currentQueueItem) {
        // Remove the current song from the queue
        console.log('🎵 Removing current song from queue - ID:', currentQueueItem.id, 'Song ID:', currentQueueItem.song_id);
        try {
          roomWebSocketService.removeFromQueue(currentQueueItem.id);
          
          // Wait a bit for the queue to update, then check for next song
          setTimeout(() => {
            const updatedQueue = useRoomStore.getState().queue;
            console.log('🎵 Room queue after removal:', updatedQueue.map(item => ({ id: item.id, song_id: item.song_id, position: item.position })));
            
            if (updatedQueue.length > 0) {
              // Play the next song (which should now be at the top of the queue)
              const nextSong = updatedQueue[0];
              console.log('🎵 Playing next song from queue:', nextSong.song_id);
              roomWebSocketService.changeSong(nextSong.song_id);
            } else {
              console.log('🎵 Room queue is empty, stopping playback');
              playerStore.pause();
            }
          }, 200); // Increased timeout to allow backend processing
        } catch (error) {
          console.error('🚨 Error removing song from queue:', error);
          // If removal failed, still try to play the next song without removing
          if (roomStore.queue.length > 1) {
            const nextSong = roomStore.queue[1]; // Skip current song
            console.log('🎵 Removal failed, playing next song without removal:', nextSong.song_id);
            roomWebSocketService.changeSong(nextSong.song_id);
          } else {
            console.log('🎵 Removal failed and no next song available');
            playerStore.pause();
          }
        }
      } else {
        console.log('🎵 Current song not found in room queue, checking if queue has songs');
        // If current song is not in queue but queue has items, play the first one
        if (roomStore.queue.length > 0) {
          const nextSong = roomStore.queue[0];
          console.log('🎵 Playing first song from queue:', nextSong.song_id);
          roomWebSocketService.changeSong(nextSong.song_id);
        } else {
          console.log('🎵 No songs in room queue, stopping playback');
          playerStore.pause();
        }
      }
    } else if (isHost) {
      // Regular host (not master): do nothing, only master host controls queue consumption
      console.log('🎵 Regular host mode: only master host can consume queue');
    } else {
      // Listeners: do nothing, host controls playback
      console.log('🎵 Listener mode: not advancing to next song');
    }
  } else {
    // Not in room: use local next logic
    console.log('🎵 Not in room: using local next logic');
    playerStore.next();
  }
};