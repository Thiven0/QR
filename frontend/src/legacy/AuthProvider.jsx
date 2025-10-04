import React from 'react'
import { useState, useEffect, createContext } from 'react'

const AuthContext = createContext()
const AuthProvider = ({ children }) => {
    const [compartido, setCompartido] = useState("compartida en todos los componentes");


    return (
        <AuthContext.Provider value={{ compartido, setCompartido }}>
            {children}
        </AuthContext.Provider>
    )
}

export default AuthProvider
