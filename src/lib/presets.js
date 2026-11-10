export const MEMBER_COLORS = [
  { hex: '#FF453A', name: 'Red' },
  { hex: '#FF9F0A', name: 'Orange' },
  { hex: '#FFD60A', name: 'Yellow' },
  { hex: '#30D158', name: 'Green' },
  { hex: '#00C7BE', name: 'Mint' },
  { hex: '#40C8E0', name: 'Teal' },
  { hex: '#0A84FF', name: 'Blue' },
  { hex: '#5E5CE6', name: 'Indigo' },
  { hex: '#BF5AF2', name: 'Purple' },
  { hex: '#FF375F', name: 'Pink' },
  { hex: '#AC8E68', name: 'Brown' },
  { hex: '#8E8E93', name: 'Graphite' },
]

export const PRESET_SECTIONS = [
  {
    name: 'Kitchen',
    tasks: [
      { name: 'Wash dishes', icon: 'dishes', points: 10 },
      { name: 'Load / unload dishwasher', icon: 'dishwasher', points: 6 },
      { name: 'Wipe counters', icon: 'counter', points: 5 },
      { name: 'Clean the sink', icon: 'sink', points: 6 },
      { name: 'Clean microwave', icon: 'microwave', points: 8 },
      { name: 'Clean stove', icon: 'stove', points: 12 },
      { name: 'Clean out fridge', icon: 'fridge', points: 15 },
      { name: 'Take out trash', icon: 'trash', points: 5 },
      { name: 'Take out recycling', icon: 'recycle', points: 5 },
    ],
  },
  {
    name: 'Living room',
    tasks: [
      { name: 'Vacuum', icon: 'vacuum', points: 12 },
      { name: 'Dust surfaces', icon: 'duster', points: 8 },
      { name: 'Tidy up', icon: 'sofa', points: 5 },
      { name: 'Water plants', icon: 'plant', points: 3 },
    ],
  },
  {
    name: 'Bathroom',
    tasks: [
      { name: 'Clean toilet', icon: 'toilet', points: 12 },
      { name: 'Scrub tub / shower', icon: 'tub', points: 15 },
      { name: 'Clean mirror & sink', icon: 'mirror', points: 8 },
      { name: 'Restock toilet paper', icon: 'paper', points: 3 },
    ],
  },
  {
    name: 'Whole home',
    tasks: [
      { name: 'Sweep floors', icon: 'broom', points: 10 },
      { name: 'Mop floors', icon: 'mop', points: 15 },
      { name: 'Clean windows', icon: 'window', points: 12 },
      { name: 'Buy groceries', icon: 'groceries', points: 10 },
    ],
  },
]
