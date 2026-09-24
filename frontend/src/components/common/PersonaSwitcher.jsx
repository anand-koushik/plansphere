import React, { useState, useRef, useEffect } from 'react';
import { useAuth, DEMO_PERSONAS } from '../../context/AuthContext';
import { UserCheck, ChevronDown, Shield, Check } from 'lucide-react';

const PersonaSwitcher = () => {
  const { user, switchPersona } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = async (persona) => {
    if (persona.email === user?.email) {
      setIsOpen(false);
      return;
    }
    setSwitching(true);
    try {
      await switchPersona(persona.email);
      setIsOpen(false);
    } catch (err) {
      alert('Failed to switch persona: ' + err.message);
    } finally {
      setSwitching(false);
    }
  };

  const currentPersona = DEMO_PERSONAS.find((p) => p.email === user?.email);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-indigo-200/80 bg-indigo-50/70 hover:bg-indigo-100/70 transition-all text-xs font-semibold text-indigo-950 shadow-sm"
        title="Switch demo persona to test RBAC roles"
      >
        <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-slate-500 hidden sm:inline">Role Persona:</span>
        <span className="text-indigo-700 font-bold max-w-[130px] truncate">
          {currentPersona ? `${currentPersona.role}` : (user?.name || 'Select')}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-indigo-500" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-white p-2 shadow-2xl border border-slate-200 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-2 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                1-Click Persona Switcher
              </span>
              <span className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-medium">
                RBAC Simulator
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Switch roles instantly to verify permission gates.
            </p>
          </div>

          <div className="mt-1 space-y-1">
            {DEMO_PERSONAS.map((persona) => {
              const isActive = user?.email === persona.email;
              return (
                <button
                  key={persona.email}
                  disabled={switching}
                  onClick={() => handleSelect(persona)}
                  className={`w-full text-left p-2.5 rounded-xl transition-all flex items-start gap-3 ${
                    isActive
                      ? 'bg-indigo-50/90 border border-indigo-200'
                      : 'hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  <img
                    src={persona.avatar}
                    alt={persona.name}
                    className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0 mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 truncate">
                        {persona.name}
                      </span>
                      {isActive && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                    </div>
                    <span className="inline-block px-1.5 py-0.2 rounded text-[10px] font-semibold bg-indigo-100 text-indigo-700">
                      {persona.role}
                    </span>
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                      {persona.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default PersonaSwitcher;
