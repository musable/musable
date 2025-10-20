import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Howl } from 'howler';
import { Song, PlayerState, RepeatMode } from '../types';
import { apiService } from '../services/api';
import { handleRoomAwareNext } from '../utils/roomPlayback';

// Media Session API helper functions
const updateMediaSession = (song: Song | null, isPlaying: boolean) => {
  if ('mediaSession' in navigator && song) {
    const artworkUrl = song.artwork_path ? apiService.getArtworkUrl(song.artwork_path) : undefined;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: song.title || 'Unknown Title',
      artist: song.artist_name || 'Unknown Artist',
      album: song.album_title || 'Unknown Album',
      artwork: artworkUrl ? [
        { src: artworkUrl, sizes: '96x96', type: 'image/jpeg' },
        { src: artworkUrl, sizes: '128x128', type: 'image/jpeg' },
        { src: artworkUrl, sizes: '192x192', type: 'image/jpeg' },
        { src: artworkUrl, sizes: '256x256', type: 'image/jpeg' },
        { src: artworkUrl, sizes: '384x384', type: 'image/jpeg' },
        { src: artworkUrl, sizes: '512x512', type: 'image/jpeg' }
      ] : undefined,
    });

    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  }
};

const setupMediaSessionHandlers = (store: any) => {
  if ('mediaSession' in navigator) {
    navigator.mediaSession.setActionHandler('play', () => {
      store.getState().play();
    });
    
    navigator.mediaSession.setActionHandler('pause', () => {
      store.getState().pause();
    });
    
    navigator.mediaSession.setActionHandler('previoustrack', () => {
      store.getState().previous();
    });
    
    navigator.mediaSession.setActionHandler('nexttrack', () => {
      store.getState().next();
    });
    
    navigator.mediaSession.setActionHandler('seekbackward', (details) => {
      const { howl, currentTime } = store.getState();
      if (howl) {
        const seekTime = Math.max(0, currentTime - (details.seekOffset || 10));
        store.getState().seek(seekTime);
      }
    });
    
    navigator.mediaSession.setActionHandler('seekforward', (details) => {
      const { howl, currentTime, duration } = store.getState();
      if (howl) {
        const seekTime = Math.min(duration, currentTime + (details.seekOffset || 10));
        store.getState().seek(seekTime);
      }
    });
    
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.seekTime !== undefined) {
        store.getState().seek(details.seekTime);
      }
    });
  }
};

interface PlayerActions {
  // Playback controls
  play: (song?: Song) => void;
  pause: () => void;
  stop: () => void;
  next: () => void;
  previous: () => void;
  seek: (time: number) => void;

  // Volume controls
  setVolume: (volume: number) => void;
  toggleMute: () => void;

  // EQ controls
  toggleEQ: () => void;
  setEQGains: (gains: number[]) => void;
  setMasterGain: (gain: number) => void;

  // Queue management
  setQueue: (songs: Song[], startIndex?: number) => void;
  addToQueue: (song: Song) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  shuffleQueue: () => void;

  // Playback modes
  toggleShuffle: () => void;
  setRepeatMode: (mode: RepeatMode) => void;
  cycleRepeatMode: () => void;

  // Internal state management
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setLoading: (loading: boolean) => void;
  updateCurrentSong: (song: Song) => void;
}

export interface AudioPreset {
  name: string;
  gains: number[];
  masterGain: number;
  reverbEnabled: boolean;
  reverbRoomSize: number;
  reverbDecay: number;
  reverbWetDry: number;
  reverbCutoff: number;
  limiterEnabled: boolean;
  limiterThreshold: number;
  limiterRelease: number;
}

interface PlayerStore extends PlayerState, PlayerActions {
  howl: Howl | null;
  eqEnabled: boolean;
  eqGains: number[];
  masterGain: number;
  eqFilters: BiquadFilterNode[];
  masterGainNode: GainNode | null;
  audioContext: AudioContext | null;

