import { useState, useEffect } from 'react';

export const useSubscriptionStatus = (subscriptionStartDate, subscriptionEndDate) => {
  const [status, setStatus] = useState('active');
  const [daysRemaining, setDaysRemaining] = useState(null);

  useEffect(() => {
    if (!subscriptionStartDate || !subscriptionEndDate) {
      setStatus('unknown');
      return;
    }

    const now = new Date();
    const startDate = new Date(subscriptionStartDate);
    const endDate = new Date(subscriptionEndDate);

    if (now < startDate) {
      setStatus('pending');
      return;
    }

    if (now > endDate) {
      setStatus('expired');
      setDaysRemaining(0);
      return;
    }

    const timeDiff = endDate.getTime() - now.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    setDaysRemaining(daysDiff);

    if (daysDiff <= 7) {
      setStatus('expiring_soon');
    } else {
      setStatus('active');
    }
  }, [subscriptionStartDate, subscriptionEndDate]);

  return { status, daysRemaining };
};