import { Loader2, CheckCircle2, Clock, XCircle, AlertCircle } from 'lucide-react';

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const configs = {
    queued: {
      label: 'Queued',
      className: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
      icon: <Clock className="w-3 h-3" />,
    },
    running: {
      label: 'Running',
      className: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
      icon: <Loader2 className="w-3 h-3 animate-spin" />,
    },
    done: {
      label: 'Done',
      className: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
      icon: <CheckCircle2 className="w-3 h-3" />,
    },
    failed: {
      label: 'Failed',
      className: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
      icon: <XCircle className="w-3 h-3" />,
    },
    retrying: {
      label: 'Retrying',
      className: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
      icon: <AlertCircle className="w-3 h-3" />,
    },
  };

  const config = configs[status as keyof typeof configs] || configs.queued;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.className}`}
    >
      {config.icon}
      {config.label}
    </span>
  );
}
