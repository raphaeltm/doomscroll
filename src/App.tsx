import { useState } from 'react';
import { GenerationStatus } from './components/GenerationStatus';
import { Sidebar } from './components/Sidebar';
import { WorldMap } from './components/WorldMap';
import { Timeline } from './components/Timeline';
import { TestVideoFlow } from './TestVideoFlow';

function App() {
  const [testMode, setTestMode] = useState(false);

  return (
    <div className="relative h-screen bg-gray-950 text-white overflow-hidden">
      <WorldMap />
      <GenerationStatus />
      <Sidebar />
      <Timeline />

      {/* Test Mode Toggle */}
      <button 
        onClick={() => setTestMode(!testMode)}
        className="absolute bottom-4 left-4 z-[2000] bg-gray-800/80 hover:bg-gray-700 text-[10px] px-3 py-1.5 rounded border border-gray-700 text-gray-400"
      >
        {testMode ? 'Close Test Video' : 'Test Video Flow'}
      </button>

      {testMode && <TestVideoFlow />}
    </div>
  );
}

export default App;
