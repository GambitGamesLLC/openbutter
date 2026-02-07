// Add test orchestrators to localStorage
const testOrchestrators = [
  {
    id: 'agent:main:main',
    name: 'Chip',
    status: 'online',
    state: 'ready',
    avatar: '🐱‍💻',
    tokenBurn: 232978
  },
  {
    id: 'agent:main:subagent:test1',
    name: 'Code Assistant',
    status: 'busy',
    state: 'thinking',
    avatar: '💻',
    tokenBurn: 45123
  },
  {
    id: 'agent:main:subagent:test2',
    name: 'Web Engineer',
    status: 'online',
    state: 'idle',
    avatar: '🌐',
    tokenBurn: 28901
  }
];

const stored = localStorage.getItem('butter-store') || '{}';
const parsed = JSON.parse(stored);
parsed.orchestrators = testOrchestrators;
localStorage.setItem('butter-store', JSON.stringify(parsed));
console.log('Test orchestrators added!');
