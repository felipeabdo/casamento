import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebaseConfig';
import { doc, onSnapshot, setDoc, deleteField } from 'firebase/firestore';
import { useStore } from '../store';
import { Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const WEDDING_REACTIONS = [
  { emoji: '❤️', label: 'Amei' },
  { emoji: '🥂', label: 'Um brinde!' },
  { emoji: '🎉', label: 'Festa!' },
  { emoji: '💍', label: 'Lindo Casal!' },
  { emoji: '😍', label: 'Encantado' },
  { emoji: '👏', label: 'Parabéns!' },
];

export const getReactionUserId = (currentGuestId?: string): string => {
  if (currentGuestId) return `guest_${currentGuestId}`;
  let uid = localStorage.getItem('wedding_reaction_user_id');
  if (!uid) {
    uid = 'user_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
    localStorage.setItem('wedding_reaction_user_id', uid);
  }
  return uid;
};

interface ReactionSystemProps {
  itemId: string; // Unique identifier for the media item
  compact?: boolean;
  theme?: 'dark' | 'light';
  showLabel?: boolean;
  className?: string;
}

export const ReactionSystem: React.FC<ReactionSystemProps> = ({
  itemId,
  compact = false,
  theme = 'light',
  showLabel = true,
  className = ''
}) => {
  const { currentGuest } = useStore();
  const userId = getReactionUserId(currentGuest?.id);

  const [userReactions, setUserReactions] = useState<Record<string, string>>({});
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Subscribe to Firestore doc for real-time synchronization
  useEffect(() => {
    if (!itemId) return;
    const docRef = doc(db, 'reactions', itemId);
    const unsub = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setUserReactions(data.userReactions || {});
      } else {
        setUserReactions({});
      }
    }, (err) => {
      console.warn(`[Reactions] Error loading reactions for ${itemId}:`, err);
    });

    return () => unsub();
  }, [itemId]);

  // Aggregate emoji counts
  const reactionCounts: Record<string, number> = {};
  let totalCount = 0;
  (Object.values(userReactions) as string[]).forEach((emoji) => {
    if (emoji) {
      reactionCounts[emoji] = (reactionCounts[emoji] || 0) + 1;
      totalCount++;
    }
  });

  const currentUserEmoji = userReactions[userId];

  // Top 3 emojis by reaction frequency
  const topEmojis = Object.entries(reactionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([emoji]) => emoji);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    };
    if (showPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPicker]);

  const handleSelectEmoji = async (selectedEmoji: string) => {
    setShowPicker(false);
    const docRef = doc(db, 'reactions', itemId);

    const isTogglingOff = currentUserEmoji === selectedEmoji;
    const nextReactions = { ...userReactions };

    if (isTogglingOff) {
      delete nextReactions[userId];
    } else {
      nextReactions[userId] = selectedEmoji;
    }
    setUserReactions(nextReactions);

    try {
      if (isTogglingOff) {
        await setDoc(docRef, {
          userReactions: {
            [userId]: deleteField()
          }
        }, { merge: true });
      } else {
        await setDoc(docRef, {
          userReactions: {
            [userId]: selectedEmoji
          }
        }, { merge: true });
      }
    } catch (err) {
      console.error('Error updating reaction:', err);
    }
  };

  const handleMainButtonClick = () => {
    if (currentUserEmoji) {
      handleSelectEmoji(currentUserEmoji);
    } else {
      handleSelectEmoji('❤️');
    }
  };

  const isDark = theme === 'dark';

  if (compact) {
    return (
      <div className={`relative inline-flex items-center select-none ${className}`} ref={pickerRef}>
        {/* Compact Picker Popover */}
        <AnimatePresence>
          {showPicker && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 5 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-full mb-1.5 left-0 z-50 flex items-center gap-1 p-1 sm:p-1.5 rounded-2xl sm:rounded-full shadow-2xl bg-black/95 border border-wedding-700 backdrop-blur-md max-w-[calc(100vw-2rem)] flex-wrap justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              {WEDDING_REACTIONS.map((r) => (
                <button
                  key={r.emoji}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectEmoji(r.emoji);
                  }}
                  className="p-1 sm:p-1.5 rounded-full text-base sm:text-lg hover:scale-125 transition-transform"
                  title={r.label}
                >
                  {r.emoji}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Compact Badge */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowPicker(!showPicker);
          }}
          className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-sans border backdrop-blur-md transition-all shadow-md ${
            currentUserEmoji
              ? 'bg-wedding-800 text-wedding-100 border-wedding-500 font-bold'
              : 'bg-black/60 hover:bg-black/80 text-white border-white/20'
          }`}
          title="Reagir"
        >
          {currentUserEmoji ? (
            <span className="text-sm leading-none">{currentUserEmoji}</span>
          ) : (
            <Heart size={13} className="text-wedding-300 fill-wedding-300/30" />
          )}

          {totalCount > 0 && (
            <span className="font-mono text-[11px] font-semibold">{totalCount}</span>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className={`relative inline-flex items-center select-none ${className}`} ref={pickerRef}>
      {/* Expanded Reaction Picker Popover */}
      <AnimatePresence>
        {showPicker && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 10 }}
            transition={{ type: 'spring', damping: 20, stiffness: 350 }}
            className={`absolute bottom-full mb-2 left-0 sm:left-0 z-50 flex items-center gap-1 sm:gap-1.5 p-1.5 sm:p-2 rounded-2xl sm:rounded-full shadow-2xl border backdrop-blur-md max-w-[calc(100vw-2rem)] flex-wrap justify-center ${
              isDark 
                ? 'bg-wedding-950/95 border-wedding-700 text-white' 
                : 'bg-white/95 border-wedding-200 text-wedding-900'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {WEDDING_REACTIONS.map((r) => (
              <motion.button
                key={r.emoji}
                whileHover={{ scale: 1.35, y: -4 }}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelectEmoji(r.emoji);
                }}
                className={`p-1.5 rounded-full text-2xl transition-all relative group flex items-center justify-center ${
                  currentUserEmoji === r.emoji 
                    ? 'bg-wedding-500/20 ring-2 ring-wedding-400' 
                    : 'hover:bg-wedding-500/10'
                }`}
                title={r.label}
              >
                <span>{r.emoji}</span>
                <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/85 text-white text-[10px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none font-sans shadow-md">
                  {r.label}
                </span>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Trigger & Count Display */}
      <div className="flex items-center gap-2">
        {/* Main React Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleMainButtonClick();
          }}
          onMouseEnter={() => setShowPicker(true)}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-serif transition-all duration-200 border shadow-sm ${
            currentUserEmoji
              ? isDark
                ? 'bg-wedding-800 text-wedding-100 border-wedding-500 font-bold'
                : 'bg-wedding-100 text-wedding-900 border-wedding-300 font-bold'
              : isDark
                ? 'bg-wedding-900/80 hover:bg-wedding-800/80 text-wedding-200 border-wedding-700'
                : 'bg-white/90 hover:bg-wedding-50 text-wedding-800 border-wedding-200'
          }`}
        >
          {currentUserEmoji ? (
            <span className="text-base leading-none">{currentUserEmoji}</span>
          ) : (
            <Heart size={15} className={`${isDark ? 'text-wedding-300' : 'text-wedding-500'}`} />
          )}

          {showLabel && (
            <span className="font-sans font-medium">
              {currentUserEmoji ? 'Reagiu' : 'Reagir'}
            </span>
          )}
        </button>

        {/* Reaction Breakdown Counter */}
        {totalCount > 0 && (
          <div 
            onClick={(e) => {
              e.stopPropagation();
              setShowPicker(!showPicker);
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-sans cursor-pointer transition-all border shadow-sm ${
              isDark
                ? 'bg-wedding-900/90 text-wedding-200 border-wedding-800 hover:border-wedding-600'
                : 'bg-wedding-50 text-wedding-800 border-wedding-200 hover:border-wedding-300'
            }`}
          >
            <div className="flex items-center -space-x-1">
              {topEmojis.map((emoji, i) => (
                <span key={i} className="text-sm drop-shadow-sm">{emoji}</span>
              ))}
            </div>
            <span className="font-semibold text-xs font-mono">{totalCount}</span>
          </div>
        )}
      </div>
    </div>
  );
};