  // Reverb
  reverbEnabled: boolean;
  reverbRoomSize: number;
  reverbDecay: number;
  reverbWetDry: number;
  reverbCutoff: number;
  reverbNode: ConvolverNode | null;
  reverbDryGain: GainNode | null;
  reverbWetGain: GainNode | null;
  reverbFilter: BiquadFilterNode | null;

  // Limiter
  limiterEnabled: boolean;
  limiterThreshold: number;
  limiterRelease: number;
  limiterNode: DynamicsCompressorNode | null;

  customPresets: AudioPreset[];
  savePreset: (name: string) => void;
  deletePreset: (name: string) => void;
  toggleReverb: () => void;
  setReverbRoomSize: (size: number) => void;
  setReverbDecay: (decay: number) => void;
  setReverbWetDry: (mix: number) => void;
  setReverbCutoff: (cutoff: number) => void;
  toggleLimiter: () => void;
  setLimiterThreshold: (threshold: number) => void;
  setLimiterRelease: (release: number) => void;
}

const VOLUME_STORAGE_KEY = 'musable-volume';
const SHUFFLE_STORAGE_KEY = 'musable-shuffle';
const REPEAT_STORAGE_KEY = 'musable-repeat';
const EQ_ENABLED_STORAGE_KEY = 'musable-eq-enabled';
const EQ_GAINS_STORAGE_KEY = 'musable-eq-gains';
const MASTER_GAIN_STORAGE_KEY = 'musable-master-gain';
const REVERB_ENABLED_KEY = 'musable-reverb-enabled';
const REVERB_ROOM_SIZE_KEY = 'musable-reverb-room-size';
const REVERB_DECAY_KEY = 'musable-reverb-decay';
const REVERB_WET_DRY_KEY = 'musable-reverb-wet-dry';
const REVERB_CUTOFF_KEY = 'musable-reverb-cutoff';
const LIMITER_ENABLED_KEY = 'musable-limiter-enabled';
const LIMITER_THRESHOLD_KEY = 'musable-limiter-threshold';
const LIMITER_RELEASE_KEY = 'musable-limiter-release';
const CUSTOM_PRESETS_KEY = 'musable-custom-presets';

// EQ frequency bands (Hz)
const EQ_FREQUENCIES = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

// Generate reverb impulse response
const generateReverbImpulse = (ctx: AudioContext, roomSize: number, decay: number): AudioBuffer => {
  const sampleRate = ctx.sampleRate;
  const length = sampleRate * roomSize; // roomSize in seconds
  const impulse = ctx.createBuffer(2, length, sampleRate);
  const leftChannel = impulse.getChannelData(0);
  const rightChannel = impulse.getChannelData(1);

  for (let i = 0; i < length; i++) {
    const n = i / sampleRate;
    const envelope = Math.exp(-n * decay);
    leftChannel[i] = (Math.random() * 2 - 1) * envelope;
    rightChannel[i] = (Math.random() * 2 - 1) * envelope;
  }

  return impulse;
};

