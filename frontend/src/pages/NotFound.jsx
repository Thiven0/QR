
const NotFound = () => {
    return (
        <div>
            <h1 className="text-4xl font-bold text-center mt-20">404 - Page Not Found</h1>
            <p className="text-center mt-4">La pagina que estas buscando no existe.</p>
            <div className="flex justify-center mt-8">
                <a href="/" className="text-blue-500 hover:underline">Ir a Inicio</a>
            </div>
        </div>

    )
}

export default NotFound
