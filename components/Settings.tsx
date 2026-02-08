
import React from 'react';
import { ArrowLeft, ChevronDown, ToggleRight, ToggleLeft } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const Settings: React.FC = () => {
  const { setActiveTab, settings, updateSettings } = useAppContext();

  return (
    <div className="bg-[#0078d4] min-h-screen text-gray-900 pb-24">
      <header className="bg-[#0078d4] p-4 flex items-center shadow-none text-white">
        <button onClick={() => setActiveTab('losses')} className="mr-4">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold">Settings</h1>
      </header>

      <div className="bg-gray-100 min-h-screen p-4 space-y-6">
        {/* Locale Section */}
        <section>
          <h2 className="text-sm font-bold text-gray-700 mb-2">Locale</h2>
          <div className="bg-white rounded-sm shadow-sm overflow-hidden border-t border-b border-gray-200">
            <div className="p-4 flex justify-between items-center">
              <span className="font-medium text-sm">Language</span>
              <div className="flex items-center font-semibold text-sm">
                {settings.language} <ChevronDown size={16} className="ml-1 text-[#0078d4]" />
              </div>
            </div>
          </div>
        </section>

        {/* Date/Time Section */}
        <section>
          <h2 className="text-sm font-bold text-gray-700 mb-2">Date / Time Formats</h2>
          <div className="bg-white rounded-sm shadow-sm overflow-hidden border-t border-b border-gray-200 divide-y divide-gray-100">
            <div className="p-4 flex justify-between items-center">
              <span className="font-medium text-sm">Date Format</span>
              <div className="flex items-center font-semibold text-sm">
                {settings.dateFormat} <ChevronDown size={16} className="ml-1 text-[#0078d4]" />
              </div>
            </div>
            <div className="p-4 flex justify-between items-center">
              <span className="font-medium text-sm">Time Format</span>
              <div className="flex items-center font-semibold text-sm">
                {settings.timeFormat} <ChevronDown size={16} className="ml-1 text-[#0078d4]" />
              </div>
            </div>
          </div>
        </section>

        {/* Measurement Units */}
        <section>
          <h2 className="text-sm font-bold text-gray-700 mb-2">Measurement Units</h2>
          <div className="bg-white rounded-sm shadow-sm overflow-hidden border-t border-b border-gray-200 divide-y divide-gray-100">
            <div className="p-4 flex justify-between items-center">
              <span className="font-medium text-sm">Temperature Unit</span>
              <div className="flex items-center font-semibold text-sm">
                &deg; {settings.units.temperature} <ChevronDown size={16} className="ml-1 text-[#0078d4]" />
              </div>
            </div>
            <div className="p-4 flex justify-between items-center">
              <span className="font-medium text-sm">Dimension Unit</span>
              <div className="flex items-center font-semibold text-sm">
                {settings.units.dimension} <ChevronDown size={16} className="ml-1 text-[#0078d4]" />
              </div>
            </div>
            <div className="p-4 flex justify-between items-center">
              <span className="font-medium text-sm">Humidity Ratio Unit</span>
              <div className="flex items-center font-semibold text-sm">
                {settings.units.humidity} <ChevronDown size={16} className="ml-1 text-[#0078d4]" />
              </div>
            </div>
            <div className="p-4 flex justify-between items-center">
              <span className="font-medium text-sm">Fluid Volume Unit</span>
              <div className="flex items-center font-semibold text-sm">
                {settings.units.volume} <ChevronDown size={16} className="ml-1 text-[#0078d4]" />
              </div>
            </div>
            <div className="p-4 flex justify-between items-center">
              <span className="font-medium text-sm">FloorPlannerDimensionRef</span>
              <div className="flex items-center font-semibold text-sm">
                Inner <ChevronDown size={16} className="ml-1 text-[#0078d4]" />
              </div>
            </div>
          </div>
        </section>

        {/* Others */}
        <section>
          <h2 className="text-sm font-bold text-gray-700 mb-2">Others</h2>
          <div className="bg-white rounded-sm shadow-sm overflow-hidden border-t border-b border-gray-200 divide-y divide-gray-100">
            <div className="p-4 flex justify-between items-center">
              <span className="font-medium text-sm">Default Project View</span>
              <div className="flex items-center font-semibold text-sm">
                {settings.defaultView} <ChevronDown size={16} className="ml-1 text-[#0078d4]" />
              </div>
            </div>
            <div className="p-4 flex justify-between items-center">
              <span className="font-medium text-sm">Copy photos to device gallery</span>
              <button 
                onClick={() => updateSettings({ copyPhotosToGallery: !settings.copyPhotosToGallery })}
                className="text-[#0078d4]"
              >
                {settings.copyPhotosToGallery ? <ToggleRight size={32} /> : <ToggleLeft size={32} className="text-gray-300" />}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Settings;
