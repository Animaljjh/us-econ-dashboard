import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Papa from 'papaparse';
import * as ss from 'simple-statistics';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

const sectors = {
  Employment: ['PAYEMS', 'UNRATE', 'ICSA'],
  Consumption: ['PCE', 'RSXFS', 'UMCSENT'],
  Inflation: ['CPIAUCSL', 'PPIACO'],
  FinancialMarket: ['S&P_500', 'NASDAQ_IXIC', 'Dow_Jones_DJI', 'VIX_Index', 'US_Dollar_Index_DXY', 'USDJPY', 'Bitcoin_BTCUSD'],
  InterestRates: ['DFEDTARU', 'FEDFUNDS', 'US_13W_TBill_Rate_IRX', 'DGS2', 'US_10Y_Treasury_Yield_TNX', 'US_30Y_Treasury_Yield_TYX', 'Yield_Spread_10Y_minus_13W', 'T10Y2Y'],
  Credit: ['M2SL', 'HHMSDODNS', 'HDTGPDUSQ163N', 'TOTALSL', 'BUSLOANS'],
  RealEstate: ['PERMIT', 'HOUST', 'MDSP'],
  Commodities: ['WTI_Crude_Oil', 'Brent_Crude_Oil', 'Copper', 'Gold', 'Silver'],
  Growth: ['GDP', 'INDPRO', 'DGORDER']
};

const cycles = {
  Leading: ['T10Y2Y', 'UMCSENT', 'PERMIT', 'HOUST', 'DGORDER', 'S&P_500', 'VIX_Index'],
  Coincident: ['PAYEMS', 'UNRATE', 'ICSA', 'PCE', 'RSXFS', 'INDPRO', 'GDP'],
  Lagging: ['CPIAUCSL', 'PPIACO', 'FEDFUNDS', 'M2SL', 'TOTALSL', 'HDTGPDUSQ163N', 'WTI_Crude_Oil', 'Gold', 'Silver', 'US_Dollar_Index_DXY', 'USDJPY']
};

const fullNames = {
  PAYEMS: "All Employees: Total Nonfarm",
  UNRATE: "Unemployment Rate",
  ICSA: "Initial Claims",
  PCE: "Personal Consumption Expenditures",
  RSXFS: "Retail Sales",
  UMCSENT: "University of Michigan Consumer Sentiment",
  CPIAUCSL: "Consumer Price Index",
  PPIACO: "Producer Price Index",
  "S&P_500": "S&P 500 Index",
  NASDAQ_IXIC: "NASDAQ Composite Index",
  Dow_Jones_DJI: "Dow Jones Industrial Average",
  VIX_Index: "CBOE Volatility Index",
  US_Dollar_Index_DXY: "US Dollar Index",
  USDJPY: "USD/JPY Exchange Rate",
  Bitcoin_BTCUSD: "Bitcoin Price",
  DFEDTARU: "Federal Funds Target Rate (Upper Bound)",
  FEDFUNDS: "Federal Funds Rate",
  US_13W_TBill_Rate_IRX: "13-Week Treasury Bill Rate",
  DGS2: "2-Year Treasury Yield",
  US_10Y_Treasury_Yield_TNX: "10-Year Treasury Yield",
  US_30Y_Treasury_Yield_TYX: "30-Year Treasury Yield",
  Yield_Spread_10Y_minus_13W: "Yield Spread (10Y-13W)",
  T10Y2Y: "Yield Spread (10Y-2Y)",
  M2SL: "M2 Money Supply",
  HHMSDODNS: "Household Mortgages",
  HDTGPDUSQ163N: "Household Debt to GDP",
  TOTALSL: "Total Consumer Credit",
  BUSLOANS: "Commercial & Industrial Loans",
  PERMIT: "Building Permits",
  HOUST: "Housing Starts",
  MDSP: "Mortgage Debt Service",
  WTI_Crude_Oil: "WTI Crude Oil",
  Brent_Crude_Oil: "Brent Crude Oil",
  Copper: "Copper",
  Gold: "Gold",
  Silver: "Silver",
  GDP: "Gross Domestic Product",
  INDPRO: "Industrial Production",
  DGORDER: "Durable Goods Orders"
};

// ✅ 월별 리샘플링 함수
function resampleMonthly(seriesData, method = 'last') {
  const grouped = {};
  seriesData.forEach(d => {
    const ym = d.date.slice(0, 7); // YYYY-MM
    if (!grouped[ym]) grouped[ym] = [];
    grouped[ym].push(d.value);
  });

  const result = [];
  for (const ym in grouped) {
    let agg;
    if (method === 'last') {
      agg = grouped[ym][grouped[ym].length - 1];
    } else {
      const arr = grouped[ym];
      agg = arr.reduce((a, b) => a + b, 0) / arr.length;
    }
    result.push({ date: ym + '-01', value: agg });
  }

  result.sort((a, b) => new Date(a.date) - new Date(b.date));
  return result;
}

// ✅ 발표 주기별 그룹
const monthlySeries = [
  'PCE','RSXFS','UMCSENT','CPIAUCSL','PPIACO',
  'PERMIT','HOUST','GDP','INDPRO','DGORDER',
  'M2SL','TOTALSL','HDTGPDUSQ163N','HHMSDODNS','MDSP','BUSLOANS'
];
const weeklySeries = [
  'ICSA'
];
const dailySeries = [
  'S&P_500','NASDAQ_IXIC','Dow_Jones_DJI','VIX_Index','US_Dollar_Index_DXY',
  'USDJPY','Bitcoin_BTCUSD','WTI_Crude_Oil','Brent_Crude_Oil','Gold','Silver',
  'DGS2','US_10Y_Treasury_Yield_TNX','US_30Y_Treasury_Yield_TYX','US_13W_TBill_Rate_IRX',
  'T10Y2Y','Yield_Spread_10Y_minus_13W','FEDFUNDS','DFEDTARU','PAYEMS','UNRATE'
];

