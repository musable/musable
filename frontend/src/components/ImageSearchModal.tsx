import React, { useState, useEffect } from 'react';
import { XMarkIcon, MagnifyingGlassIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { imageSearchService, SearchImage } from '../services/imageSearch';
import { useToast } from '../contexts/ToastContext';

interface ImageSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImageSelect: (imageBlob: Blob, imageUrl: string) => void;
  initialQuery?: string;
}

const ImageSearchModal: React.FC<ImageSearchModalProps> = ({
  isOpen,
  onClose,
  onImageSelect,
  initialQuery = ''
}) => {
  const { showSuccess, showError } = useToast();
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [searchResults, setSearchResults] = useState<SearchImage[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<SearchImage | null>(null);

  // Update search query when initialQuery changes
  useEffect(() => {
    if (initialQuery) {
      setSearchQuery(initialQuery);
    }
  }, [initialQuery]);

  // Auto-search when modal opens with initial query
  useEffect(() => {
    if (isOpen && initialQuery) {
      const searchWithQuery = async () => {
        if (!initialQuery.trim()) return;

        setIsSearching(true);
        setSearchResults([]);
        setSelectedImage(null);

        try {
          const results = await imageSearchService.searchImages(initialQuery.trim(), 20);
          setSearchResults(results);
          
          if (results.length === 0) {
            showError('No images found. Try a different search term.');
          }
        } catch (error) {
          console.error('Image search failed:', error);
          showError('Failed to search for images. Please try again.');
        } finally {
          setIsSearching(false);
        }
      };
      
      searchWithQuery();
    }
  }, [isOpen, initialQuery, showError]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchResults([]);
      setSelectedImage(null);
      setIsDownloading(null);
    }
  }, [isOpen]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchResults([]);
    setSelectedImage(null);

    try {
      const results = await imageSearchService.searchImages(searchQuery.trim(), 20);
      setSearchResults(results);
      
      if (results.length === 0) {
        showError('No images found. Try a different search term.');
      }
    } catch (error) {
      console.error('Image search failed:', error);
      showError('Failed to search for images. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleImageClick = (image: SearchImage) => {
    setSelectedImage(image);
  };

  const handleDownloadAndSelect = async (image: SearchImage) => {
    setIsDownloading(image.id);

    try {
      const blob = await imageSearchService.downloadImage(image.url);
      onImageSelect(blob, image.url);
      showSuccess('Image selected successfully!');
      onClose();
    } catch (error) {
      console.error('Failed to download image:', error);
      showError('Failed to download image. Please try another one.');
    } finally {
      setIsDownloading(null);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-white">Search Album Artwork</h2>
            <div className="flex items-center gap-1 bg-red-600 bg-opacity-20 px-2 py-1 rounded text-red-400 text-sm">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
              Powered by YouTube
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            disabled={isSearching || !!isDownloading}
          >
            <XMarkIcon className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-6 border-b border-gray-700 flex-shrink-0">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                className="w-full px-4 py-3 pl-10 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                placeholder="Search for album artwork (e.g., 'Artist Album' or 'Genre Music')"
                disabled={isSearching}
              />
              <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            </div>
            <button
              onClick={handleSearch}
              disabled={isSearching || !searchQuery.trim()}
              className="px-6 py-3 bg-primary hover:bg-secondary text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSearching ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Searching...
                </>
              ) : (
                <>
                  <MagnifyingGlassIcon className="w-4 h-4" />
                  Search
                </>
              )}
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-6">
          {isSearching && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-gray-400">Searching for images...</p>
              </div>
            </div>
          )}

          {!isSearching && searchResults.length === 0 && searchQuery && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <MagnifyingGlassIcon className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400 mb-2">No images found</p>
                <p className="text-gray-500 text-sm">Try searching with different keywords</p>
              </div>
            </div>
          )}

          {!isSearching && searchResults.length === 0 && !searchQuery && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <MagnifyingGlassIcon className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400 mb-2">Search for album artwork</p>
                <p className="text-gray-500 text-sm">Enter artist and album name to find artwork</p>
              </div>
            </div>
          )}

          {searchResults.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {searchResults.map((image) => (
                <div
                  key={image.id}
                  className={`relative group cursor-pointer rounded-lg overflow-hidden bg-gray-700 aspect-square ${
                    selectedImage?.id === image.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => handleImageClick(image)}
                >
                  <img
                    src={image.thumbnail}
                    alt={image.title}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    loading="lazy"
                  />
                  
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadAndSelect(image);
                      }}
                      disabled={!!isDownloading}
                      className="opacity-0 group-hover:opacity-100 bg-primary hover:bg-secondary text-white p-2 rounded-full transition-all transform scale-90 group-hover:scale-100 disabled:opacity-50"
                    >
                      {isDownloading === image.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <ArrowDownTrayIcon className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  {/* Source badge */}
                  <div className="absolute top-2 left-2 bg-red-600 bg-opacity-90 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                    {image.source === 'YouTube' && (
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                      </svg>
                    )}
                    {image.source}
                  </div>

                  {/* Quality badge for high-res images */}
                  {image.width && image.width >= 1280 && (
                    <div className="absolute top-2 right-2 bg-green-600 bg-opacity-90 text-white text-xs px-2 py-1 rounded">
                      HD
                    </div>
                  )}

                  {/* Title and Channel */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent p-2">
                    <p className="text-white text-xs truncate font-medium" title={image.title}>
                      {image.title}
                    </p>
                    {image.channelTitle && (
                      <p className="text-gray-300 text-xs truncate mt-1" title={image.channelTitle}>
                        {image.channelTitle}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected Image Preview */}
        {selectedImage && (
          <div className="border-t border-gray-700 p-6 flex-shrink-0">
            <div className="flex items-center gap-4">
              <img
                src={selectedImage.thumbnail}
                alt={selectedImage.title}
                className="w-16 h-16 object-cover rounded-lg"
              />
              <div className="flex-1">
                <h3 className="text-white font-medium truncate">{selectedImage.title}</h3>
                <div className="text-gray-400 text-sm space-y-1">
                  <div className="flex items-center gap-2">
                    <span>Source: {selectedImage.source}</span>
                    {selectedImage.source === 'YouTube' && (
                      <svg className="w-3 h-3 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                      </svg>
                    )}
                    {selectedImage.width && selectedImage.height && (
                      <span>• {selectedImage.width}x{selectedImage.height}</span>
                    )}
                    {selectedImage.width && selectedImage.width >= 1280 && (
                      <span className="text-green-400 font-medium">• HD Quality</span>
                    )}
                  </div>
                  {selectedImage.channelTitle && (
                    <p className="truncate">Channel: {selectedImage.channelTitle}</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleDownloadAndSelect(selectedImage)}
                disabled={!!isDownloading}
                className="px-4 py-2 bg-primary hover:bg-secondary text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isDownloading === selectedImage.id ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Downloading...
                  </>
                ) : (
                  <>
                    <ArrowDownTrayIcon className="w-4 h-4" />
                    Use This Image
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageSearchModal;