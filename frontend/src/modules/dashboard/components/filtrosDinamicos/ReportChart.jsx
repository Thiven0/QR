export default function ReportTable({ data }) {
  const handleEdit = (id) => {
    console.log('Editar usuario:', id);
  };

  const handleDeactivate = (id) => {
    console.log('Desactivar usuario:', id);
  };

  const handleViewDetail = (id) => {
    console.log('Ver detalle usuario:', id);
  };

  if (data.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        <p className="text-lg">No hay usuarios registrados</p>
      </div>
    );
  }

  return (
    <div className="p-4 overflow-x-auto">
      <table className="table-auto w-full border bg-white shadow rounded">
        <thead>
          <tr className="bg-gray-200">
            <th className="border px-4 py-2">Nombre</th>
            <th className="border px-4 py-2">Rol</th>
            <th className="border px-4 py-2">Facultad</th>
            <th className="border px-4 py-2">Estado</th>
            <th className="border px-4 py-2">Fecha Ingreso</th>
            <th className="border px-4 py-2">Hora Ingreso</th>
            <th className="border px-4 py-2">Fecha Salida</th>
            <th className="border px-4 py-2">Hora Salida</th>
            <th className="border px-4 py-2">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr key={item.id} className="text-center hover:bg-gray-50">
              <td className="border px-4 py-2">{item.nombre}</td>
              <td className="border px-4 py-2">{item.rol}</td>
              <td className="border px-4 py-2">{item.facultad}</td>
              <td className="border px-4 py-2">
                <span className={`px-2 py-1 rounded ${item.estado === 'Activo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {item.estado}
                </span>
              </td>
              <td className="border px-4 py-2">{item.fechaIngreso}</td>
              <td className="border px-4 py-2">{item.horaIngreso}</td>
              <td className="border px-4 py-2">{item.fechaSalida}</td>
              <td className="border px-4 py-2">{item.horaSalida}</td>
              <td className="border px-4 py-2">
                <div className="flex gap-2 justify-center">
                  <button 
                    onClick={() => handleEdit(item.id)}
                    className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 text-sm"
                  >
                    Editar
                  </button>
                  <button 
                    onClick={() => handleDeactivate(item.id)}
                    className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 text-sm"
                  >
                    Desactivar
                  </button>
                  <button 
                    onClick={() => handleViewDetail(item.id)}
                    className="bg-gray-500 text-white px-3 py-1 rounded hover:bg-gray-600 text-sm"
                  >
                    Ver detalle
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
