import React from 'react'
import { 
  UserGroupIcon, 
  BriefcaseIcon, 
  BuildingOfficeIcon,
  TrophyIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  EyeIcon,
  PlusIcon
} from '@heroicons/react/24/outline'
import MetricCard from '../components/MetricCard'
import WelcomeBanner from '../components/WelcomeBanner'
import RecentActivity from '../components/RecentActivity'
import UpcomingDrives from '../components/UpcomingDrives'
import QuickActions from '../components/QuickActions'

const Dashboard = () => {
  const metrics = [
    {
      title: 'Total Students',
      value: '2,847',
      change: '+12%',
      changeType: 'increase',
      icon: UserGroupIcon,
      color: 'blue'
    },
    {
      title: 'Active Drives',
      value: '23',
      change: '+3',
      changeType: 'increase',
      icon: BriefcaseIcon,
      color: 'green'
    },
    {
      title: 'Partner Companies',
      value: '156',
      change: '+8',
      changeType: 'increase',
      icon: BuildingOfficeIcon,
      color: 'purple'
    },
    {
      title: 'Placements This Month',
      value: '89',
      change: '-5%',
      changeType: 'decrease',
      icon: TrophyIcon,
      color: 'orange'
    }
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Banner */}
      <WelcomeBanner />
      
      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => (
          <MetricCard key={metric.title} metric={metric} index={index} />
        ))}
      </div>
      
      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Recent Activity */}
        <div className="lg:col-span-2">
          <RecentActivity />
        </div>
        
        {/* Right Column - Upcoming Drives & Quick Actions */}
        <div className="space-y-6">
          <UpcomingDrives />
          <QuickActions />
        </div>
      </div>
    </div>
  )
}

export default Dashboard