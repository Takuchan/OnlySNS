'use client';

import React, { useEffect, useState } from 'react';
import { CharacterState, CharacterAssets, getCharacterState, getCharacterAssets } from '@/lib/api';
import Image from 'next/image';

interface CharacterDisplayProps {
  userId?: string;
  postId?: string;
  sizeClass?: 'small' | 'medium' | 'large';
}

/**
 * Character Growth Stages:
 * 1. Baby (赤ちゃん, 0-4 posts)
 * 2. Kindergarten (幼稚園, 5-14 posts)
 * 3. Elementary School (小学生, 15-29 posts)
 * 4. Middle School (中学生, 30-49 posts)
 * 5. Adult (大人, 50+ posts)
 */

const STAGE_NAMES: Record<number, string> = {
  1: '赤ちゃん',
  2: '幼稚園',
  3: '小学生',
  4: '中学生',
  5: '大人',
};

const STAGE_COLORS: Record<number, string> = {
  1: 'from-pink-100 to-red-100',
  2: 'from-yellow-100 to-orange-100',
  3: 'from-green-100 to-teal-100',
  4: 'from-blue-100 to-purple-100',
  5: 'from-purple-100 to-indigo-100',
};

const FACE_EMOJIS: Record<number, string> = {
  1: '😐', // Serious
  2: '😊', // Joyful
  3: '😤', // Struggling
  4: '😎', // Proud
  5: '🤔', // Curious
  6: '🧐', // Thoughtful
  7: '🤩', // Excited
  // Fallback for others
  8: '👶',  // Baby expression
  9: '😌',  // Calm
  10: '🥰', // Loved
  11: '😃', // Happy
  12: '💪', // Strong
  13: '🎯', // Focused
  14: '✨', // Inspired
  15: '🌟', // Shining
  16: '😄', // Cheerful
  17: '🧠', // Thoughtful (alt)
  18: '💡', // Inspired (alt)
  19: '🎨', // Creative
  20: '🚀', // Ambitious
};

const ACCESSORY_NAMES: Record<number, string> = {
  0: 'なし',
  10: '眼鏡',           // Glasses (Programming)
  11: '言語書',         // Language book (Language Learning)
  12: 'スポーツバンド', // Sweatband (Fitness)
  13: '思考帽',         // Thinking cap (Philosophy)
  14: 'パレット',       // Artist palette (Art)
  15: '眼鏡（科学）',   // Science glasses (Science)
  16: 'ペン',           // Designer pen (Design)
  17: '計算機',         // Calculator (Mathematics)
};

const ACCESSORY_ICONS: Record<number, string> = {
  0: '',
  10: '👓',  // Glasses
  11: '📚',  // Book
  12: '🏋️', // Fitness
  13: '🎓',  // Scholar cap
  14: '🎨',  // Palette
  15: '⚗️',  // Science
  16: '✏️',  // Pen
  17: '🔢',  // Math
};

export const Character: React.FC<CharacterDisplayProps> = ({
  userId,
  postId,
  sizeClass = 'medium',
}) => {
  const [characterState, setCharacterState] = useState<CharacterState | null>(null);
  const [assets, setAssets] = useState<CharacterAssets | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCharacter = async () => {
      try {
        setLoading(true);
        const stateData = await getCharacterState(userId);
        setCharacterState(stateData.character_state);

        // If postId is provided and character is in adult stage, load assets
        if (postId && stateData.character_state.current_stage === 5) {
          const assetsData = await getCharacterAssets(postId);
          setAssets(assetsData.assets);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load character');
      } finally {
        setLoading(false);
      }
    };

    loadCharacter();
  }, [userId, postId]);

  if (loading) {
    return <CharacterSkeleton sizeClass={sizeClass} />;
  }

  if (error || !characterState) {
    return <div className="text-red-500 text-sm">{error || 'Character not available'}</div>;
  }

  return (
    <CharacterRenderer
      stage={characterState.current_stage}
      assets={assets}
      sizeClass={sizeClass}
      baseType={characterState.base_type}
    />
  );
};

interface CharacterRendererProps {
  stage: number;
  assets: CharacterAssets | null;
  sizeClass: 'small' | 'medium' | 'large';
  baseType: string;
}

