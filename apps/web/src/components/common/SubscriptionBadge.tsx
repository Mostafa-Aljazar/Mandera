'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';

interface SubscriptionBadgeProps {
  subscriptionStartDate?: string | Date;
  subscriptionEndDate?: string | Date;
}

export default function SubscriptionBadge({ subscriptionStartDate, subscriptionEndDate }: SubscriptionBadgeProps) {
  const { status, daysRemaining } = useSubscriptionStatus(subscriptionStartDate, subscriptionEndDate);

  const getBadgeVariant = () => {
    switch (status) {
      case 'active':
        return 'default';
      case 'expiring_soon':
        return 'secondary';
      case 'expired':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getBadgeText = () => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'expiring_soon':
        return `Expiring in ${daysRemaining} days`;
      case 'expired':
        return 'Expired';
      case 'pending':
        return 'Pending';
      default:
        return 'Unknown';
    }
  };

  return (
    <Badge variant={getBadgeVariant()}>
      {getBadgeText()}
    </Badge>
  );
};
