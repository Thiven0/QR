import { useEffect, useState } from "react";
import ProfileCard from "../components/ProfileCard";

const StudentList = () => {
  const [students, setStudents] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    fetch("http://localhost:3000/api/User/list")
      .then(res => res.json())
      .then(data => setStudents(data));
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center py-8">
      <h1 className="text-2xl font-bold mb-6">Lista de Estudiantes</h1>
      <div className="w-full max-w-3xl grid grid-cols-1 md:grid-cols-2 gap-4">
        {students.map((user) => (
          <div
            key={user._id}
            className="bg-white rounded shadow p-4 cursor-pointer hover:bg-green-50"
            onClick={() => setSelected(user)}
          >
            <div className="flex items-center gap-4">
              <img
                src={user.imagen || "https://ui-avatars.com/api/?name=" + user.nombre}
                alt="Foto"
                className="w-12 h-12 rounded-full object-cover border"
              />
              <div>
                <div className="font-semibold">{user.nombre} {user.apellido}</div>
                <div className="text-sm text-gray-500">{user.correo}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      {selected && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="relative">
            <button
              className="absolute top-2 right-2 bg-red-500 text-white rounded-full px-3 py-1 text-xs"
              onClick={() => setSelected(null)}
            >
              Cerrar
            </button>
            <ProfileCard user={selected} />
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentList;