import React from 'react'
import { Outlet } from 'react-router-dom'
import Nav from './NavGuard'
import SideBar from './SideBarGuard'

const GuardLayout = () => {
    return (
        <div className="min-h-screen bg-[#f8fafc]">
            <Nav />
            <SideBar />
            <main className="min-h-screen pt-20 sm:ml-64 transition-all">
                <Outlet />
            </main>
        </div>
    )
}

export default GuardLayout
