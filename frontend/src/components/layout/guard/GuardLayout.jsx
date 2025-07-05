import React from 'react'
import { Outlet } from 'react-router-dom'
import Nav from './Nav'

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
