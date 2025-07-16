import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Papa from 'papaparse';
import * as ss from 'simple-statistics';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

const indicatorDetails = {
  PAYEMS: { name: 'Nonfarm Payrolls', lag: 'Lagging', importance: '★★★' },
  UNRATE: { name: 'Unemployment Rate', lag: 'Lagging', importance: '★★★' },
  ICSA: { name: 'Initial Claims', lag: 'Leading', importance: '★★' },
  PCE: { name: 'Personal Consumption Expenditure', lag: 'Coincident', importance: '★★★' },
  RSXFS: { name: 'Retail Sales', lag: 'Coincident', importance: '★★★' },
  UMCSENT: { name: 'Consumer Sentiment', lag: 'Leading', importance: '★★' },
  CPIAUCSL: { name: 'Consumer Price Index', lag: 'Coincident', importance: '★★★' },
  PPIACO: { name: 'Producer Price Index', lag: 'Leading', importance: '★' },
  SP_500: { name: 'S&P 500 Index', lag: 'Leading', importance: '★★★' },
  NASDAQ_IXIC: { name: 'NASDAQ Index', lag: 'Leading', importance: '★★' },
  Dow_Jones_DJI: { name: 'Dow Jones Index', lag: 'Leading', importance: '★★' },
  VIX_Index: { name: 'Volatility Index (VIX)', lag: 'Leading', importance: '★' },
  US_Dollar_Index_DXY: { name: 'US Dollar Index', lag: 'Leading', importance: '★★' },
  Bitcoin_BTCUSD: { name: 'Bitcoin Price', lag: 'Unclassified', importance: '★' },
  FEDFUNDS: { name: 'Federal Funds Rate (Effective)', lag: 'Coincident-Lagging', importance: '★★★' },
  DFEDTARU: { name: 'Federal Funds Target Rate (Upper Bound)', lag: 'Lagging', importance: '★★★' },
  DGS2: { name: '2-Year Treasury Yield', lag: 'Leading', importance: '★★★' },
  US_10Y_Treasury_Yield_TNX: { name: '10Y Treasury Yield', lag: 'Leading', importance: '★★★' },
  US_13W_TBill_Rate_IRX: { name: '13W T-Bill Rate', lag: 'Leading', importance: '★★★' },
  US_30Y_Treasury_Yield_TYX: { name: '30Y Treasury Yield', lag: 'Leading', importance: '★★★' },
  Yield_Spread_10Y_minus_13W: { name: 'Yield Spread', lag: 'Leading', importance: '★★★' },
  M2SL: { name: 'M2 Money Supply', lag: 'Leading', importance: '★' },
  HHMSDODNS: { name: 'Household Mortgages', lag: 'Lagging', importance: '★' },
  HDTGPDUSQ163N: { name: 'Household Debt to GDP', lag: 'Lagging', importance: '★★' },
  TOTALSL: { name: 'Total Consumer Credit', lag: 'Lagging', importance: '★★' },
  BUSLOANS: { name: 'Commercial & Industrial Loans', lag: 'Lagging', importance: '★★' },
  PERMIT: { name: 'Building Permits', lag: 'Leading', importance: '★★' },
  HOUST: { name: 'Housing Starts', lag: 'Leading', importance: '★★' },
  MDSP: { name: 'Mortgage Debt Service', lag: 'Lagging', importance: '★' },
  WTI_Crude_Oil: { name: 'WTI Crude Oil', lag: 'Coincident', importance: '★★' },
  Brent_Crude_Oil: { name: 'Brent Crude Oil', lag: 'Coincident', importance: '★★' },
  Copper: { name: 'Copper Price', lag: 'Leading', importance: '★' },
  Gold: { name: 'Gold Price', lag: 'Leading', importance: '★' },
  Silver: { name: 'Silver Price', lag: 'Leading', importance: '★' },
  GDP: { name: 'Gross Domestic Product', lag: 'Lagging', importance: '★★★' },
  INDPRO: { name: 'Industrial Production', lag: 'Coincident', importance: '★★' },
  DGORDER: { name: 'Durable Goods Orders', lag: 'Leading', importance: '★★' },
  USDJPY: { name: 'USD/JPY Exchange Rate', lag: 'Leading', importance: '★★' }
};

