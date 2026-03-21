import { Sidebar } from './components/Sidebar';
import { WorldMap } from './components/WorldMap';
import { Timeline } from './components/Timeline';

function App() {
  return (
    <div className="relative h-screen bg-gray-950 text-white overflow-hidden">
      <WorldMap />
      <Sidebar />
      <Timeline />
    </div>
  );
}

export default App;
