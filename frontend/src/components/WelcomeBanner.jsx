import React from 'react'
import { SparklesIcon, ChartBarIcon } from '@heroicons/react/24/outline'

const WelcomeBanner = () => {
  const currentHour = new Date().getHours()
  const greeting = currentHour < 12 ? 'Good morning' : currentHour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="bg-gradient-primary rounded-2xl shadow-soft p-8 text-white relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white bg-opacity-10 rounded-full"></div>
      <div className="absolute bottom-0 right-8 -mb-8 w-32 h-32 bg-white bg-opacity-5 rounded-full"></div>
      
      <div className="relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center mb-2">
              <SparklesIcon className="h-6 w-6 text-blue-200 mr-2" />
              <span className="text-blue-200 text-sm font-medium">Welcome back!</span>
            </div>
            <h1 className="text-3xl font-bold mb-2">{greeting}, Admin!</h1>
            <p className="text-blue-100 text-lg mb-6 max-w-2xl">
              Here's what's happening with your placement activities today. You have 5 new applications and 2 upcoming interviews.
            </p>
            <div className="flex flex-wrap gap-4">
              <button className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center">
                <ChartBarIcon className="h-5 w-5 mr-2" />
                View Analytics
              </button>
              <button className="border border-white border-opacity-30 hover:bg-white hover:bg-opacity-10 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200">
                Quick Actions
              </button>
            </div>
          </div>
          
          {/* Illustration placeholder */}
          <div className="hidden lg:block">
            <div className="w-48 h-32 bg-white bg-opacity-10 rounded-2xl flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full mx-auto mb-3 flex items-center justify-center">
                  <ChartBarIcon className="h-8 w-8 text-white" />
                </div>
                <p className="text-sm text-blue-100">Dashboard Overview</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WelcomeBanner