// Setup audio effects chain for Howler instance
const setupAudioEffects = (
  howl: Howl,
  eqEnabled: boolean,
  eqGains: number[],
  masterGainValue: number,
  reverbEnabled: boolean,
  reverbRoomSize: number,
  reverbDecay: number,
  reverbWetDry: number,
  reverbCutoff: number,
  limiterEnabled: boolean,
  limiterThreshold: number,
  limiterRelease: number
): {
  filters: BiquadFilterNode[],
  masterGainNode: GainNode,
  ctx: AudioContext,
  reverbNode: ConvolverNode | null,
  reverbDryGain: GainNode | null,
  reverbWetGain: GainNode | null,
  reverbFilter: BiquadFilterNode | null,
  limiterNode: DynamicsCompressorNode | null
} => {
  // @ts-ignore - Access Howler's internal audio context
  const ctx = Howler.ctx as AudioContext;
  // @ts-ignore - Access Howler's master gain node
  const howlerMasterGain = Howler.masterGain as GainNode;

  // Disconnect existing connections
  try {
    howlerMasterGain.disconnect();
  } catch (e) {
    // Already disconnected
  }

  // Create EQ filter nodes
  const filters: BiquadFilterNode[] = EQ_FREQUENCIES.map((freq, index) => {
    const filter = ctx.createBiquadFilter();
    filter.type = 'peaking';
    filter.frequency.value = freq;
    filter.Q.value = 1.0;
    filter.gain.value = eqEnabled ? eqGains[index] : 0;
    return filter;
  });

  // Create reverb nodes
  let reverbNode: ConvolverNode | null = null;
  let reverbDryGain: GainNode | null = null;
  let reverbWetGain: GainNode | null = null;
  let reverbFilter: BiquadFilterNode | null = null;

  if (reverbEnabled) {
    reverbNode = ctx.createConvolver();
    reverbNode.buffer = generateReverbImpulse(ctx, reverbRoomSize, reverbDecay);
    reverbDryGain = ctx.createGain();
    reverbWetGain = ctx.createGain();
    reverbDryGain.gain.value = 1 - reverbWetDry;
    reverbWetGain.gain.value = reverbWetDry;

    // Create lowpass filter for reverb tail
    reverbFilter = ctx.createBiquadFilter();
    reverbFilter.type = 'lowpass';
    reverbFilter.frequency.value = reverbCutoff;
    reverbFilter.Q.value = 1.0;
  }

  // Create limiter (compressor with hard knee)
  let limiterNode: DynamicsCompressorNode | null = null;
  if (limiterEnabled) {
    limiterNode = ctx.createDynamicsCompressor();
    limiterNode.threshold.value = limiterThreshold; // dB
    limiterNode.knee.value = 0; // Hard knee for limiting
    limiterNode.ratio.value = 20; // High ratio for limiting
    limiterNode.attack.value = 0.003; // 3ms attack
    limiterNode.release.value = limiterRelease; // User-adjustable release
  }

  // Create master gain node
  const masterGainNode = ctx.createGain();
  masterGainNode.gain.value = masterGainValue;

  // Build the audio chain:
  // howlerMasterGain -> EQ filters -> reverb (if enabled) -> limiter (if enabled) -> masterGain -> destination

  let currentNode: AudioNode = howlerMasterGain;

  // Connect EQ filters in series
  filters.forEach(filter => {
    currentNode.connect(filter);
    currentNode = filter;
  });

  // Connect reverb (wet/dry mix with lowpass filter)
  if (reverbEnabled && reverbNode && reverbDryGain && reverbWetGain && reverbFilter) {
    // Split signal into dry and wet paths
    currentNode.connect(reverbDryGain);
    currentNode.connect(reverbNode);

    // Filter reverb wet signal before mixing
    reverbNode.connect(reverbFilter);
    reverbFilter.connect(reverbWetGain);

    // Create a mixer node
    const reverbMixer = ctx.createGain();
    reverbMixer.gain.value = 1;
    reverbDryGain.connect(reverbMixer);
    reverbWetGain.connect(reverbMixer);

    currentNode = reverbMixer;
  }

  // Connect limiter
  if (limiterEnabled && limiterNode) {
    currentNode.connect(limiterNode);
    currentNode = limiterNode;
  }

  // Connect master gain and destination
  currentNode.connect(masterGainNode);
  masterGainNode.connect(ctx.destination);

  return { filters, masterGainNode, ctx, reverbNode, reverbDryGain, reverbWetGain, reverbFilter, limiterNode };
};

