// EDIT THIS FILE: all of your content lives here.
// Media files live in /public/media (see README).

const media = (kind, slug, file) => `/media/${kind}/${slug}/${file}`

export const profile = {
  name: 'Fawwad Zaheer Rizvi',
  nameLines: ['Fawwad', 'Zaheer', 'Rizvi'],
  tagline: 'Game developer. Unity and Unreal Engine.',
  email: 'syedfawwad100@gmail.com', 
}

// ---------- Games ----------
export const games = [
  {
    id: 'base-defenders',
    title: 'Base Defenders',
    engine: 'Unity',
    kind: '2D tower defense',
    summary:
      'Place turrets to stop waves of enemies on a tile-based desert map, while managing your money and your base health.',
    role: [
      'Gameplay programming',
      'Turret placement system',
      'Enemy wave logic',
      'Combat systems',
      'UI, menus, and game flow',
      'Scene setup and balancing',
    ],
    team: null,
    controls: 'Left click to place turrets and use the menus.',
    stack: ['Unity', 'C#', 'Unity UI', 'Basic, Sniper and Slowmo turrets'],
    video: media('games', 'base-defenders', 'video.mp4'),
    poster: media('games', 'base-defenders', 'video-poster.webp'),
    shots: [
      media('games', 'base-defenders', 'shot-1.webp'),
      media('games', 'base-defenders', 'shot-2.webp'),
    ],
    links: [],
  },
  {
    id: 'dungeon-escape',
    title: 'Dungeon Escape',
    engine: 'Unity',
    kind: '2D stealth platformer',
    summary:
      'Sneak through a dangerous dungeon, avoid enemies, and climb your way out. Careful timing matters more than fighting.',
    role: [
      'Gameplay programming',
      'Player movement',
      'Platforming mechanics',
      'Stealth gameplay',
      'UI and menus',
      'Scene setup and gameplay flow',
    ],
    team: 'Team project. Teammates handled asset integration, level design, environment setup, and testing.',
    controls: 'A / D to move, Space to jump, Shift to sprint, W to climb ladders.',
    stack: ['Unity', 'C#', 'Unity 2D'],
    video: media('games', 'dungeon-escape', 'video.mp4'),
    poster: media('games', 'dungeon-escape', 'video-poster.webp'),
    shots: [
      media('games', 'dungeon-escape', 'shot-1.webp'),
      media('games', 'dungeon-escape', 'shot-2.webp'),
    ],
    links: [],
  },
  {
    id: 'ship-brawl',
    title: 'Ship Brawl',
    engine: 'Unreal Engine 5',
    kind: '3D naval combat',
    summary:
      'Steer your ship across open water and sink enemy vessels with your left and right cannons.',
    role: [
      'Gameplay programming',
      'Ship movement and controls',
      'Enemy cannon firing',
      'Enemy combat behavior',
      'Custom ship and cannon models in Blender',
      'Asset integration and scene assembly',
    ],
    team: 'Team project. Teammates handled the player cannons, environment, UI, menus, and testing.',
    controls: 'WASD to steer, mouse for the camera, left / right click to fire the left / right cannons.',
    stack: ['Unreal Engine 5', 'Blueprints', 'Blender', 'Water plugin'],
    video: media('games', 'ship-brawl', 'video.mp4'),
    poster: media('games', 'ship-brawl', 'video-poster.webp'),
    shots: [
      media('games', 'ship-brawl', 'shot-1.webp'),
      media('games', 'ship-brawl', 'shot-2.webp'),
    ],
    links: [],
  },
]

// ---------- 3D models ----------
export const models = [
  {
    id: 'low-poly-axe',
    title: 'Low-poly axe',
    summary:
      'A stylized axe built from primitive shapes with extrusions and loop cuts. Made as a game prop with a readable silhouette. The wooden handle, metal head, and wrapped grip use plain material colors, with no textures.',
    stack: ['Blender', 'Hard-surface', 'Game-ready'],
    render: media('models', 'low-poly-axe', 'render.webp'),
    wire: media('models', 'low-poly-axe', 'wire.webp'),
    video: media('models', 'low-poly-axe', 'video.mp4'),
    poster: media('models', 'low-poly-axe', 'video-poster.webp'),
  },
  {
    id: 'low-poly-character',
    title: 'Low-poly character',
    summary:
      'A stylized character taken through the full pipeline: modeling, armature, weight painting, and basic animation tests. Based on a tutorial, with my own changes to the design and silhouette.',
    stack: ['Blender', 'Rigging', 'Weight painting'],
    render: media('models', 'low-poly-character', 'render.webp'),
    wire: media('models', 'low-poly-character', 'wire.webp'),
    video: media('models', 'low-poly-character', 'video.mp4'),
    poster: media('models', 'low-poly-character', 'video-poster.webp'),
  },
  {
    id: 'low-poly-pistol',
    title: 'Low-poly pistol',
    summary:
      'A handgun modeled from a single cube, using a reference image to study proportions. Built with extrusions and loop cuts for a clean, game-ready silhouette.',
    stack: ['Blender', 'Hard-surface', 'Reference-based'],
    render: media('models', 'low-poly-pistol', 'render.webp'),
    wire: media('models', 'low-poly-pistol', 'wire.webp'),
    video: media('models', 'low-poly-pistol', 'video.mp4'),
    poster: media('models', 'low-poly-pistol', 'video-poster.webp'),
  },
  {
    id: 'low-poly-ship',
    title: 'Low-poly ship',
    summary:
      'The ship used in Ship Brawl. Built with box modeling, booleans, and proportional editing, with modular cannon placement, then exported into Unreal Engine.',
    stack: ['Blender 5.0.1', 'Unreal Engine', 'Game-ready'],
    render: media('models', 'low-poly-ship', 'render.webp'),
    wire: media('models', 'low-poly-ship', 'wire.webp'),
    video: media('models', 'low-poly-ship', 'video.mp4'),
    poster: media('models', 'low-poly-ship', 'video-poster.webp'),
  },
]

export const about = [
  'I build gameplay systems in Unity with C# and in Unreal Engine with Blueprints: player movement, enemy behavior, combat, and the menus around them.',
  'I also model my own low-poly assets in Blender, from props to a rigged character, and bring them into the engine. The ship in Ship Brawl is one of mine.',
  'The games here use free online assets, except the ship and cannon models in Ship Brawl, which I made.',
]

export const skills = [
  { label: 'Engines', value: 'Unity, Unreal Engine 5' },
  { label: 'Scripting', value: 'C#, Blueprints' },
  { label: 'Gameplay', value: 'Player movement, platforming, stealth, enemy behavior, combat, UI and menus' },
  { label: '3D', value: 'Blender, low-poly modeling, rigging, weight painting' },
]

export const socials = [
  { label: 'GitHub', href: 'https://github.com/FawwadZaheer/' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/fawwad-zaheer-369a2b29a/' },
]