export default function CorrelationPage() {
  const router = useRouter();
  const { indicators } = router.query;
  const [seriesNames, setSeriesNames] = useState([]);
  const [data, setData] = useState({});
  const [correlationMatrix, setCorrelationMatrix] = useState([]);
  const [sortedCorrelations, setSortedCorrelations] = useState([]);

  const allSeriesList = [
    'PAYEMS','UNRATE','ICSA','PCE','RSXFS','UMCSENT',
    'CPIAUCSL','PPIACO','S&P_500','NASDAQ_IXIC','Dow_Jones_DJI','VIX_Index','US_Dollar_Index_DXY','Bitcoin_BTCUSD',
    'FEDFUNDS','DFEDTARU','DGS2','US_10Y_Treasury_Yield_TNX','US_13W_TBill_Rate_IRX','US_30Y_Treasury_Yield_TYX','Yield_Spread_10Y_minus_13W','T10Y2Y',
    'PERMIT','HOUST','MDSP',
    'WTI_Crude_Oil','Brent_Crude_Oil','Copper','Gold','Silver',
    'GDP','INDPRO','DGORDER','USDJPY'
  ];

  useEffect(() => {
    const fetchData = async () => {
      const newData = {};
      const targetSeries = indicators ? indicators.split(',') : allSeriesList;

      for (const series of targetSeries) {
        try {
          const response = await fetch(`/${series}.csv`);
          const text = await response.text();
          const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
          const cleaned = parsed.data.map(d => ({
            date: d.date,
            value: parseFloat(d.value)
          })).filter(d => !isNaN(d.value));

          newData[series] = cleaned;
        } catch (err) {
          console.error(`Error loading ${series}:`, err);
        }
      }

      setData(newData);
      setSeriesNames(targetSeries);
    };

    fetchData();
  }, [indicators]);

  useEffect(() => {
    if (seriesNames.length === 0 || Object.keys(data).length === 0) return;

    const dateSet = {};
    seriesNames.forEach(s => {
      data[s]?.forEach(d => { dateSet[d.date] = true; });
    });
    const commonDates = Object.keys(dateSet).sort();

    const valueArrays = seriesNames.map(name => {
      const valueMap = {};
      data[name]?.forEach(d => { valueMap[d.date] = d.value; });
      return commonDates.map(date => valueMap[date] ?? null);
    });

    const matrix = valueArrays.map(arr1 =>
      valueArrays.map(arr2 => {
        const paired = arr1.map((v,i)=>[v,arr2[i]]).filter(([a,b])=>a!==null && b!==null);
        const x = paired.map(p=>p[0]);
        const y = paired.map(p=>p[1]);
        if (x.length<2) return 0;
        return ss.sampleCorrelation(x,y) || 0;
      })
    );

    const correlationsList = [];
    for (let i=0;i<seriesNames.length;i++){
      for (let j=i+1;j<seriesNames.length;j++){
        const corrValue = matrix[i][j];
        const a = seriesNames[i];
        const b = seriesNames[j];
        const aDetail = indicatorDetails[a] ? `${indicatorDetails[a].name} (${indicatorDetails[a].lag}, ${indicatorDetails[a].importance})` : a;
        const bDetail = indicatorDetails[b] ? `${indicatorDetails[b].name} (${indicatorDetails[b].lag}, ${indicatorDetails[b].importance})` : b;
        correlationsList.push({
          pair: `${a} & ${b}`,
          value: corrValue,
          description: `${aDetail} ↔ ${bDetail}`
        });
      }
    }
    correlationsList.sort((a,b)=>b.value-a.value);

    setCorrelationMatrix(matrix);
    setSortedCorrelations(correlationsList);
  }, [data, seriesNames]);

  return (
    <div style={{ padding:'20px', backgroundColor:'#111', color:'#fff', minHeight:'100vh' }}>
      <h1>Correlation Matrix (상관관계 분석)</h1>
      <p>
        {indicators
          ? `선택한 ${seriesNames.length}개 지표로 분석`
          : '모든 지표로 분석'}
      </p>

      <div style={{ marginBottom: 20 }}>
        <button
          onClick={() => router.push('/')}
          style={{ padding:'10px 20px', marginRight:'10px' }}
        >
          Index로 돌아가기
        </button>

        {indicators && (
          <button
            onClick={() =>
              router.push(`/custom?indicators=${encodeURIComponent(indicators)}`)
            }
            style={{ padding:'10px 20px', marginRight:'10px' }}
          >
            Custom으로 돌아가기
          </button>
        )}
      </div>

      {correlationMatrix.length > 0 && (
        <Plot
          data={[{
            z: correlationMatrix,
            x: seriesNames,
            y: seriesNames,
            type: 'heatmap',
            colorscale: 'RdBu',
            zmin: -1,
            zmax: 1
          }]}
          layout={{
            margin:{ l:150, t:50 },
            height:800,
            width:1000,
            paper_bgcolor:'#111',
            plot_bgcolor:'#111',
            font:{ color:'#fff' },
            title:'Correlation Heatmap'
          }}
        />
      )}

      {sortedCorrelations.length > 0 && (
        <div style={{ marginTop:40 }}>
          <h2>상관계수 목록 (내림차순)</h2>
          <table style={{ width:'100%', borderCollapse:'collapse', color:'#fff' }}>
            <thead>
              <tr>
                <th style={{ border:'1px solid #ccc', padding:'8px' }}>지표 쌍</th>
                <th style={{ border:'1px solid #ccc', padding:'8px' }}>상관계수</th>
                <th style={{ border:'1px solid #ccc', padding:'8px' }}>설명</th>
              </tr>
            </thead>
            <tbody>
              {sortedCorrelations.map((item, idx)=>(
                <tr key={idx}>
                  <td style={{ border:'1px solid #ccc', padding:'8px' }}>{item.pair}</td>
                  <td style={{ border:'1px solid #ccc', padding:'8px' }}>{item.value.toFixed(3)}</td>
                  <td style={{ border:'1px solid #ccc', padding:'8px' }}>{item.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
