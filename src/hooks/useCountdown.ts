import { useState, useEffect, useRef } from 'react';

export function useCountdown(due_date: string | null | undefined, isCompleted: boolean) {
  const [timeLeft, setTimeLeft] = useState('');
  const [isOverdue, setIsOverdue] = useState(false);
  const [isNearDue, setIsNearDue] = useState(false);
  const hasTriggeredRef = useRef(false);

  useEffect(() => {
    if (!due_date) {
      setTimeLeft('');
      setIsOverdue(false);
      setIsNearDue(false);
      return;
    }

    if (isCompleted) {
      setTimeLeft('Completed');
      setIsOverdue(false);
      setIsNearDue(false);
      return;
    }

    const calculateTime = () => {
      const now = new Date().getTime();
      const due = new Date(due_date).getTime();
      const diff = due - now;

      if (diff <= 0) {
        setTimeLeft('Overdue');
        setIsOverdue(true);
        setIsNearDue(false);

        if (!hasTriggeredRef.current) {
          hasTriggeredRef.current = true;
          // Trigger shake effect
          document.body.classList.add('shake-alert');
          setTimeout(() => {
            document.body.classList.remove('shake-alert');
          }, 3000);
        }
      } else {
        setIsOverdue(false);
        hasTriggeredRef.current = false;
        
        // Check if near due (< 24h)
        if (diff <= 24 * 60 * 60 * 1000) {
          setIsNearDue(true);
        } else {
          setIsNearDue(false);
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        
        let formatted = '';
        if (days > 0) formatted += `${days}d `;
        if (hours > 0 || days > 0) formatted += `${hours}h `;
        formatted += `${minutes}m left`;
        
        setTimeLeft(formatted.trim());
      }
    };

    calculateTime();
    const interval = setInterval(calculateTime, 60000);

    return () => clearInterval(interval);
  }, [due_date, isCompleted]);

  return { timeLeft, isOverdue, isNearDue };
}
