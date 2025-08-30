import React, { useEffect, useRef } from 'react';
import * as Highcharts from 'highcharts';

interface AnimatedPieChartProps {
  data: Array<{
    name: string;
    y: number;
    color?: string;
  }>;
  title: string;
  subtitle?: string;
  containerId: string;
}

export const AnimatedPieChart: React.FC<AnimatedPieChartProps> = ({
  data,
  title,
  subtitle,
  containerId
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<Highcharts.Chart | null>(null);

  useEffect(() => {
    if (!chartRef.current || !data.length) return;

    // Implementar a animação personalizada do gráfico de pizza
    (function (H: any) {
      H.seriesTypes.pie.prototype.animate = function (init: boolean) {
        const series = this,
          chart = series.chart,
          points = series.points,
          { animation } = series.options,
          { startAngleRad } = series;

        function fanAnimate(point: any, startAngleRad: number) {
          const graphic = point.graphic,
            args = point.shapeArgs;

          if (graphic && args) {
            graphic
              // Set initial animation values
              .attr({
                start: startAngleRad,
                end: startAngleRad,
                opacity: 1
              })
              // Animate to the final position
              .animate({
                start: args.start,
                end: args.end
              }, {
                duration: animation.duration / points.length
              }, function () {
                // On complete, start animating the next point
                if (points[point.index + 1]) {
                  fanAnimate(points[point.index + 1], args.end);
                }
                // On the last point, fade in the data labels, then
                // apply the inner size
                if (point.index === series.points.length - 1) {
                  series.dataLabelsGroup.animate({
                    opacity: 1
                  },
                  void 0,
                  function () {
                    points.forEach((point: any) => {
                      point.opacity = 1;
                    });
                    series.update({
                      enableMouseTracking: true
                    }, false);
                    chart.update({
                      plotOptions: {
                        pie: {
                          innerSize: '40%',
                          borderRadius: 8,
                          size: '85%'
                        }
                      }
                    });
                  });
                }
              });
          }
        }

        if (init) {
          // Hide points on init
          points.forEach((point: any) => {
            point.opacity = 0;
          });
        } else {
          fanAnimate(points[0], startAngleRad);
        }
      };
    }(Highcharts));

    // Criar o gráfico
    chartInstance.current = Highcharts.chart(chartRef.current, {
      chart: {
        type: 'pie',
        backgroundColor: 'transparent'
      },
      title: {
        text: title,
        style: {
          fontSize: '16px',
          fontWeight: '600',
          color: '#1f2937'
        }
      },
      subtitle: {
        text: subtitle || '',
        style: {
          fontSize: '14px',
          color: '#6b7280'
        }
      },
      tooltip: {
        headerFormat: '',
        pointFormat:
          '<span style="color:{point.color}">\u25cf</span> ' +
          '{point.name}: <b>{point.percentage:.1f}%</b><br/>' +
          'Valor: <b>R$ {point.y:,.2f}</b>',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#e5e7eb',
        borderRadius: 8,
        shadow: true
      },
      accessibility: {
        point: {
          valueSuffix: '%'
        }
      },
      plotOptions: {
          pie: {
            allowPointSelect: true,
            borderWidth: 2,
            cursor: 'pointer',
            size: '85%',
            dataLabels: {
              enabled: true,
              format: '<b>{point.name}</b><br>{point.percentage:.1f}%',
              distance: 25,
              style: {
                fontSize: '13px',
                fontWeight: '500'
              }
            },
            showInLegend: true
          }
        },
      legend: {
        align: 'center',
        verticalAlign: 'bottom',
        layout: 'horizontal',
        itemStyle: {
          fontSize: '12px',
          fontWeight: '500'
        }
      },
      series: [{
        name: 'Débitos',
        // Disable mouse tracking on load, enable after custom animation
        enableMouseTracking: false,
        animation: {
          duration: 2000
        },
        colorByPoint: true,
        data: data.map(item => ({
          name: item.name,
          y: item.y,
          color: item.color
        }))
      }],
      credits: {
        enabled: false
      }
    });

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
    };
  }, [data, title, subtitle, containerId]);

  return (
        <div className="w-full h-full">
          <div ref={chartRef} className="w-full h-full min-h-[450px]" />
        </div>
      );
};