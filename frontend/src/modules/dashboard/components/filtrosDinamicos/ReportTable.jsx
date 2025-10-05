import { Bar, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

export default function ReportChart({ data }) {
  const entradasPorFecha = data.reduce((acc, item) => {
    acc[item.fechaIngreso] = (acc[item.fechaIngreso] || 0) + 1;
    return acc;
  }, {});

  const entradasPorRol = data.reduce((acc, item) => {
    acc[item.rol] = (acc[item.rol] || 0) + 1;
    return acc;
  }, {});

  const barChartData = {
    labels: Object.keys(entradasPorFecha),
    datasets: [
      {
        label: 'Entradas por Fecha',
        data: Object.values(entradasPorFecha),
        backgroundColor: '#3b82f6',
        borderWidth: 1,
      },
    ],
  };

  const pieChartData = {
    labels: Object.keys(entradasPorRol),
    datasets: [
      {
        label: 'Entradas por Rol',
        data: Object.values(entradasPorRol),
        backgroundColor: ['#3b82f6', '#f59e0b', '#10b981'],
        borderWidth: 1,
      },
    ],
  };

  if (data.length === 0) {
    return null;
  }

  return (
    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-white p-4 shadow rounded">
        <h3 className="text-lg font-bold mb-4 text-center">Entradas por Fecha</h3>
        <Bar data={barChartData} />
      </div>
      <div className="bg-white p-4 shadow rounded">
        <h3 className="text-lg font-bold mb-4 text-center">Entradas por Rol</h3>
        <Pie data={pieChartData} />
      </div>
    </div>
  );
}