export default function CorrelationPage() {
  const router = useRouter();
  const { indicators } = router.query;
  const [seriesNames, setSeriesNames] = useState([]);
  const [data, setData] = useState({});
  const [correlationMatrix, setCorrelationMatrix] = useState([]);
  const [sortedCorrelations, setSortedCorrelations] = useState([]);
  const [filterMode, setFilterMode] = useState('sector');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedMode = localStorage.getItem('filterMode');
      if (savedMode) setFilterMode(savedMode);
      const savedStart = localStorage.getItem('startDate');
      if (savedStart) setStartDate(new Date(savedStart));
      const savedEnd = localStorage.getItem('endDate');
      if (savedEnd) setEndDate(new Date(savedEnd));
    }
  }, []);

  useEffect(() => {
    let baseList = [];
    if (indicators) {
      baseList = indicators.split(',');
    } else {
      if (filterMode === 'sector') {
        baseList = Object.values(sectors).flat();
      } else {
        baseList = Object.values(cycles).flat();
      }
    }
    baseList = [...new Set(baseList)];
    setSeriesNames(baseList);

    const fetchData = async () => {
      const newData = {};
      for (const series of baseList) {
        try {
          const res = await fetch(`/${series}.csv`);
          const txt = await res.text();
          const parsed = Papa.parse(txt, { header: true, skipEmptyLines: true });
          let cleaned = parsed.data
            .map(d => ({ date: d.date, value: parseFloat(d.value) }))
            .filter(d => !isNaN(d.value));

          // 📌 주기별 리샘플링
          if (monthlySeries.includes(series) || weeklySeries.includes(series)) {
            cleaned = resampleMonthly(cleaned, 'mean'); // 월평균
          } else if (dailySeries.includes(series)) {
            cleaned = resampleMonthly(cleaned, 'last'); // 월말
          }

          // 📌 기간 필터링
          if (startDate && endDate) {
            cleaned = cleaned.filter(row => {
              const dt = new Date(row.date);
              return dt >= startDate && dt <= endDate;
            });
          }

          newData[series] = cleaned;
        } catch (e) {
          console.error('load error', series, e);
        }
      }
      setData(newData);
    };
    if (baseList.length > 0) fetchData();
  }, [indicators, filterMode, startDate, endDate]);

  useEffect(() => {
    if (seriesNames.length === 0 || Object.keys(data).length === 0) return;

    // 📌 공통 날짜
    let common = null;
    seriesNames.forEach(name => {
      const dates = data[name]?.map(d => d.date) || [];
      if (common === null) common = new Set(dates);
      else common = new Set([...common].filter(x => dates.includes(x)));
    });
    const commonDates = common ? [...common].sort((a,b)=>new Date(a)-new Date(b)) : [];

    const valueArrays = seriesNames.map(name => {
      const valueMap = {};
      data[name]?.forEach(d => { valueMap[d.date] = d.value; });
      return commonDates.map(date => valueMap[date] ?? null);
    });

    const matrix = valueArrays.map(arr1 =>
      valueArrays.map(arr2 => {
        const paired = arr1.map((v,i)=>[v,arr2[i]]).filter(([a,b])=>a!=null && b!=null);
        const x = paired.map(p=>p[0]);
        const y = paired.map(p=>p[1]);
        if (x.length < 2) return 0;
        return ss.sampleCorrelation(x,y) || 0;
      })
    );

    const list = [];
    for (let i=0;i<seriesNames.length;i++) {
      for (let j=i+1;j<seriesNames.length;j++) {
        const corrValue = matrix[i][j];
        const a = seriesNames[i];
        const b = seriesNames[j];
        const aLabel = fullNames[a] ? `${fullNames[a]} (${a})` : a;
        const bLabel = fullNames[b] ? `${fullNames[b]} (${b})` : b;
        list.push({ pair:`${a}&${b}`, description:`${aLabel} ↔ ${bLabel}`, value:corrValue });
      }
    }
    list.sort((a,b)=>b.value-a.value);
    setCorrelationMatrix(matrix);
    setSortedCorrelations(list);
  }, [data, seriesNames]);

  return (
    <div style={{ padding:'20px', backgroundColor:'#111', color:'#fff', minHeight:'100vh' }}>
      <h1>Correlation Matrix (상관관계 분석)</h1>
      <p>
        {indicators
          ? `선택한 ${seriesNames.length}개 지표로 분석`
          : `현재 모드(${filterMode})의 ${seriesNames.length}개 지표로 분석`}
        {startDate && endDate && (
          <span> ({startDate.toISOString().split('T')[0]} ~ {endDate.toISOString().split('T')[0]})</span>
        )}
      </p>

      <div style={{ marginBottom:20 }}>
        <button onClick={()=>router.back()} style={{ padding:'10px 20px', marginRight:'10px' }}>← 이전 페이지로</button>
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
            margin: { l:150, t:50 },
            height: 800,
            width: 1000,
            paper_bgcolor: '#111',
            plot_bgcolor: '#111',
            font: { color: '#fff' },
            title: 'Correlation Heatmap'
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
              </tr>
            </thead>
            <tbody>
              {sortedCorrelations.map((item,idx)=>(
                <tr key={idx}>
                  <td style={{ border:'1px solid #ccc', padding:'8px' }}>{item.description}</td>
                  <td style={{ border:'1px solid #ccc', padding:'8px' }}>{item.value.toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
