import React, { useState, useEffect } from 'react';
import { XMarkIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { usePlayerStore, AudioPreset } from '../../stores/playerStore';

const DEFAULT_AUDIO_PRESETS: AudioPreset[] = [
  {
    name: 'Flat',
    gains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    masterGain: 1.0,
    reverbEnabled: false,
    reverbRoomSize: 1.5,
    reverbDecay: 2.0,
    reverbWetDry: 0.3,
    reverbCutoff: 5000,
    limiterEnabled: false,
    limiterThreshold: -1.0,
    limiterRelease: 0.25,
  },
  {
    name: 'Bass Boost',
    gains: [8, 6, 4, 2, 0, 0, 0, 0, 0, 0],
    masterGain: 0.8,
    reverbEnabled: false,
    reverbRoomSize: 1.5,
    reverbDecay: 2.0,
    reverbWetDry: 0.3,
    reverbCutoff: 5000,
    limiterEnabled: true,
    limiterThreshold: -1.0,
    limiterRelease: 0.25,
  },
  {
    name: 'Concert Hall',
    gains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    masterGain: 0.9,
    reverbEnabled: true,
    reverbRoomSize: 3.5,
    reverbDecay: 4.0,
    reverbWetDry: 0.5,
    reverbCutoff: 8000,
    limiterEnabled: true,
    limiterThreshold: -2.0,
    limiterRelease: 0.3,
  },
  {
    name: 'Club',
    gains: [6, 4, 2, 0, -2, -2, 0, 2, 4, 6],
    masterGain: 0.85,
    reverbEnabled: true,
    reverbRoomSize: 2.0,
    reverbDecay: 2.5,
    reverbWetDry: 0.35,
    reverbCutoff: 3000,
    limiterEnabled: true,
    limiterThreshold: -1.5,
    limiterRelease: 0.2,
  },
];

const EQ_BANDS = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

interface EqualizerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const EqualizerModal: React.FC<EqualizerModalProps> = ({ isOpen, onClose }) => {
  const {
    eqEnabled,
    toggleEQ,
    eqGains,
    setEQGains,
    masterGain,
    setMasterGain,
    reverbEnabled,
    toggleReverb,
    reverbRoomSize,
    setReverbRoomSize,
    reverbDecay,
    setReverbDecay,
    reverbWetDry,
    setReverbWetDry,
    reverbCutoff,
    setReverbCutoff,
    limiterEnabled,
    toggleLimiter,
    limiterThreshold,
    setLimiterThreshold,
    limiterRelease,
    setLimiterRelease,
    customPresets,
    savePreset,
    deletePreset,
  } = usePlayerStore();

  const [selectedPreset, setSelectedPreset] = useState<string>('Custom');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [presetName, setPresetName] = useState('');

  const allPresets = [...DEFAULT_AUDIO_PRESETS, ...customPresets];

  const applyPreset = (preset: AudioPreset) => {
    setEQGains(preset.gains);
    setMasterGain(preset.masterGain);
    if (preset.reverbEnabled !== reverbEnabled) toggleReverb();
    setReverbRoomSize(preset.reverbRoomSize);
    setReverbDecay(preset.reverbDecay);
    setReverbWetDry(preset.reverbWetDry);
    setReverbCutoff(preset.reverbCutoff);
    if (preset.limiterEnabled !== limiterEnabled) toggleLimiter();
    setLimiterThreshold(preset.limiterThreshold);
    setLimiterRelease(preset.limiterRelease);
    setSelectedPreset(preset.name);
  };

  const handleGainChange = (index: number, value: number) => {
    const newGains = [...eqGains];
    newGains[index] = value;
    setEQGains(newGains);
    setSelectedPreset('Custom');
  };

  const handleSavePreset = () => {
    if (presetName.trim()) {
      savePreset(presetName.trim());
      setPresetName('');
      setShowSaveDialog(false);
    }
  };

  const handleDeletePreset = (name: string) => {
    if (window.confirm(`Delete preset "${name}"?`)) {
      deletePreset(name);
      if (selectedPreset === name) {
        setSelectedPreset('Custom');
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-2" onClick={onClose}>
      <div
        className="bg-gray-800 rounded-lg p-4 w-full max-w-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-white">Audio Effects</h2>
            <button
              onClick={toggleEQ}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                eqEnabled ? 'bg-primary text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              EQ: {eqEnabled ? 'On' : 'Off'}
            </button>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white transition-colors">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Top Section: Presets and Master Gain */}
        <div className="mb-4">
          {/* Presets */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-300">Presets</label>
              <button
                onClick={() => setShowSaveDialog(true)}
                className="p-1 text-gray-400 hover:text-primary transition-colors"
                title="Save current as preset"
              >
                <PlusIcon className="w-4 h-4" />
              </button>
            </div>

            {showSaveDialog && (
              <div className="mb-3 p-2 bg-gray-700 rounded">
                <input
                  type="text"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  placeholder="Preset name"
                  className="w-full px-2 py-1 bg-gray-800 text-white text-sm rounded mb-2 focus:outline-none focus:ring-1 focus:ring-primary"
                  onKeyPress={(e) => e.key === 'Enter' && handleSavePreset()}
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSavePreset}
                    className="flex-1 px-2 py-1 bg-primary text-white text-sm rounded hover:bg-blue-600"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {setShowSaveDialog(false); setPresetName('');}}
                    className="flex-1 px-2 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-500"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              {allPresets.map((preset) => {
                const isCustom = !DEFAULT_AUDIO_PRESETS.find(p => p.name === preset.name);
                return (
                  <div key={preset.name} className="flex items-center gap-1">
                    <button
                      onClick={() => applyPreset(preset)}
                      className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-colors text-center ${
                        selectedPreset === preset.name
                          ? 'bg-primary text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {preset.name}
                    </button>
                    {isCustom && (
                      <button
                        onClick={() => handleDeletePreset(preset.name)}
                        className="p-2 bg-gray-700 rounded text-gray-400 hover:text-red-500 hover:bg-gray-600 transition-colors"
                        title="Delete preset"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Master Gain */}
          <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-gray-300">Master Gain</label>
                <span className="text-xs text-primary font-semibold">
                  {masterGain > 1 ? '+' : ''}{((masterGain - 1) * 100).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="2"
                step="0.01"
                value={masterGain}
                onChange={(e) => {setMasterGain(parseFloat(e.target.value)); setSelectedPreset('Custom');}}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider-thumb"
              />
              {masterGain > 1.2 && (
                <p className="text-xs text-yellow-500 mt-1">⚠️ High gain may cause clipping</p>
              )}
          </div>
        </div>

        {/* Middle Section: EQ */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-gray-300">10-Band Equalizer</label>
            <button
              onClick={() => {
                setEQGains([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
                setSelectedPreset('Custom');
              }}
              className="text-xs text-gray-400 hover:text-primary transition-colors"
            >
              Reset EQ
            </button>
          </div>
          <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
            <div className="flex items-end justify-between gap-3 min-w-[600px]">
              {EQ_BANDS.map((freq, index) => (
                <div key={freq} className="flex flex-col items-center flex-1 min-w-[50px]">
                  <div className="h-40 mb-2 flex items-center justify-center relative">
                    <input
                      type="range"
                      min="-12"
                      max="12"
                      step="0.5"
                      value={eqGains[index]}
                      onChange={(e) => handleGainChange(index, parseFloat(e.target.value))}
                      className="eq-slider"
                      disabled={!eqEnabled}
                    />
                  </div>
                  <span className="text-xs text-primary font-semibold mb-1 min-w-[2rem] text-center">
                    {eqGains[index] > 0 ? '+' : ''}{eqGains[index].toFixed(1)}
                  </span>
                  <span className="text-xs text-gray-400 font-medium whitespace-nowrap">
                    {freq >= 1000 ? `${freq / 1000}k` : freq}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Section: Reverb and Limiter */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Reverb */}
          <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-300">Reverb</label>
                <button
                  onClick={() => {toggleReverb(); setSelectedPreset('Custom');}}
                  className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                    reverbEnabled ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300'
                  }`}
                >
                  {reverbEnabled ? 'On' : 'Off'}
                </button>
              </div>
              <div className="space-y-2 text-xs">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-400">Room Size</span>
                    <span className="text-primary font-semibold">{reverbRoomSize.toFixed(1)}s</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="5"
                    step="0.1"
                    value={reverbRoomSize}
                    onChange={(e) => {setReverbRoomSize(parseFloat(e.target.value)); setSelectedPreset('Custom');}}
                    disabled={!reverbEnabled}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider-thumb"
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-400">Decay</span>
                    <span className="text-primary font-semibold">{reverbDecay.toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="10"
                    step="0.1"
                    value={reverbDecay}
                    onChange={(e) => {setReverbDecay(parseFloat(e.target.value)); setSelectedPreset('Custom');}}
                    disabled={!reverbEnabled}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider-thumb"
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-400">Mix</span>
                    <span className="text-primary font-semibold">{(reverbWetDry * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={reverbWetDry}
                    onChange={(e) => {setReverbWetDry(parseFloat(e.target.value)); setSelectedPreset('Custom');}}
                    disabled={!reverbEnabled}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider-thumb"
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-400">Cutoff</span>
                    <span className="text-primary font-semibold">{reverbCutoff >= 1000 ? `${(reverbCutoff / 1000).toFixed(1)}k` : reverbCutoff}Hz</span>
                  </div>
                  <input
                    type="range"
                    min="200"
                    max="20000"
                    step="100"
                    value={reverbCutoff}
                    onChange={(e) => {setReverbCutoff(parseFloat(e.target.value)); setSelectedPreset('Custom');}}
                    disabled={!reverbEnabled}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider-thumb"
                  />
                </div>
              </div>
          </div>

          {/* Limiter */}
          <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-300">Limiter</label>
                <button
                  onClick={() => {toggleLimiter(); setSelectedPreset('Custom');}}
                  className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                    limiterEnabled ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300'
                  }`}
                >
                  {limiterEnabled ? 'On' : 'Off'}
                </button>
              </div>
              <div className="space-y-2 text-xs">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-400">Threshold</span>
                    <span className="text-primary font-semibold">{limiterThreshold.toFixed(1)} dB</span>
                  </div>
                  <input
                    type="range"
                    min="-60"
                    max="0"
                    step="0.5"
                    value={limiterThreshold}
                    onChange={(e) => {setLimiterThreshold(parseFloat(e.target.value)); setSelectedPreset('Custom');}}
                    disabled={!limiterEnabled}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider-thumb"
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-400">Release</span>
                    <span className="text-primary font-semibold">{(limiterRelease * 1000).toFixed(0)}ms</span>
                  </div>
                  <input
                    type="range"
                    min="0.01"
                    max="1"
                    step="0.01"
                    value={limiterRelease}
                    onChange={(e) => {setLimiterRelease(parseFloat(e.target.value)); setSelectedPreset('Custom');}}
                    disabled={!limiterEnabled}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider-thumb"
                  />
                </div>
              </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end items-center pt-4 mt-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-primary hover:bg-blue-600 text-white rounded text-sm font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default EqualizerModal;
