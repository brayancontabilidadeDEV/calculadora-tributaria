// ==================== FUNÇÕES EXISTENTES MANTIDAS ====================

function atualizarGraficos(dados, tributoAtual, tributoReforma) {
    // Destruir gráficos existentes
    Object.values(charts).forEach(chart => {
        if (chart && typeof chart.destroy === 'function') {
            chart.destroy();
        }
    });
    charts = {};

    const reforma = calcularIVADual(dados);
    const estadoAtual = dados.estado;

    // 1. Gráfico Comparativo
    const ctxComp = document.getElementById('chartComparativo').getContext('2d');
    charts.comparativo = new Chart(ctxComp, {
        type: 'bar',
        data: {
            labels: ['Sistema Atual', 'IVA Dual Pós-Reforma'],
            datasets: [
                {
                    label: 'Tributos Mensais (R$)',
                    data: [tributoAtual, tributoReforma],
                    backgroundColor: ['#3b82f6', '#8b5cf6'],
                    borderColor: ['#2563eb', '#7c3aed'],
                    borderWidth: 2,
                    borderRadius: 8,
                    borderSkipped: false,
                },
                {
                    label: 'Carga Tributária (%)',
                    data: [
                        (tributoAtual / dados.faturamento) * 100,
                        (tributoReforma / dados.faturamento) * 100
                    ],
                    type: 'line',
                    yAxisID: 'y1',
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 3,
                    pointRadius: 6,
                    pointBackgroundColor: '#10b981',
                    fill: false,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index',
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Comparativo de Carga Tributária - Valores Absolutos e Percentuais',
                    font: {
                        size: 16,
                        weight: 'bold'
                    },
                    padding: { bottom: 20 }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.datasetIndex === 0) {
                                label += formatarMoeda(context.parsed.y);
                            } else {
                                label += formatarPorcentagem(context.parsed.y);
                            }
                            return label;
                        }
                    }
                },
                legend: {
                    position: 'top',
                    labels: {
                        padding: 20,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Valor em R$',
                        font: {
                            weight: 'bold'
                        }
                    },
                    ticks: {
                        callback: function(value) {
                            return formatarMoeda(value);
                        }
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Carga %',
                        font: {
                            weight: 'bold'
                        }
                    },
                    ticks: {
                        callback: function(value) {
                            return formatarPorcentagem(value);
                        }
                    },
                    grid: {
                        drawOnChartArea: false,
                    },
                }
            }
        }
    });

    // 2. Gráfico Cascata
    const ctxCascata = document.getElementById('chartCascata').getContext('2d');
    const cascataData = [
        reforma.ivaBruto,
        -reforma.creditoInsumos,
        -reforma.creditoAtivoMensal,
        reforma.ivaLiquido
    ];
    
    const cascataLabels = [
        'IVA Bruto',
        'Crédito Insumos',
        'Crédito Ativo',
        'IVA Líquido'
    ];
    
    const cascataColors = [
        '#ef4444',
        '#10b981',
        '#3b82f6',
        '#f59e0b'
    ];
    
    charts.cascata = new Chart(ctxCascata, {
        type: 'bar',
        data: {
            labels: cascataLabels,
            datasets: [{
                data: cascataData,
                backgroundColor: cascataColors,
                borderColor: cascataColors.map(color => color.replace('0.8', '1')),
                borderWidth: 1,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Fluxo de Cálculo do IVA - Gráfico Cascata',
                    font: {
                        size: 16,
                        weight: 'bold'
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.parsed.y;
                            const prefix = value < 0 ? '-' : '';
                            return `${context.label}: ${prefix}${formatarMoeda(Math.abs(value))}`;
                        }
                    }
                },
                datalabels: {
                    display: true,
                    color: 'white',
                    font: {
                        weight: 'bold'
                    },
                    formatter: function(value) {
                        return formatarMoeda(Math.abs(value));
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatarMoeda(value);
                        }
                    }
                }
            }
        },
        plugins: [ChartDataLabels]
    });

    // 3. Gráfico de Transição
    const anosTransicao = [2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033];
    const tributosPorAno = anosTransicao.map(ano => {
        const trans = calcularTransicao(dados, ano);
        return trans.tributoTotal;
    });
    
    const ctxTrans = document.getElementById('chartTransicao').getContext('2d');
    charts.transicao = new Chart(ctxTrans, {
        type: 'line',
        data: {
            labels: anosTransicao,
            datasets: [
                {
                    label: 'Tributos durante Transição',
                    data: tributosPorAno,
                    borderColor: '#8b5cf6',
                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    borderWidth: 4,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 6,
                    pointBackgroundColor: '#8b5cf6',
                    pointBorderColor: 'white',
                    pointBorderWidth: 2
                },
                {
                    label: 'Sistema Atual (Referência)',
                    data: Array(8).fill(tributoAtual),
                    borderColor: '#3b82f6',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    fill: false,
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Evolução da Carga Tributária durante a Transição (2026-2033)',
                    font: {
                        size: 16,
                        weight: 'bold'
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${formatarMoeda(context.parsed.y)}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatarMoeda(value);
                        }
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                }
            }
        }
    });

    // 4. Gráfico de Estados
    const estados = Object.keys(INFO_ESTADOS_CORRIGIDO);
    const cargasEstados = estados.map(sigla => {
        const dadosEstado = { ...dados, estado: sigla };
        const sistema = calcularSistemaAtualCorrigido(dadosEstado);
        return (sistema.total / dados.faturamento) * 100;
    });
    
    const scores = estados.map(sigla => {
        const estadoInfo = INFO_ESTADOS_CORRIGIDO[sigla];
        return estadoInfo.score;
    });
    
    const isEstadoAtual = estados.map(sigla => sigla === estadoAtual);
    
    const ctxEstados = document.getElementById('chartEstados').getContext('2d');
    charts.estados = new Chart(ctxEstados, {
        type: 'bar',
        data: {
            labels: estados,
            datasets: [
                {
                    label: 'Carga Tributária Atual (%)',
                    data: cargasEstados,
                    backgroundColor: cargasEstados.map((carga, index) => 
                        isEstadoAtual[index] ? '#8b5cf6' : '#3b82f6'
                    ),
                    borderColor: cargasEstados.map((carga, index) => 
                        isEstadoAtual[index] ? '#7c3aed' : '#2563eb'
                    ),
                    borderWidth: 2,
                    borderRadius: 6,
                    yAxisID: 'y'
                },
                {
                    label: 'Score de Atratividade',
                    data: scores,
                    type: 'line',
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 3,
                    pointRadius: 6,
                    pointBackgroundColor: scores.map((score, index) => 
                        isEstadoAtual[index] ? '#8b5cf6' : '#10b981'
                    ),
                    yAxisID: 'y1',
                    fill: false,
                    tension: 0.3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Análise Comparativa por Estado - Carga Atual vs. Atratividade',
                    font: {
                        size: 16,
                        weight: 'bold'
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            if (context.datasetIndex === 0) {
                                return `Carga: ${formatarPorcentagem(context.parsed.y)}`;
                            } else {
                                return `Score: ${context.parsed.y}/10`;
                            }
                        }
                    }
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Carga Tributária (%)'
                    },
                    ticks: {
                        callback: function(value) {
                            return formatarPorcentagem(value);
                        }
                    }
                },
                y1: {
                    type: 'linear',
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Score de Atratividade'
                    },
                    min: 0,
                    max: 10,
                    grid: {
                        drawOnChartArea: false
                    }
                }
            }
        }
    });

    // 5. Gráfico por Setor
    const setores = ['comercio', 'industria', 'servicos-gerais', 'servicos-tecnologia', 'servicos-engenharia', 'energia', 'telecom'];
    const setorLabels = ['Comércio', 'Indústria', 'Serviços Gerais', 'TI', 'Engenharia', 'Energia', 'Telecom'];
    
    const cargasPorSetor = setores.map(setor => {
        const dadosSetor = { ...dados, setor: setor };
        const sistema = calcularSistemaAtualCorrigido(dadosSetor);
        const reformaSetor = calcularIVADual(dadosSetor);
        return {
            atual: (sistema.total / dados.faturamento) * 100,
            reforma: (reformaSetor.ivaLiquido / dados.faturamento) * 100
        };
    });
    
    const ctxSetor = document.getElementById('chartSetor').getContext('2d');
    charts.setor = new Chart(ctxSetor, {
        type: 'bar',
        data: {
            labels: setorLabels,
            datasets: [
                {
                    label: 'Carga Atual',
                    data: cargasPorSetor.map(s => s.atual),
                    backgroundColor: '#3b82f6',
                    borderColor: '#2563eb',
                    borderWidth: 2,
                    borderRadius: 6
                },
                {
                    label: 'Pós-Reforma',
                    data: cargasPorSetor.map(s => s.reforma),
                    backgroundColor: '#8b5cf6',
                    borderColor: '#7c3aed',
                    borderWidth: 2,
                    borderRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Impacto da Reforma por Setor Econômico',
                    font: {
                        size: 16,
                        weight: 'bold'
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${formatarPorcentagem(context.parsed.y)}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Carga Tributária (%)'
                    },
                    ticks: {
                        callback: function(value) {
                            return formatarPorcentagem(value);
                        }
                    }
                }
            }
        }
    });
}
