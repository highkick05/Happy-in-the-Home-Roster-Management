import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import HomeCareBudgetView from './HomeCareBudgetView';
import NdisBudgetView from './NdisBudgetView';
import { Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

export default function ClientBudgetSwitchboard() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const [fundingType, setFundingType] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'NDIS' | 'HOME_CARE'>('HOME_CARE');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id && token) {
      setLoading(true);
      fetch(`/api/clients/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          const rawType = data.funding_type || 'HOME_CARE';
          setFundingType(rawType);
          const isClientNdis = String(rawType).trim().toUpperCase() === 'NDIS';
          setActiveTab(isClientNdis ? 'NDIS' : 'HOME_CARE');
          setLoading(false);
        })
        .catch(err => {
          console.error("Failed to load client funding type", err);
          setFundingType('HOME_CARE');
          setActiveTab('HOME_CARE');
          setLoading(false);
        });
    }
  }, [id, token]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-brand-navy">
        <Loader2 className="w-8 h-8 animate-spin text-brand-blue" />
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }} 
      className="w-full h-full flex flex-col bg-brand-navy text-[#E6EDF3] p-6 lg:p-8 overflow-hidden relative"
    >
      {/* Framework Mode Toggle (NDIS Service Agreement vs Home Care Package) */}
      <div className="flex items-center justify-end mb-3 shrink-0">
        <div className="inline-flex items-center p-1 bg-black/40 border border-white/10 rounded-lg text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('NDIS')}
            className={`px-3 py-1 rounded-md transition-colors ${
              activeTab === 'NDIS'
                ? 'bg-brand-blue text-white shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            NDIS Service Agreement
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('HOME_CARE')}
            className={`px-3 py-1 rounded-md transition-colors ${
              activeTab === 'HOME_CARE'
                ? 'bg-brand-blue text-white shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            Home Care Package / SAH
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {activeTab === 'NDIS' ? (
          <NdisBudgetView />
        ) : (
          <HomeCareBudgetView />
        )}
      </div>
    </motion.div>
  );
}