const CharacterRenderer: React.FC<CharacterRendererProps> = ({
  stage,
  assets,
  sizeClass,
  baseType,
}) => {
  const sizeClasses = {
    small: 'w-24 h-24 text-3xl',
    medium: 'w-32 h-32 text-5xl',
    large: 'w-48 h-48 text-7xl',
  };

  const containerClasses = {
    small: 'p-2',
    medium: 'p-4',
    large: 'p-6',
  };

  // For adult stage with post-specific assets
  if (stage === 5 && assets) {
    return (
      <AdultCharacterRenderer
        assets={assets}
        sizeClass={sizeClass}
        baseType={baseType}
      />
    );
  }

  // Growth stages (Baby through Middle)
  return (
    <div className={`flex flex-col items-center gap-2`}>
      <div
        className={`
          ${sizeClasses[sizeClass]}
          ${containerClasses[sizeClass]}
          bg-gradient-to-br ${STAGE_COLORS[stage]}
          rounded-3xl
          flex items-center justify-center
          border-4 border-white shadow-lg font-bold
          transition-all duration-300 hover:shadow-xl hover:scale-105
        `}
      >
        {getStageEmoji(stage)}
      </div>
      <div className="text-center">
        <p className="font-bold text-lg">{STAGE_NAMES[stage]}</p>
        <p className="text-xs text-gray-600">学習の積み上げで成長中</p>
      </div>
    </div>
  );
};

interface AdultCharacterRendererProps {
  assets: CharacterAssets;
  sizeClass: 'small' | 'medium' | 'large';
  baseType: string;
}

const AdultCharacterRenderer: React.FC<AdultCharacterRendererProps> = ({
  assets,
  sizeClass,
  baseType,
}) => {
  const sizeClasses = {
    small: 'w-24 h-24 text-3xl',
    medium: 'w-32 h-32 text-5xl',
    large: 'w-48 h-48 text-7xl',
  };

  const containerClasses = {
    small: 'p-2',
    medium: 'p-4',
    large: 'p-6',
  };

  const faceEmoji = FACE_EMOJIS[assets.face_id] || '😊';
  const accessoryIcon = ACCESSORY_ICONS[assets.accessory_id] || '';

  return (
    <div className="flex flex-col items-center gap-3">
      <div className={`relative ${sizeClasses[sizeClass]}`}>
        {/* Main face */}
        <div
          className={`
            ${sizeClasses[sizeClass]}
            ${containerClasses[sizeClass]}
            bg-gradient-to-br from-indigo-100 to-purple-100
            rounded-3xl
            flex items-center justify-center
            border-4 border-white shadow-lg font-bold
            transition-all duration-300 hover:shadow-xl hover:scale-105
          `}
        >
          {faceEmoji}
        </div>

        {/* Accessory overlay */}
        {assets.accessory_id !== 0 && (
          <div
            className={`
              absolute top-1 right-1 text-2xl
              transition-all duration-300
            `}
            title={ACCESSORY_NAMES[assets.accessory_id] || 'Accessory'}
          >
            {accessoryIcon}
          </div>
        )}
      </div>

      <div className="text-center">
        <p className="font-bold text-lg">大人 (Adult)</p>
        <p className="text-xs text-gray-600">{assets.category}</p>
        <p className="text-xs text-gray-500">
          {assets.keywords.slice(0, 2).join(', ')}
        </p>
        {assets.accessory_id > 0 && (
          <p className="text-xs text-purple-600 font-semibold">
            {ACCESSORY_NAMES[assets.accessory_id] || ''}
          </p>
        )}
      </div>
    </div>
  );
};

const getStageEmoji = (stage: number): string => {
  const emojis = {
    1: '👶', // Baby
    2: '🧒', // Kindergarten
    3: '🧑‍🎓', // Elementary
    4: '👨‍🎓', // Middle
    5: '🧑‍💼', // Adult
  };
  return emojis[stage as keyof typeof emojis] || '😊';
};

const CharacterSkeleton: React.FC<{ sizeClass: string }> = ({ sizeClass }) => {
  const sizeClasses = {
    small: 'w-24 h-24',
    medium: 'w-32 h-32',
    large: 'w-48 h-48',
  };

  return (
    <div className="flex flex-col items-center gap-2 animate-pulse">
      <div
        className={`
          ${sizeClasses[sizeClass as keyof typeof sizeClasses]}
          bg-gray-300 rounded-3xl
        `}
      />
      <div className="w-32 h-4 bg-gray-300 rounded" />
    </div>
  );
};

export default Character;