export const usePlayerStore = create<PlayerStore>()(
  persist(
    (set, get) => ({
      // Initial state
      currentSong: null,
      isPlaying: false,
      queue: [],
      currentIndex: 0,
      volume: parseFloat(localStorage.getItem(VOLUME_STORAGE_KEY) || '0.7'),
      isMuted: false,
      isShuffled: JSON.parse(localStorage.getItem(SHUFFLE_STORAGE_KEY) || 'false'),
      repeatMode: (localStorage.getItem(REPEAT_STORAGE_KEY) as RepeatMode) || 'none',
      currentTime: 0,
      duration: 0,
      isLoading: false,
      howl: null,
      eqEnabled: JSON.parse(localStorage.getItem(EQ_ENABLED_STORAGE_KEY) || 'false'),
      eqGains: JSON.parse(localStorage.getItem(EQ_GAINS_STORAGE_KEY) || '[0,0,0,0,0,0,0,0,0,0]'),
      masterGain: parseFloat(localStorage.getItem(MASTER_GAIN_STORAGE_KEY) || '1.0'),
      eqFilters: [],
      masterGainNode: null,
      audioContext: null,

      // Reverb
      reverbEnabled: JSON.parse(localStorage.getItem(REVERB_ENABLED_KEY) || 'false'),
      reverbRoomSize: parseFloat(localStorage.getItem(REVERB_ROOM_SIZE_KEY) || '1.5'),
      reverbDecay: parseFloat(localStorage.getItem(REVERB_DECAY_KEY) || '2.0'),
      reverbWetDry: parseFloat(localStorage.getItem(REVERB_WET_DRY_KEY) || '0.3'),
      reverbCutoff: parseFloat(localStorage.getItem(REVERB_CUTOFF_KEY) || '5000'),
      reverbNode: null,
      reverbDryGain: null,
      reverbWetGain: null,
      reverbFilter: null,

      // Limiter
      limiterEnabled: JSON.parse(localStorage.getItem(LIMITER_ENABLED_KEY) || 'false'),
      limiterThreshold: parseFloat(localStorage.getItem(LIMITER_THRESHOLD_KEY) || '-1.0'),
      limiterRelease: parseFloat(localStorage.getItem(LIMITER_RELEASE_KEY) || '0.25'),
      limiterNode: null,

      customPresets: JSON.parse(localStorage.getItem(CUSTOM_PRESETS_KEY) || '[]'),

      // Playback controls
      play: (song) => {
        console.log('🎵 PLAYER STORE: play() method called with song:', song?.id, song?.title);
        const state = get();
        console.log('🎵 PLAYER STORE: current state:', {
          currentSong: state.currentSong?.id || null,
          queue: state.queue.length,
          howl: !!state.howl,
          isPlaying: state.isPlaying
        });
        
        // If a new song is provided, update current song and queue, OR if no howl exists
        if (song && (song.id !== state.currentSong?.id || !state.howl)) {
          if (state.howl) {
            state.howl.unload();
          }
          
          const newQueue = state.queue.length > 0 ? state.queue : [song];
          const index = newQueue.findIndex(s => s.id === song.id);
          
          set({
            currentSong: song,
            queue: newQueue,
            currentIndex: index >= 0 ? index : 0,
            isLoading: true,
            currentTime: 0,
          });
          
          // Create new Howl instance
          const streamUrl = apiService.getStreamUrl(song.id);
          console.log('🎵 Creating Howl instance with stream URL:', streamUrl);
          
          // Detect if we're on mobile to use native volume controls
          const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                          window.innerWidth <= 768;
          
          const howl = new Howl({
            src: [streamUrl],
            html5: false, // IMPORTANT: Must be false for Web Audio API EQ to work
            preload: true,
            format: ['mp3'],
            onload: () => {
              set({
                isLoading: false,
                duration: howl.duration(),
                howl
              });
            },
            onplay: () => {
              set({ isPlaying: true });
              updateMediaSession(song, true);
              // Track play in analytics
              apiService.trackPlay({ songId: song.id }).catch(console.error);
            },
            onpause: () => {
              set({ isPlaying: false });
              updateMediaSession(song, false);
            },
            onend: () => {
              const currentState = get();
              const playedDuration = howl.seek() as number;
              const totalDuration = howl.duration();
              const completed = playedDuration / totalDuration > 0.8; // 80% completion threshold
              
              // Track completion
              apiService.trackPlay({ 
                songId: song.id, 
                durationPlayed: Math.floor(playedDuration),
                completed 
              }).catch(console.error);
              
              // Auto-advance to next song
              if (currentState.repeatMode === 'one') {
                howl.seek(0);
                howl.play();
              } else {
                // Use room-aware next logic
                handleRoomAwareNext();
              }
            },
            onloaderror: (id: number, error: any) => {
              console.error('🚨 Howler load error for stream URL:', streamUrl, 'Error:', error);
              set({ isLoading: false, isPlaying: false });
            },
            volume: state.isMuted ? 0 : (isMobile ? 1.0 : state.volume),
          });
          
          // Setup audio effects for the new howl instance
          const {
            filters,
            masterGainNode,
            ctx,
            reverbNode,
            reverbDryGain,
            reverbWetGain,
            reverbFilter,
            limiterNode
          } = setupAudioEffects(
            howl,
            state.eqEnabled,
            state.eqGains,
            state.masterGain,
            state.reverbEnabled,
            state.reverbRoomSize,
            state.reverbDecay,
            state.reverbWetDry,
            state.reverbCutoff,
            state.limiterEnabled,
            state.limiterThreshold,
            state.limiterRelease
          );

          // Update howl instance and start playing
          set({
            howl,
            eqFilters: filters,
            masterGainNode,
            audioContext: ctx,
            reverbNode,
            reverbDryGain,
            reverbWetGain,
            reverbFilter,
            limiterNode
          });
          howl.play();
          
        } else if (state.howl && state.currentSong) {
          // Resume current song
          // Ensure isPlaying state is updated before calling play
          set({ isPlaying: true });
          state.howl.play();

          // Update media session
          updateMediaSession(state.currentSong, true);
        }
      },

      pause: () => {
        const { howl } = get();
        if (howl) {
          howl.pause();
        }
      },

      stop: () => {
        const { howl } = get();
        if (howl) {
          howl.stop();
        }
        set({ 
          currentTime: 0,
          isPlaying: false 
        });
      },

      next: () => {
        const state = get();
        const { queue, currentIndex, repeatMode, isShuffled } = state;
        
        if (queue.length === 0) return;
        
        let nextIndex: number;
        
        if (isShuffled) {
          // Random next song (excluding current)
          const availableIndices = queue.map((_, i) => i).filter(i => i !== currentIndex);
          nextIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
        } else {
          nextIndex = currentIndex + 1;
          
          if (nextIndex >= queue.length) {
            if (repeatMode === 'all') {
              nextIndex = 0;
            } else {
              return; // End of queue
            }
          }
        }
        
        const nextSong = queue[nextIndex];
        if (nextSong) {
          set({ currentIndex: nextIndex });
          get().play(nextSong);
        }
      },

      previous: () => {
        const state = get();
        const { queue, currentIndex, howl } = state;
        
        if (queue.length === 0) return;
        
        // If more than 3 seconds into current song, restart it
        if (howl && (howl.seek() as number) > 3) {
          howl.seek(0);
          return;
        }
        
        let prevIndex = currentIndex - 1;
        if (prevIndex < 0) {
          prevIndex = queue.length - 1;
        }
        
        const prevSong = queue[prevIndex];
        if (prevSong) {
          set({ currentIndex: prevIndex });
          get().play(prevSong);
        }
      },

      seek: (time) => {
        const { howl } = get();
        if (howl) {
          howl.seek(time);
          set({ currentTime: time });
        }
      },

      // Volume controls
      setVolume: (volume) => {
        const { howl, isMuted } = get();
        const clampedVolume = Math.max(0, Math.min(1, volume));

        // Check if mobile - use native volume controls
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                        window.innerWidth <= 768;

        if (howl && !isMuted) {
          howl.volume(isMobile ? 1.0 : clampedVolume);
        }

        set({ volume: clampedVolume });
        localStorage.setItem(VOLUME_STORAGE_KEY, clampedVolume.toString());
      },

      toggleMute: () => {
        const { howl, volume, isMuted } = get();
        const newMuted = !isMuted;

        // Check if mobile - use native volume controls
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                        window.innerWidth <= 768;

        if (howl) {
          howl.volume(newMuted ? 0 : (isMobile ? 1.0 : volume));
        }

        set({ isMuted: newMuted });
      },

      // EQ controls
      toggleEQ: () => {
        const { eqEnabled, eqFilters, eqGains } = get();
        const newEnabled = !eqEnabled;

        // Update filter gains based on enabled state
        eqFilters.forEach((filter, index) => {
          if (filter) {
            filter.gain.value = newEnabled ? eqGains[index] : 0;
          }
        });

        set({ eqEnabled: newEnabled });
        localStorage.setItem(EQ_ENABLED_STORAGE_KEY, JSON.stringify(newEnabled));
      },

      setEQGains: (gains) => {
        const { eqFilters, eqEnabled } = get();

        // Update filter gains (only if EQ is enabled)
        eqFilters.forEach((filter, index) => {
          if (filter) {
            filter.gain.value = eqEnabled ? gains[index] : 0;
          }
        });

        set({ eqGains: gains });
        localStorage.setItem(EQ_GAINS_STORAGE_KEY, JSON.stringify(gains));
      },

      setMasterGain: (gain) => {
        const { masterGainNode } = get();
        const clampedGain = Math.max(0, Math.min(2, gain)); // 0 to 2x gain

        if (masterGainNode) {
          masterGainNode.gain.value = clampedGain;
        }

        set({ masterGain: clampedGain });
        localStorage.setItem(MASTER_GAIN_STORAGE_KEY, clampedGain.toString());
      },

      // Reverb controls
      toggleReverb: () => {
        const state = get();
        const newEnabled = !state.reverbEnabled;
        set({ reverbEnabled: newEnabled });
        localStorage.setItem(REVERB_ENABLED_KEY, JSON.stringify(newEnabled));

        // Rebuild audio chain when toggling reverb
        if (state.howl) {
          const {
            filters,
            masterGainNode,
            ctx,
            reverbNode,
            reverbDryGain,
            reverbWetGain,
            reverbFilter,
            limiterNode
          } = setupAudioEffects(
            state.howl,
            state.eqEnabled,
            state.eqGains,
            state.masterGain,
            newEnabled,
            state.reverbRoomSize,
            state.reverbDecay,
            state.reverbWetDry,
            state.reverbCutoff,
            state.limiterEnabled,
            state.limiterThreshold,
            state.limiterRelease
          );

          set({
            eqFilters: filters,
            masterGainNode,
            audioContext: ctx,
            reverbNode,
            reverbDryGain,
            reverbWetGain,
            reverbFilter,
            limiterNode
          });
        }
      },

      setReverbRoomSize: (size: number) => {
        const { reverbNode, audioContext, reverbDecay } = get();
        const clampedSize = Math.max(0.1, Math.min(5, size));

        if (reverbNode && audioContext) {
          reverbNode.buffer = generateReverbImpulse(audioContext, clampedSize, reverbDecay);
        }

        set({ reverbRoomSize: clampedSize });
        localStorage.setItem(REVERB_ROOM_SIZE_KEY, clampedSize.toString());
      },

      setReverbDecay: (decay: number) => {
        const { reverbNode, audioContext, reverbRoomSize } = get();
        const clampedDecay = Math.max(0.1, Math.min(10, decay));

        if (reverbNode && audioContext) {
          reverbNode.buffer = generateReverbImpulse(audioContext, reverbRoomSize, clampedDecay);
        }

        set({ reverbDecay: clampedDecay });
        localStorage.setItem(REVERB_DECAY_KEY, clampedDecay.toString());
      },

      setReverbWetDry: (mix: number) => {
        const { reverbDryGain, reverbWetGain } = get();
        const clampedMix = Math.max(0, Math.min(1, mix));

        if (reverbDryGain && reverbWetGain) {
          reverbDryGain.gain.value = 1 - clampedMix;
          reverbWetGain.gain.value = clampedMix;
        }

        set({ reverbWetDry: clampedMix });
        localStorage.setItem(REVERB_WET_DRY_KEY, clampedMix.toString());
      },

      setReverbCutoff: (cutoff: number) => {
        const { reverbFilter } = get();
        const clampedCutoff = Math.max(200, Math.min(20000, cutoff));

        if (reverbFilter) {
          reverbFilter.frequency.value = clampedCutoff;
        }

        set({ reverbCutoff: clampedCutoff });
        localStorage.setItem(REVERB_CUTOFF_KEY, clampedCutoff.toString());
      },

      // Limiter controls
      toggleLimiter: () => {
        const state = get();
        const newEnabled = !state.limiterEnabled;
        set({ limiterEnabled: newEnabled });
        localStorage.setItem(LIMITER_ENABLED_KEY, JSON.stringify(newEnabled));

        // Rebuild audio chain when toggling limiter
        if (state.howl) {
          const {
            filters,
            masterGainNode,
            ctx,
            reverbNode,
            reverbDryGain,
            reverbWetGain,
            reverbFilter,
            limiterNode
          } = setupAudioEffects(
            state.howl,
            state.eqEnabled,
            state.eqGains,
            state.masterGain,
            state.reverbEnabled,
            state.reverbRoomSize,
            state.reverbDecay,
            state.reverbWetDry,
            state.reverbCutoff,
            newEnabled,
            state.limiterThreshold,
            state.limiterRelease
          );

          set({
            eqFilters: filters,
            masterGainNode,
            audioContext: ctx,
            reverbNode,
            reverbDryGain,
            reverbWetGain,
            reverbFilter,
            limiterNode
          });
        }
      },

      setLimiterThreshold: (threshold: number) => {
        const { limiterNode } = get();
        const clampedThreshold = Math.max(-60, Math.min(0, threshold));

        if (limiterNode) {
          limiterNode.threshold.value = clampedThreshold;
        }

        set({ limiterThreshold: clampedThreshold });
        localStorage.setItem(LIMITER_THRESHOLD_KEY, clampedThreshold.toString());
      },

      setLimiterRelease: (release: number) => {
        const { limiterNode } = get();
        const clampedRelease = Math.max(0.01, Math.min(1, release));

        if (limiterNode) {
          limiterNode.release.value = clampedRelease;
        }

        set({ limiterRelease: clampedRelease });
        localStorage.setItem(LIMITER_RELEASE_KEY, clampedRelease.toString());
      },

      // Preset management (saves all effects settings)
      savePreset: (name: string) => {
        const state = get();
        const newPreset: AudioPreset = {
          name,
          gains: [...state.eqGains],
          masterGain: state.masterGain,
          reverbEnabled: state.reverbEnabled,
          reverbRoomSize: state.reverbRoomSize,
          reverbDecay: state.reverbDecay,
          reverbWetDry: state.reverbWetDry,
          reverbCutoff: state.reverbCutoff,
          limiterEnabled: state.limiterEnabled,
          limiterThreshold: state.limiterThreshold,
          limiterRelease: state.limiterRelease,
        };
        const updatedPresets = [...state.customPresets.filter(p => p.name !== name), newPreset];
        set({ customPresets: updatedPresets });
        localStorage.setItem(CUSTOM_PRESETS_KEY, JSON.stringify(updatedPresets));
      },

      deletePreset: (name: string) => {
        const { customPresets } = get();
        const updatedPresets = customPresets.filter(p => p.name !== name);
        set({ customPresets: updatedPresets });
        localStorage.setItem(CUSTOM_PRESETS_KEY, JSON.stringify(updatedPresets));
      },

      // Queue management
      setQueue: (songs, startIndex = 0) => {
        const state = get();
        
        // Stop current playback
        if (state.howl) {
          state.howl.unload();
        }
        
        set({
          queue: songs,
          currentIndex: Math.max(0, Math.min(startIndex, songs.length - 1)),
          currentSong: songs[startIndex] || null,
          howl: null,
          currentTime: 0,
          isPlaying: false,
        });
      },

      addToQueue: (song) => {
        const { queue } = get();
        set({ queue: [...queue, song] });
      },

      removeFromQueue: (index) => {
        const state = get();
        const { queue, currentIndex } = state;
        
        if (index < 0 || index >= queue.length) return;
        
        const newQueue = queue.filter((_, i) => i !== index);
        let newCurrentIndex = currentIndex;
        
        if (index < currentIndex) {
          newCurrentIndex = currentIndex - 1;
        } else if (index === currentIndex) {
          // Removing current song - pause playback
          if (state.howl) {
            state.howl.unload();
          }
          
          if (newQueue.length === 0) {
            set({
              queue: [],
              currentSong: null,
              currentIndex: 0,
              howl: null,
              isPlaying: false,
              currentTime: 0,
            });
            return;
          }
          
          // Play next song or wrap to beginning
          if (newCurrentIndex >= newQueue.length) {
            newCurrentIndex = 0;
          }
          
          set({
            queue: newQueue,
            currentIndex: newCurrentIndex,
            howl: null,
          });
          
          get().play(newQueue[newCurrentIndex]);
          return;
        }
        
        set({
          queue: newQueue,
          currentIndex: Math.max(0, newCurrentIndex),
        });
      },

      clearQueue: () => {
        const { howl } = get();
        if (howl) {
          howl.unload();
        }
        
        set({
          queue: [],
          currentSong: null,
          currentIndex: 0,
          howl: null,
          isPlaying: false,
          currentTime: 0,
          duration: 0,
        });
      },

      shuffleQueue: () => {
        const { queue, currentSong } = get();
        if (queue.length <= 1) return;
        
        const shuffled = [...queue];
        const currentSongIndex = shuffled.findIndex(s => s.id === currentSong?.id);
        
        // Remove current song from shuffling
        if (currentSongIndex > 0) {
          shuffled.splice(currentSongIndex, 1);
        }
        
        // Fisher-Yates shuffle
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        
        // Put current song back at the beginning if it exists
        if (currentSong && currentSongIndex >= 0) {
          shuffled.unshift(currentSong);
        }
        
        set({
          queue: shuffled,
          currentIndex: 0,
        });
      },

      // Playback modes
      toggleShuffle: () => {
        const { isShuffled } = get();
        const newShuffle = !isShuffled;
        
        if (newShuffle) {
          get().shuffleQueue();
        }
        
        set({ isShuffled: newShuffle });
        localStorage.setItem(SHUFFLE_STORAGE_KEY, JSON.stringify(newShuffle));
      },

      setRepeatMode: (mode) => {
        set({ repeatMode: mode });
        localStorage.setItem(REPEAT_STORAGE_KEY, mode);
      },

      cycleRepeatMode: () => {
        const { repeatMode } = get();
        const modes: RepeatMode[] = ['none', 'all', 'one'];
        const currentIndex = modes.indexOf(repeatMode);
        const nextMode = modes[(currentIndex + 1) % modes.length];
        
        get().setRepeatMode(nextMode);
      },

      // Internal state management
      setCurrentTime: (time) => {
        set({ currentTime: time });
      },

      setDuration: (duration) => {
        set({ duration });
      },

      setLoading: (loading) => {
        set({ isLoading: loading });
      },

      updateCurrentSong: (song) => {
        set({ currentSong: song });
      },
    }),
    {
      name: 'player-storage',
      partialize: (state) => ({
        volume: state.volume,
        isMuted: state.isMuted,
        isShuffled: state.isShuffled,
        repeatMode: state.repeatMode,
        eqEnabled: state.eqEnabled,
        eqGains: state.eqGains,
        masterGain: state.masterGain,
        reverbEnabled: state.reverbEnabled,
        reverbRoomSize: state.reverbRoomSize,
        reverbDecay: state.reverbDecay,
        reverbWetDry: state.reverbWetDry,
        limiterEnabled: state.limiterEnabled,
        limiterThreshold: state.limiterThreshold,
        limiterRelease: state.limiterRelease,
        customPresets: state.customPresets,
      }),
    }
  )
);

// Setup time update interval and media session
if (typeof window !== 'undefined') {
  // Setup media session handlers
  setupMediaSessionHandlers(usePlayerStore);
  
  setInterval(() => {
    const state = usePlayerStore.getState();
    if (state.howl && state.isPlaying) {
      const currentTime = state.howl.seek() as number;
      if (typeof currentTime === 'number' && !isNaN(currentTime)) {
        state.setCurrentTime(currentTime);
        
        // Update media session position
        if ('mediaSession' in navigator && navigator.mediaSession.setPositionState) {
          navigator.mediaSession.setPositionState({
            duration: state.duration,
            playbackRate: 1.0,
            position: currentTime,
          });
        }
      }
    }
  }, 1000);
}

