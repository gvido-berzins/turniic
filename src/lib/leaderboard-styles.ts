export const leaderboardStyles = {
  page: {
    background: 'bg-gray-900',
    padding: 'p-4 md:p-8',
  },
  
  loading: {
    background: 'bg-gray-900',
    textColor: 'text-white',
  },
  
  title: {
    container: {
      background: 'bg-gray-200',
      padding: 'px-6 py-3',
      borderRadius: 'rounded-sm',
      shadow: 'shadow-lg',
      rotation: '-rotate-1',
    },
    text: {
      size: 'text-2xl md:text-4xl',
      font: 'font-mono',
      weight: 'font-bold',
      color: 'text-gray-900',
      tracking: 'tracking-wider',
      transform: 'uppercase',
    },
  },
  
  emptyState: {
    textColor: 'text-gray-400',
    textSize: 'text-lg',
  },
  
  tableContainer: {
    background: 'bg-gray-200/90',
    backdropBlur: 'backdrop-blur-sm',
    borderRadius: 'rounded-lg',
  },
  
  tableHeader: {
    background: 'bg-gray-200',
    border: 'border-b border-gray-300',
    cell: {
      padding: 'px-4 py-4',
      textColor: 'text-red-600',
      fontWeight: 'font-bold',
      transform: 'uppercase',
      tracking: 'tracking-wider',
      minWidth: {
        rank: 'w-24',
        name: 'min-w-[200px]',
        round: 'min-w-[100px]',
        total: 'min-w-[100px]',
      },
    },
    roundBorder: 'border-gray-400',
  },
  
  tableBody: {
    divider: 'divide-y divide-gray-300/50',
    row: {
      even: 'bg-gray-100',
      odd: 'bg-gray-200',
      hover: 'hover:bg-white',
      transition: 'transition-colors',
    },
    cell: {
      padding: 'px-4 py-6',
    },
  },
  
  rank: {
    textSize: 'text-4xl',
    fontWeight: 'font-bold',
    textColor: 'text-red-600',
    font: 'font-mono',
  },
  
  participantName: {
    textColor: 'text-gray-800',
    fontWeight: 'font-medium',
    textSize: 'text-lg',
    transform: 'uppercase',
    tracking: 'tracking-wide',
    hover: 'hover:text-red-600',
    transition: 'transition-colors',
  },
  
  score: {
    regular: {
      textSize: 'text-2xl',
      fontWeight: 'font-medium',
      font: 'font-mono',
      textColor: 'text-gray-800',
    },
    latest: {
      textSize: 'text-2xl',
      fontWeight: 'font-bold',
      font: 'font-mono',
      textColor: 'text-red-700',
      background: 'bg-red-100/30',
    },
    updated: {
      textSize: 'text-2xl',
      fontWeight: 'font-bold',
      font: 'font-mono',
      textColor: 'text-green-800',
      background: 'bg-green-200/70',
    },
    transition: 'transition-colors duration-1000',
  },
  
  totalPoints: {
    textSize: 'text-3xl',
    fontWeight: 'font-bold',
    font: 'font-mono',
    textColor: 'text-gray-900',
    updatedColor: 'text-green-800',
    updatedBackground: 'bg-green-200/70',
    transition: 'transition-colors duration-1000',
  },
  
  footer: {
    container: {
      margin: 'mt-2',
      gap: 'gap-4',
    },
    timestamp: {
      textSize: 'text-xs',
      textColor: 'text-gray-400',
      font: 'font-mono',
    },
    updateIndicator: {
      textSize: 'text-xs',
      textColor: 'text-green-400',
      font: 'font-mono',
      animation: 'animate-pulse',
    },
  },
  
  bottomImage: {
    margin: 'mt-4',
    height: 'h-16 md:h-20',
    opacity: 'opacity-80',
  },
  
  roundBorder: {
    left: 'border-l border-gray-400',
    right: 'border-r border-gray-400',
  },
}
