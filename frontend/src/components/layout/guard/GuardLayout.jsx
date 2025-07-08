import React from 'react'
import { Outlet } from 'react-router-dom'
import Nav from './NavGuard'
import SideBar from './SideBarGuard'
import AuthLayout from '../BackGround'

const PublicLayout = () => {
    return (
        <>
            <Nav />
            <AuthLayout/>
            <SideBar />
            <section>
                <Outlet />
            </section>

            
        </>
    )
}

export default PublicLayout
