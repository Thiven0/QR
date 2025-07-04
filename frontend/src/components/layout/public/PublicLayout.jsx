import React from 'react'
import { Outlet } from 'react-router-dom'

const PublicLayout = () => {
    return (
        <>
            {/*<Layout/> header*/}
            <h1>Public Layout</h1>
            <Outlet />

        </>
    )
}

export default PublicLayout
