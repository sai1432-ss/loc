// src/App.tsx
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import VerifyLoc from './pages/VerifyLoc';
function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/verf" element={<VerifyLoc />} />
    </Routes>
  );
}

export default App;
