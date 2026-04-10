import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Activity, Shield, Video, AlertTriangle } from 'lucide-react';
import React, { Component } from 'react';
import Dashboard from './pages/Dashboard';
import Distribution from './pages/Distribution';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Systems Critical Error</h1>
          <p className="text-red-400 font-mono text-sm max-w-2xl bg-red-500/10 p-4 rounded border border-red-500/20">
            {this.state.error?.toString()}
          </p>
          <button onClick={() => window.location.reload()} className="mt-6 px-6 py-2 bg-indigo-600 rounded-lg text-white font-bold">
            Restart Command Center
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function Navigation() {
  const location = useLocation();
  const isActive = (path) => location.pathname === path;

  return (
    <nav className="flex gap-6">
      <Link to="/" className={`flex items-center gap-2 text-sm font-medium transition-colors ${isActive('/') ? 'text-white' : 'text-gray-400 hover:text-gray-200'}`}>
        <Activity className="w-4 h-4" />
        Dashboard
      </Link>
      <Link to="/distribution" className={`flex items-center gap-2 text-sm font-medium transition-colors ${isActive('/distribution') ? 'text-white' : 'text-gray-400 hover:text-gray-200'}`}>
        <Video className="w-4 h-4" />
        Movie Distribution
      </Link>
    </nav>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <div className="min-h-screen bg-[--color-dark-bg] text-gray-100 flex flex-col font-sans">
          {/* Navbar */}
          <header className="sticky top-0 z-50 border-b border-gray-800 bg-[--color-dark-surface]/80 backdrop-blur-md">
            <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-8 h-8 text-indigo-500" />
                <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
                  TheatreShield AI
                </h1>
              </div>
              
              <Navigation />

              <div className="flex items-center gap-2 bg-indigo-500/10 px-3 py-1.5 rounded-full border border-indigo-500/20">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                </span>
                <span className="text-xs font-semibold tracking-wide text-indigo-300">
                  AI Monitoring Active
                </span>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 w-full mx-auto">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/distribution" element={<Distribution />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
