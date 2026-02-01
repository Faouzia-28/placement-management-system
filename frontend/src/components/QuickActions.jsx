import React from 'react'
import { 
  PlusIcon, 
  UserPlusIcon, 
  DocumentTextIcon,
  ChartBarIcon,
  CogIcon,
  BellIcon
} from '@heroicons/react/24/outline'

const QuickActions = () => {
  const actions = [
    {
      id: 1,
      title: 'Create Drive',
      description: 'Add new placement drive',
      icon: PlusIcon,
      color: 'bg-blue-500 hover:bg-blue-600',
      action: () => console.log('Create drive')
    },
    {
      id: 2,
      title: 'Add Student',
      description: 'Register new student',
      icon: UserPlusIcon,
      color: 'bg-green-500 hover:bg-green-600',
      action: () => console.log('Add student')
    },
    {
      id: 3,
      title: 'Generate Report',
      description: 'Create placement report',
      icon: DocumentTextIcon,
      color: 'bg-purple-500 hover:bg-purple-600',
      action: () => console.log('Generate report')
    },
    {
      id: 4,
      title: 'View Analytics',
      description: 'Check performance metrics',
      icon: ChartBarIcon,
      color: 'bg-orange-500 hover:bg-orange-600',
      action: () => console.log('View analytics')
    }
  ]

  return (
    <div className="bg-white rounded-xl shadow-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Quick Actions</h2>
        <button className="text-gray-400 hover:text-gray-600 transition-colors duration-200">
          <CogIcon className="h-5 w-5" />
        </button>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action, index) => (
          <button
            key={action.id}
            onClick={action.action}
            className={`
              ${action.color} text-white p-4 rounded-lg transition-all duration-200 
              transform hover:scale-105 hover:shadow-button animate-fade-in
            `}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex flex-col items-center text-center">
              <action.icon className="h-6 w-6 mb-2" />
              <span className="text-sm font-medium mb-1">{action.title}</span>
              <span className="text-xs opacity-90">{action.description}</span>
            </div>
          </button>
        ))}
      </div>
      
      {/* Notification section */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <BellIcon className="h-5 w-5 text-gray-400 mr-2" />
            <span className="text-sm text-gray-600">Notifications</span>
          </div>
          <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded-full">
            3 new
          </span>
        </div>
        <div className="mt-3 space-y-2">
          <div className="text-sm text-gray-700">
            • Interview reminder for tomorrow
          </div>
          <div className="text-sm text-gray-700">
            • New application received
          </div>
          <div className="text-sm text-gray-700">
            • Drive deadline approaching
          </div>
        </div>
      </div>
    </div>
  )
}

export default QuickActions