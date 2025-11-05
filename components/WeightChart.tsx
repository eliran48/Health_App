import React, { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js';
import type { Metric } from '../types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface WeightChartProps {
  metrics: Metric[];
}

export default function WeightChart({ metrics }: WeightChartProps) {
  const chartData = useMemo(() => {
    const filteredAndSorted = metrics
      .filter((x) => x.weight != null)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return {
      labels: filteredAndSorted.map((r) => r.date),
      datasets: [
        {
          label: 'משקל (ק"ג)',
          data: filteredAndSorted.map((r) => r.weight),
          borderColor: 'rgb(0, 0, 0)',
          backgroundColor: 'rgba(0, 0, 0, 0.1)',
          borderWidth: 2,
          tension: 0.1,
          fill: true,
        },
      ],
    };
  }, [metrics]);
  
  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        rtl: true,
        labels: {
            font: {
                family: "'Assistant', sans-serif"
            }
        }
      },
      title: {
        display: false,
      },
    },
    scales: {
        x: {
            ticks: {
                font: {
                    family: "'Assistant', sans-serif"
                }
            }
        },
        y: {
             ticks: {
                font: {
                    family: "'Assistant', sans-serif"
                }
            }
        }
    }
  };

  const hasData = chartData.datasets[0].data.length > 1;

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <h2 className="text-xl font-bold mb-4 text-gray-800">גרף משקל (30 שבועות אחרונים)</h2>
      <div className="relative h-64 md:h-80">
        {hasData ? (
          <Line options={options} data={chartData} />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            יש להזין לפחות שתי רשומות משקל כדי להציג גרף.
          </div>
        )}
      </div>
    </div>
  );
}
