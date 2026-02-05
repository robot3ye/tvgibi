import React from 'react';

export default function FooterNav() {
    const navItems = [
        { label: "DE FORM A SODWN", date: "2020-01-11" },
        { label: "KAY+E OH SUOPE", date: "2040-02-K4" },
        { label: "SOLARIS DOME", date: "2045-01-21" },
        { label: "N7 A<PHITAEATEA", date: "2040-02-64" },
        { label: "TITAN ORBIT ARENA", date: "2045-03-30" },
        { label: "IO LUNAR HALL", date: "2045-04-25" },
        { label: "HELIOS GRAND STAGE", date: "2045-05-19" },
    ];
    
    const rightItems = [
        { label: "PAGE ONE", date: "2020-01-11" },
        { label: "PAGE TWO", date: "2040-02-K4" },
        { label: "PLANET VESPERA", date: "2045-01-21" },
        { label: "EXOPLANET ZVR", date: "2040-02-64" },
        { label: "PLANET ELARA", date: "2045-03-30" },
        { label: "MOON XANTHE", date: "2045-04-25" },
        { label: "ASTEROID B-612", date: "2045-05-19" },
    ];

    return (
        <div className="bg-[#FF6600] p-8 border-t-4 border-black font-mono relative">
            <h2 className="text-4xl md:text-5xl font-black text-black mb-8 tracking-widest">NAVIGATION</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-black font-bold">
                <ul className="space-y-2">
                    {navItems.map((item, i) => (
                        <li key={i} className="flex justify-between border-b border-black/20 pb-1">
                            <span>- {item.label}</span>
                            <span className="opacity-60">{item.date}</span>
                        </li>
                    ))}
                </ul>
                <ul className="space-y-2">
                    {rightItems.map((item, i) => (
                        <li key={i} className="flex justify-between border-b border-black/20 pb-1">
                            <span>- {item.label}</span>
                            <span className="opacity-60">{item.date}</span>
                        </li>
                    ))}
                </ul>
            </div>
            
            <div className="mt-8 pt-4 border-t-4 border-black text-center text-sm font-bold">
                <span className="bg-[#00FF00] px-2 py-1 text-black border border-black">©2026 tvgibi</span>
            </div>
            
            {/* Decoration */}
            <div className="absolute top-0 right-0 w-8 h-8 bg-black"></div>
        </div>
    );
}
