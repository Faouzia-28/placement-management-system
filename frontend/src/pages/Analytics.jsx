import React from 'react'
import { 
  ChartBarIcon, 
  ArrowTrendingUpIcon, 
  ArrowTrendingDownIcon,
  CalendarDaysIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline'

const Analytics = () => {
  const metrics = [
    {
      title: 'Placement Rate',
      value: '78%',
      change: '+5%',
      changeType: 'increase',
      description: 'Students placed this year'
    },
    {
      title: 'Average Package',
      value: '₹12.5 LPA',
      change: '+15%',
      changeType: 'increase',
      description: 'Average salary offered'
    },
    {
      title: 'Top Package',
      value: '₹45 LPA',
      change: '+8%',
      changeType: 'increase',
      description: 'Highest package this year'
    },
    {
      title: 'Companies Visited',
      value: '156',
      change: '-3%',
      changeType: 'decrease',
      description: 'Total companies participated'
    }
  ]

  const departmentStats = [
    { department: 'Computer Science', placed: 89, total: 120, percentage: 74 },
    { department: 'Information Technology', placed: 76, total: 95, percentage: 80 },
    { department: 'Electronics', placed: 45, total: 68, percentage: 66 },
    { department: 'Mechanical', placed: 38, total: 55, percentage: 69 },
    { department: 'Civil', placed: 28, total: 42, percentage: 67 }
  ]

  const monthlyPlacements = [
    { month: 'Jan', placements: 12 },
    { month: 'Feb', placements: 18 },
    { month: 'Mar', placements: 25 },
    { month: 'Apr', placements: 32 },
    { month: 'May', placements: 28 },
    { month: 'Jun', placements: 35 },
    { month: 'Jul', placements: 42 },
    { month: 'Aug', placements: 38 },
    { month: 'Sep', placements: 45 },
    { month: 'Oct', placements: 52 },
    { month: 'Nov', placements: 48 },
    { month: 'Dec', placements: 38 }
  ]

  const topCompanies = [
    { name: 'Google', hires: 15, package: '₹35 LPA' },
    { name: 'Microsoft', hires: 12, package: '₹32 LPA' },
    { name: 'Amazon', hires: 18, package: '₹28 LPA' },
    { name: 'Meta', hires: 8, package: '₹38 LPA' },
    { name: 'Apple', hires: 6, package: '₹42 LPA' }
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="mt-1 text-sm text-gray-600">
            Track placement performance and insights
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <button className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 transition-all duration-200 flex items-center">
            <CalendarDaysIcon className="h-5 w-5 mr-2" />
            This Year
          </button>
          <button className="bg-gradient-primary text-white px-4 py-2 rounded-lg font-medium hover:shadow-button transition-all duration-200">
            Export Report
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => (
          <div 
            key={metric.title}
            className="bg-white rounded-xl shadow-card p-6 animate-fade-in"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <ChartBarIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex items-center">
                {metric.changeType === 'increase' ? (
                  <ArrowTrendingUpIcon className="h-4 w-4 text-green-500 mr-1" />
                ) : (
                  <ArrowTrendingDownIcon className="h-4 w-4 text-red-500 mr-1" />
                )}
                <span className={`text-sm font-medium ${
                  metric.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {metric.change}
                </span>
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1">{metric.value}</h3>
            <p className="text-sm text-gray-600">{metric.title}</p>
            <p className="text-xs text-gray-500 mt-1">{metric.description}</p>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Placements Chart */}
        <div className="bg-white rounded-xl shadow-card p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Monthly Placements</h2>
          <div className="space-y-4">
            {monthlyPlacements.map((item, index) => (
              <div key={item.month} className="flex items-center">
                <div className="w-12 text-sm text-gray-600">{item.month}</div>
                <div className="flex-1 mx-4">
                  <div className="bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-gradient-primary h-3 rounded-full transition-all duration-500"
                      style={{ 
                        width: `${(item.placements / 60) * 100}%`,
                        animationDelay: `${index * 100}ms`
                      }}
                    ></div>
                  </div>
                </div>
                <div className="w-12 text-sm font-medium text-gray-900 text-right">
                  {item.placements}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Department-wise Performance */}
        <div className="bg-white rounded-xl shadow-card p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Department Performance</h2>
          <div className="space-y-4">
            {departmentStats.map((dept, index) => (
              <div 
                key={dept.department}
                className="animate-slide-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900">{dept.department}</span>
                  <span className="text-sm text-gray-600">{dept.placed}/{dept.total}</span>
                </div>
                <div className="bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-primary h-2 rounded-full transition-all duration-500"
                    style={{ 
                      width: `${dept.percentage}%`,
                      animationDelay: `${index * 100}ms`
                    }}
                  ></div>
                </div>
                <div className="text-right mt-1">
                  <span className="text-xs text-gray-500">{dept.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Companies */}
      <div className="bg-white rounded-xl shadow-card p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Top Recruiting Companies</h2>
          <button className="text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors duration-200">
            View all
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {topCompanies.map((company, index) => (
            <div 
              key={company.name}
              className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 hover:shadow-soft transition-all duration-200 animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">{company.name[0]}</span>
                </div>
                <BuildingOfficeIcon className="h-5 w-5 text-gray-400" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">{company.name}</h3>
              <p className="text-sm text-gray-600 mb-2">{company.hires} hires</p>
              <p className="text-sm font-medium text-primary-600">{company.package}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Insights */}
      <div className="bg-gradient-light rounded-xl p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Key Insights</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg p-4">
            <div className="flex items-center mb-2">
              <ArrowTrendingUpIcon className="h-5 w-5 text-green-500 mr-2" />
              <span className="font-medium text-gray-900">Placement Growth</span>
            </div>
            <p className="text-sm text-gray-600">
              15% increase in placements compared to last year, with IT sector leading the growth.
            </p>
          </div>
          <div className="bg-white rounded-lg p-4">
            <div className="flex items-center mb-2">
              <ChartBarIcon className="h-5 w-5 text-blue-500 mr-2" />
              <span className="font-medium text-gray-900">Package Trends</span>
            </div>
            <p className="text-sm text-gray-600">
              Average package increased by 12% with tech companies offering the highest packages.
            </p>
          </div>
          <div className="bg-white rounded-lg p-4">
            <div className="flex items-center mb-2">
              <BuildingOfficeIcon className="h-5 w-5 text-purple-500 mr-2" />
              <span className="font-medium text-gray-900">Company Diversity</span>
            </div>
            <p className="text-sm text-gray-600">
              156 companies participated, with 23% being first-time recruiters at our campus.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Analytics