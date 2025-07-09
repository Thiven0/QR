import React from 'react'
import { Outlet } from 'react-router-dom'
import Nav from '../guard/NavGuard'
import BackGround from '../BackGround'

const PublicLayout = () => {
    return (
        <>
            <Nav />
            <BackGround />
            <section>
                <Outlet />
            </section>

            
        </>
    )
}

export default PublicLayout
