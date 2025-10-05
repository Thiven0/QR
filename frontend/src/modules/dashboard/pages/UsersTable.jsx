import { useState } from 'react';
import Filters from '../components/filtrosDinamicos/Filters';
import ReportTable from '../components/filtrosDinamicos/ReportTable';
import ReportChart from '../components/filtrosDinamicos/ReportChart';

export default function UsersPage() {
  const [usuarios, setUsuarios] = useState([]);

  const fetchUsuarios = async (filters) => {
    const res = await fetch('/api/usuarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(filters)
    });
    const data = await res.json();
    setUsuarios(data);
  };

  return (
    <>
      <Filters onSearch={fetchUsuarios} />
      <ReportChart data={usuarios} />
      <ReportTable data={usuarios} />
    </>
  );
}
