// ==================== FUNÇÕES DE CÁLCULO CORRIGIDAS ====================

function calcularFatorR(folha, faturamento) {
    if (faturamento === 0) return 0;
    return (folha / faturamento) * 100;
}

function calcularSimplesNacional(faturamentoAnual, setor, fatorR) {
    if (faturamentoAnual > 4800000) {
        return { 
            aliquota: 0, 
            erro: 'Faturamento excede limite do Simples (R$ 4,8 mi/ano)' 
        };
    }

    let setorCalculo = setor;
    if (setor.includes('servicos')) {
        if (setor === 'servicos-advocacia') {
            setorCalculo = 'servicos-advocacia';
        } else {
            setorCalculo = fatorR >= 28 ? setor : 'servicos-advocacia';
        }
    }

    const tabela = SIMPLES_ALIQUOTAS[setorCalculo] || SIMPLES_ALIQUOTAS['servicos-gerais'];
    let faixa = tabela[tabela.length - 1];
    
    for (let i = 0; i < tabela.length; i++) {
        if (faturamentoAnual <= tabela[i].limite) {
            faixa = tabela[i];
            break;
        }
    }
    
    const aliquotaEfetiva = ((faturamentoAnual * faixa.aliquota / 100) - faixa.deducao) / faturamentoAnual * 100;
    return { 
        aliquota: Math.max(aliquotaEfetiva, 0),
        anexo: setorCalculo,
        fatorR: fatorR
    };
}

function calcularRegimeSimplificado(faturamento) {
    const aliquotaSimplificada = 0.10;
    const tributo = faturamento * aliquotaSimplificada;
    
    return {
        total: tributo,
        detalhes: [{ 
            nome: `Novo Regime Simplificado (10%)`, 
            valor: tributo 
        }],
        aliquotaEfetiva: 10.0
    };
}

// FUNÇÃO CORRIGIDA: Calcular sistema atual por estado
function calcularSistemaAtualCorrigido(dados, estadoAlvo = null) {
    const estado = estadoAlvo || dados.estado;
    const estadoInfo = INFO_ESTADOS_CORRIGIDO[estado] || INFO_ESTADOS_CORRIGIDO['SP'];
    
    if (dados.regime === 'simples-futuro') {
        return calcularRegimeSimplificado(dados.faturamento);
    }
    
    if (dados.regime === 'simples') {
        const faturamentoAnual = dados.faturamento * 12;
        const folhaAnual = dados.folhaPagamento * 12;
        const fatorR = calcularFatorR(folhaAnual, faturamentoAnual);
        
        const resultado = calcularSimplesNacional(faturamentoAnual, dados.setor, fatorR);
        if (resultado.erro) {
            return {
                total: 0,
                detalhes: [{ nome: 'ERRO', valor: 0 }],
                erro: resultado.erro
            };
        }
        
        let tributoTotal = dados.faturamento * (resultado.aliquota / 100);
        
        // Aplicar benefícios estaduais para Simples
        if (estadoInfo.beneficiosDesconto) {
            const desconto = tributoTotal * estadoInfo.beneficiosDesconto;
            tributoTotal -= desconto;
            
            return {
                total: tributoTotal,
                detalhes: [
                    { 
                        nome: `Simples Nacional (Anexo: ${resultado.anexo})`, 
                        valor: dados.faturamento * (resultado.aliquota / 100) 
                    },
                    { 
                        nome: `Desconto Estadual ${(estadoInfo.beneficiosDesconto * 100)}%`, 
                        valor: -desconto 
                    }
                ],
                aliquotaEfetiva: (tributoTotal / dados.faturamento) * 100
            };
        }
        
        return {
            total: tributoTotal,
            detalhes: [{ 
                nome: `Simples Nacional (Anexo: ${resultado.anexo}, Fator R: ${fatorR.toFixed(1)}%)`, 
                valor: tributoTotal 
            }],
            aliquotaEfetiva: resultado.aliquota
        };
    }
    
    // Para Lucro Presumido e Real - CORRIGIDO
    const margem = MARGEM_PRESUMIDA[dados.setor] || 32;
    const lucroPresumido = dados.faturamento * (margem / 100);
    
    let irpj = lucroPresumido * 0.15;
    if (lucroPresumido > 20000) {
        irpj += (lucroPresumido - 20000) * 0.10;
    }
    
    const csll = lucroPresumido * 0.09;
    const pis = dados.faturamento * 0.0065;
    const cofins = dados.faturamento * 0.03;
    
    let icmsIss = 0;
    // CORREÇÃO: Serviços pagam ISS, outros pagam ICMS
    if (dados.setor.includes('servicos')) {
        // Serviços pagam ISS (municipal)
        icmsIss = dados.faturamento * (estadoInfo.iss / 100);
    } else {
        // Comércio e indústria pagam ICMS (estadual)
        icmsIss = dados.faturamento * (estadoInfo.icms / 100);
    }
    
    const total = irpj + csll + pis + cofins + icmsIss;
    
    // Aplicar benefícios estaduais
    let descontoBeneficios = 0;
    if (estadoInfo.beneficiosDesconto) {
        descontoBeneficios = total * estadoInfo.beneficiosDesconto;
    }
    
    const totalFinal = total - descontoBeneficios;
    
    return {
        total: totalFinal,
        detalhes: [
            { nome: 'IRPJ', valor: irpj },
            { nome: 'CSLL', valor: csll },
            { nome: 'PIS', valor: pis },
            { nome: 'COFINS', valor: cofins },
            { 
                nome: dados.setor.includes('servicos') ? 'ISS' : 'ICMS', 
                valor: icmsIss 
            },
            ...(descontoBeneficios > 0 ? [
                { 
                    nome: `Desconto Estadual ${(estadoInfo.beneficiosDesconto * 100)}%`, 
                    valor: -descontoBeneficios 
                }
            ] : [])
        ],
        aliquotaEfetiva: (totalFinal / dados.faturamento) * 100
    };
}

