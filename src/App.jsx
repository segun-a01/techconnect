import { Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import Chat from "./pages/Chat";
import RightPanel from "./components/RightPanel";
import MobileNav from "./components/MobileNav";
import Explore from "./pages/Explore";

function App() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] flex justify-center">
      <div className="flex w-full max-w-6xl">
        <Sidebar />

        <main className="flex-1 border-r border-[var(--color-border)] min-h-screen">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/explore" element={<Explore />} /> 
          </Routes>
        </main>

        <RightPanel />
      </div>

      <MobileNav />
    </div>
  );
}

export default App;
