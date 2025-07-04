import React from 'react'
import { Outlet } from 'react-router-dom'
import Nav from '../public/Nav'

const PublicLayout = () => {
    return (
        <>
            <Nav />
            
            <section>
                <Outlet />
            </section>
        </>
    )
}

export default PublicLayout
