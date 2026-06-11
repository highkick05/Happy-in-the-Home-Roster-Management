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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id && token) {
      setLoading(true);
      fetch(`/api/clients/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          setFundingType(data.funding_type || 'HOME_CARE');
          setLoading(false);
        })
        .catch(err => {
          console.error("Failed to load client funding type", err);
          setFundingType('HOME_CARE');
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
      className="w-full h-full flex flex-col bg-brand-navy text-[#E6EDF3] p-6 lg:p-8 overflow-hidden"
    >
      {fundingType === 'NDIS' ? (
        <NdisBudgetView />
      ) : (
        <HomeCareBudgetView />
      )}
    </motion.div>
  );
}
