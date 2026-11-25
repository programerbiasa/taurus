import React from 'react';
import { Chip, ChipProps } from '@mui/material';

interface StatusBadgeProps {
  status: string;
  size?: 'small' | 'medium';
  variant?: 'filled' | 'outlined';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'small',
  variant = 'filled',
}) => {
  let color: ChipProps['color'] = 'default';
  let label = status;

  switch (status) {
    // Ticket Status
    case 'Open':
      color = 'info';
      label = 'Open';
      break;
    case 'InProgress':
      color = 'warning';
      label = 'In Progress';
      break;
    case 'Resolved':
      color = 'success';
      label = 'Resolved';
      break;
    case 'Closed':
      color = 'default';
      label = 'Closed';
      break;

    // Job Status
    case 'Pending':
      color = 'warning';
      label = 'Pending';
      break;
    case 'Completed':
      color = 'success';
      label = 'Completed';
      break;

    // Priority
    case 'Low':
      color = 'default';
      label = 'Low';
      break;
    case 'Medium':
      color = 'info';
      label = 'Medium';
      break;
    case 'High':
      color = 'warning';
      label = 'High';
      break;
    case 'Critical':
      color = 'error';
      label = 'Critical';
      break;

    default:
      color = 'default';
      label = status;
  }

  return (
    <Chip
      label={label}
      color={color}
      size={size}
      variant={variant}
      sx={{
        fontWeight: 600,
        fontSize: size === 'small' ? '0.75rem' : '0.85rem',
        borderRadius: '6px',
      }}
    />
  );
};

export default StatusBadge;
