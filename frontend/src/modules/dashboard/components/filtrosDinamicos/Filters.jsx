import { useState } from 'react';

export default function Filters({ onSearch }) {
  const [filters, setFilters] = useState({
    nombre: '',
    rol: '',
    facultad: ''
  });

  const handleChange = e => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = e => {
    e.preventDefault();
    onSearch(filters);
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-white shadow rounded">
      <input 
        type="text" 
        name="nombre" 
        placeholder="Buscar por nombre" 
        onChange={handleChange} 
        className="border p-2 rounded"
      />
      <select name="rol" onChange={handleChange} className="border p-2 rounded">
        <option value="">Todos los roles</option>
        <option value="Profesor">Profesor</option>
        <option value="Estudiante">Estudiante</option>
        <option value="Administrativo">Administrativo</option>
      </select>
      <select name="facultad" onChange={handleChange} className="border p-2 rounded">
        <option value="">Todas las facultades</option>
        <option value="Ingeniería">Ingeniería</option>
        <option value="Medicina">Medicina</option>
        <option value="Derecho">Derecho</option>
      </select>
      <button type="submit" className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600">
        Buscar
      </button>
    </form>
  );
}
