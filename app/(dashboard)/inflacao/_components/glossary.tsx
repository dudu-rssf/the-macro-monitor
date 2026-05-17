import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const sections = [
  {
    title: 'Indices de Preco',
    items: [
      {
        term: 'IPCA',
        def: 'Indice Nacional de Precos ao Consumidor Amplo. Medido pelo IBGE, e o indice oficial de inflacao do Brasil e o utilizado pelo Banco Central para aferir o cumprimento da meta de inflacao.',
      },
      {
        term: 'IPCA-15',
        def: 'Versao previa do IPCA, divulgada ~15 dias antes do IPCA cheio. Apura preco da segunda quinzena do mes anterior ate a primeira do mes corrente. E um antecipador da tendencia inflacionaria.',
      },
      {
        term: 'INPC',
        def: 'Indice Nacional de Precos ao Consumidor. Tambem do IBGE, mas voltado a familias com renda de 1 a 5 salarios minimos. Tende a ser mais sensivel a alimentos e energia.',
      },
      {
        term: 'IGP-M',
        def: 'Indice Geral de Precos — Mercado, medido pela FGV. Composto por IPA-M (60%), IPC-M (30%) e INCC-M (10%). E amplamente utilizado em contratos de aluguel e tarifas de energia eletrica.',
      },
      {
        term: 'IGP-DI',
        def: 'Indice Geral de Precos — Disponibilidade Interna. Calculado pela FGV com a mesma metodologia do IGP-M, porem coletado no mes cheio (do dia 1 ao ultimo dia do mes).',
      },
      {
        term: 'IPA-M',
        def: 'Indice de Precos por Atacado — Mercado (FGV). Compoente majoritario do IGP-M (peso 60%). Mede preco no atacado e tende a antecipar o repasse ao consumidor com defasagem de 2 a 4 meses.',
      },
      {
        term: 'IPC-M',
        def: 'Indice de Precos ao Consumidor — Mercado (FGV). Peso de 30% no IGP-M. Mede a variacao de preco de uma cesta de consumo para familias com renda de 1 a 33 salarios minimos.',
      },
      {
        term: 'INCC-M',
        def: 'Indice Nacional do Custo da Construcao — Mercado (FGV). Peso de 10% no IGP-M. Monitora o custo do setor de construcao civil, incluindo materiais, mao de obra e servicos.',
      },
    ],
  },
  {
    title: 'Nucleos do IPCA',
    items: [
      {
        term: 'Nucleo por Medias Aparadas com Suavizacao',
        def: 'Exclui os 20% de itens com maior e menor variacao (caudas da distribuicao) e suaviza os demais ao longo de 12 meses para evitar volatilidade pontual. E o nucleo mais comumente acompanhado pelo BCB.',
      },
      {
        term: 'Nucleo por Medias Aparadas sem Suavizacao',
        def: 'Mesma logica de exclusao de caudas, mas sem o processo de suavizacao. Mais reativo ao momento corrente e util para capturar viradas de tendencia mais rapidamente.',
      },
      {
        term: 'Nucleo por Exclusao',
        def: 'Remove itens de alimentos no domicilio e energia (combustiveis e energia eletrica) do calculo, por serem excessivamente volateis e fora do controle da politica monetaria.',
      },
      {
        term: 'Nucleo por Dupla Ponderacao',
        def: 'Reduz o peso de itens com alta volatilidade de preco proporcional ao grau de volatilidade historica. Nao exclui itens completamente — apenas recalibra os pesos.',
      },
      {
        term: 'Nucleo P55',
        def: 'Calcula o percentil 55 da distribuicao de variacao de preco dos itens do IPCA. E um indicador robusto da tendencia central da inflacao, resistente a outliers.',
      },
    ],
  },
  {
    title: 'Outros Indicadores',
    items: [
      {
        term: 'Difusao do IPCA',
        def: 'Percentual de itens do IPCA que registraram alta de preco no mes. Valor acima de 50% indica que mais da metade dos itens subiu, sinalizando que a inflacao e disseminada — nao concentrada em poucos setores.',
      },
      {
        term: 'Meta de Inflacao',
        def: 'Definida pelo CMN para o IPCA. A meta atual e de 3,0% ao ano, com tolerancia de 1,5pp para cima (teto de 4,5%) e para baixo (piso de 1,5%). O BCB e considerado responsavel se o IPCA sair do intervalo.',
      },
    ],
  },
]

export function Glossary() {
  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-medium">Glossario</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 pb-6 px-4">
        <div className="space-y-6">
          {sections.map((section) => (
            <div key={section.title}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                {section.title}
              </h3>
              <dl className="space-y-3">
                {section.items.map((item) => (
                  <div key={item.term}>
                    <dt className="text-xs font-semibold text-foreground">{item.term}</dt>
                    <dd className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.def}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
