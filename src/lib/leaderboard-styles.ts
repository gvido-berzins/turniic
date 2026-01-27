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
      size: 'text-4xl md:text-4xl',
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
    sticky: 'sticky top-0 z-10',
    cell: {
      padding: 'px-4 py-4',
      textColor: 'text-red-600',
      textSize: 'text-4xl',
      fontWeight: 'font-bold',
      transform: 'uppercase',
      tracking: 'tracking-wider',
      minWidth: {
        rank: 'w-24',
        name: 'w-auto',
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
      top3: 'bg-transparent',
      bottom3: 'bg-transparent',
    },
    cell: {
      padding: 'px-2 py-0.5',
    },
  },
  
  highlighting: {
    enabled: true,
    topCount: 3,
    bottomCount: 3,
    top3Text: {
      fontWeight: 'font-extrabold',
      textSize: 'text-5xl',
      // textColor: 'text-red-900',
      // scale: 'scale-210',
    },
    bottom3Text: {
      fontWeight: 'font-extrabold',
      textSize: 'text-5xl',
      // textColor: 'text-red-900',
      // scale: 'scale-110',
    },
  },
  
  rank: {
    textSize: 'text-4xl',
    fontWeight: 'font-bold',
    textColor: 'text-red-600',
    font: 'font-mono',
    changedColor: 'text-orange-900',
    changedBackground: 'bg-yellow-300',
    transition: 'transition-all duration-[3000ms] ease-out',
  },
  
  participantName: {
    textColor: 'text-gray-800',
    fontWeight: 'font-large',
    textSize: 'text-3xl',
    transform: 'uppercase',
    tracking: 'tracking-wide',
    hover: 'hover:text-red-600',
    transition: 'transition-colors',
    downgraded: {
      textColor: 'text-red-900',
      background: 'bg-red-300',
    },
    improved: {
      textColor: 'text-green-900',
      background: 'bg-green-300',
    },
  },
  
  score: {
    regular: {
      textSize: 'text-4xl',
      fontWeight: 'font-medium',
      font: 'font-mono',
      textColor: 'text-gray-800',
    },
    latest: {
      textSize: 'text-4xl',
      fontWeight: 'font-bold',
      font: 'font-mono',
      textColor: 'text-red-700',
      background: 'bg-red-100/30',
    },
    updated: {
      textSize: 'text-4xl',
      fontWeight: 'font-bold',
      font: 'font-mono',
      textColor: 'text-green-800',
      background: 'bg-green-300',
    },
    transition: 'transition-all duration-[3000ms] ease-out',
  },
  
  totalPoints: {
    textSize: 'text-4xl',
    fontWeight: 'font-bold',
    font: 'font-mono',
    textColor: 'text-gray-900',
    updatedColor: 'text-green-800',
    updatedBackground: 'bg-green-300',
    transition: 'transition-all duration-[3000ms] ease-out',
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
  
  notification: {
    container: 'fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-md',
    item: {
      background: 'bg-green-500',
      text: 'text-white',
      padding: 'px-6 py-4',
      borderRadius: 'rounded-lg',
      shadow: 'shadow-xl',
      fontSize: 'text-xl',
      fontWeight: 'font-bold',
      animation: 'animate-bounce',
      transition: 'transition-all duration-300',
    },
  },
  
  roundBorder: {
    left: 'border-l border-gray-400',
    right: 'border-r border-gray-400',
  },
}