function calcularLucroReal(faturamento, setor, estado, margemLucro = 15) {
    const lucroReal = faturamento * (margemLucro / 100);
    
    let irpj = lucroReal * 0.15;
    if (lucroReal > 20000) {
        irpj += (lucroReal - 20000) * 0.10;
    }
    
    const csll = lucroReal * 0.09;
    const pis = faturamento * 0.0165;
    const cofins = faturamento * 0.076;
    
    const estadoInfo = INFO_ESTADOS_CORRIGIDO[estado] || INFO_ESTADOS_CORRIGIDO['SP'];
    let icmsIss = 0;
    if (setor.includes('servicos')) {
        icmsIss = faturamento * (estadoInfo.iss / 100);
    } else {
        icmsIss = faturamento * (estadoInfo.icms / 100);
    }
    
    return {
        irpj,
        csll,
        pis,
        cofins,
        icmsIss,
        total: irpj + csll + pis + cofins + icmsIss,
        detalhes: [
            { nome: 'IRPJ', valor: irpj },
            { nome: 'CSLL', valor: csll },
            { nome: 'PIS (NC)', valor: pis },
            { nome: 'COFINS (NC)', valor: cofins },
            { nome: setor.includes('servicos') ? 'ISS' : 'ICMS', valor: icmsIss }
        ]
    };
}

function calcularIVADual(dados) {
    const cenario = CENARIOS_IVA[cenarioAtual];
    const categoria = CATEGORIAS_ALIQUOTA[dados.categoria];
    const faturamento = dados.faturamento;
    
    let aliquotaAjustada = cenario.aliquota;
    if (dados.setor === 'energia') {
        aliquotaAjustada = 14.0;
    } else if (dados.setor === 'telecom') {
        aliquotaAjustada = 22.0;
    }
    
    const cbsAplicada = (aliquotaAjustada * 0.4) * categoria.fator;
    const ibsAplicada = (aliquotaAjustada * 0.6) * categoria.fator;
    const aliquotaTotal = (cbsAplicada + ibsAplicada);
    
    const cbsBruto = faturamento * (cbsAplicada / 100);
    const ibsBruto = faturamento * (ibsAplicada / 100);
    let ivaBruto = cbsBruto + ibsBruto;
    
    let impostoSeletivo = 0;
    if (categoria.impostoSeletivo) {
        impostoSeletivo = faturamento * categoria.impostoSeletivo;
        ivaBruto += impostoSeletivo;
    }
    
    const valorInsumos = faturamento * (dados.percentualInsumos / 100);
    let creditoInsumos = valorInsumos * (aliquotaTotal / 100);
    
    if (dados.setor.includes('servicos') && dados.setor !== 'energia' && dados.setor !== 'telecom') {
        creditoInsumos = creditoInsumos * LIMITE_CREDITO_SERVICOS;
    }
    
    const valorAtivo = faturamento * (dados.percentualAtivo / 100);
    const creditoAtivoTotal = valorAtivo * (aliquotaTotal / 100);
    const creditoAtivoMensal = creditoAtivoTotal / 48;
    
    const creditoTotal = creditoInsumos + creditoAtivoMensal;
    const ivaLiquido = Math.max(0, ivaBruto - creditoTotal);
    
    return {
        cenario: cenario.nome,
        aliquotaTotal,
        cbsAplicada,
        ibsAplicada,
        cbsBruto,
        ibsBruto,
        impostoSeletivo,
        ivaBruto,
        valorInsumos,
        creditoInsumos,
        valorAtivo,
        creditoAtivoMensal,
        creditoAtivoTotal,
        creditoTotal,
        ivaLiquido
    };
}

function calcularTransicao(dados, ano) {
    const transicao = TRANSICAO_DETALHADA[ano];
    const sistemaAtual = calcularSistemaAtualCorrigido(dados);
    const reforma = calcularIVADual(dados);
    
    let tributoAtualAjustado = sistemaAtual.total;
    if (ano >= 2027) {
        const pisCofinsMedio = dados.faturamento * 0.0365;
        tributoAtualAjustado = Math.max(0, sistemaAtual.total - pisCofinsMedio);
    }
    
    const cbsParcial = reforma.cbsBruto * transicao.cbs;
    const ibsParcial = (reforma.ibsBruto + reforma.impostoSeletivo) * transicao.ibs;
    const sistemaAntigoParcial = tributoAtualAjustado * transicao.sistemaAntigo;
    
    const creditoParcial = reforma.creditoTotal * Math.max(transicao.cbs, transicao.ibs);
    
    const tributoTotal = cbsParcial + ibsParcial + sistemaAntigoParcial - creditoParcial;
    
    return {
        tributoTotal: Math.max(0, tributoTotal),
        cbsParcial,
        ibsParcial,
        sistemaAntigoParcial,
        creditoParcial,
        transicao
    };
}
