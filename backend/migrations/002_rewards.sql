INSERT INTO shop_items
(name, description, type, price, metadata)
VALUES

(
  'Neon Aura',
  'A glowing cyber aura for your hero.',
  'ITEM',
  50,
  '{"rarity":"COMMON","icon":"✨"}'
),

(
  'Cyber Knight',
  'Unlock the Cyber Knight visual theme.',
  'THEME',
  100,
  '{"rarity":"RARE","icon":"⚔️"}'
),

(
  'XP Hunter',
  'Badge awarded to heroes who chase every opportunity.',
  'BADGE',
  150,
  '{"rarity":"RARE","icon":"🏹"}'
),

(
  'Legendary Crown',
  'A legendary crown for legendary progress.',
  'BADGE',
  250,
  '{"rarity":"LEGENDARY","icon":"👑"}'
),

(
  'Void Walker',
  'A mysterious dark theme from the outer realm.',
  'THEME',
  300,
  '{"rarity":"LEGENDARY","icon":"🌌"}'
);



UPDATE shop_items
SET metadata =
  COALESCE(metadata, '{}'::jsonb)
  || jsonb_build_object(
    'effect', 'AURA',
    'auraStyle', 'neon',
    'auraColor', 'cyan',
    'animation', 'pulse'
  )
WHERE name = 'Neon Aura';

UPDATE shop_items
SET metadata =
  COALESCE(metadata, '{}'::jsonb)
  || jsonb_build_object(
    'effect', 'THEME',
    'themeStyle', 'cyber-knight',
    'primaryColor', 'cyan',
    'secondaryColor', 'purple',
    'animation', 'glow'
  )
WHERE name = 'Cyber Knight';

UPDATE shop_items
SET metadata =
  COALESCE(metadata, '{}'::jsonb)
  || jsonb_build_object(
    'effect', 'BADGE',
    'badgeStyle', 'xp-hunter',
    'badgeColor', 'blue',
    'animation', 'pulse'
  )
WHERE name = 'XP Hunter';

UPDATE shop_items
SET metadata =
  COALESCE(metadata, '{}'::jsonb)
  || jsonb_build_object(
    'effect', 'BADGE',
    'badgeStyle', 'legendary-crown',
    'badgeColor', 'gold',
    'animation', 'shine'
  )
WHERE name = 'Legendary Crown';

UPDATE shop_items
SET metadata =
  COALESCE(metadata, '{}'::jsonb)
  || jsonb_build_object(
    'effect', 'THEME',
    'themeStyle', 'void-walker',
    'primaryColor', 'purple',
    'secondaryColor', 'black',
    'animation', 'glow'
  )
WHERE name = 'Void Walker';

