import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Papa from 'papaparse';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

const recessionPeriods = [
  { start: '1990-07-01', end: '1991-03-01' },
  { start: '2001-03-01', end: '2001-11-01' },
  { start: '2007-12-01', end: '2009-06-01' },
  { start: '2020-02-01', end: '2020-04-01' }
];

const fullNames = {
  PAYEMS: "All Employees: Total Nonfarm",
  UNRATE: "Unemployment Rate",
  ICSA: "Initial Claims",
  PCE: "Personal Consumption Expenditures",
  RSXFS: "Retail Sales",
  UMCSENT: "University of Michigan Consumer Sentiment",
  CPIAUCSL: "Consumer Price Index (CPI)",
  PPIACO: "Producer Price Index (PPI)",
  SP_500: "S&P 500 Index",
  NASDAQ_IXIC: "NASDAQ Composite Index",
  Dow_Jones_DJI: "Dow Jones Industrial Average",
  VIX_Index: "CBOE Volatility Index (VIX)",
  US_Dollar_Index_DXY: "US Dollar Index (DXY)",
  USDJPY: "USD/JPY Exchange Rate",
  Bitcoin_BTCUSD: "Bitcoin Price (BTC/USD)",
  DFEDTARU: "Federal Funds Target Rate (Upper Bound)",
  FEDFUNDS: "Federal Funds Rate",
  US_13W_TBill_Rate_IRX: "13-Week Treasury Bill Rate",
  DGS2: "2-Year Treasury Yield",
  US_10Y_Treasury_Yield_TNX: "10-Year Treasury Yield",
  US_30Y_Treasury_Yield_TYX: "30-Year Treasury Yield",
  Yield_Spread_10Y_minus_13W: "Yield Spread (10Y - 13W)",
  T10Y2Y: "Yield Spread (10Y - 2Y)",
  M2SL: "M2 Money Supply",
  HHMSDODNS: "Household Mortgages",
  HDTGPDUSQ163N: "Household Debt to GDP",
  TOTALSL: "Total Consumer Credit",
  BUSLOANS: "Commercial and Industrial Loans",
  PERMIT: "Housing Units Authorized by Building Permits",
  HOUST: "Housing Starts",
  MDSP: "Mortgage Debt Service Payments",
  WTI_Crude_Oil: "WTI Crude Oil Prices",
  Brent_Crude_Oil: "Brent Crude Oil Prices",
  Copper: "Copper Prices",
  Gold: "Gold Prices",
  Silver: "Silver Prices",
  GDP: "Gross Domestic Product (GDP)",
  INDPRO: "Industrial Production Index",
  DGORDER: "Manufacturers' New Orders: Durable Goods"
};

export default function CustomPage() {
  const router = useRouter();
  const { indicators } = router.query;
  const selected = indicators ? indicators.split(',').map(decodeURIComponent) : [];

  const [data, setData] = useState({});
  const [startDate, setStartDate] = useState('1900-01-01');
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  useEffect(() => {
    if (!router.isReady) return;
    if (router.query.start) {
      setStartDate(router.query.start);
    }
    if (router.query.end) {
      setEndDate(router.query.end);
    }
  }, [router.isReady, router.query.start, router.query.end]);

  useEffect(() => {
    if (!router.isReady) return;
    const fetchAll = async () => {
      const newData = {};
      for (const series of selected) {
        try {
          const response = await fetch(`/${encodeURIComponent(series)}.csv`);
          if (!response.ok) continue;
          const text = await response.text();
          const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
          const cleaned = parsed.data
            .map(d => ({
              date: d.DATE || d.date,
              value: parseFloat(d.VALUE || d.value),
            }))
            .filter(d => d.date && !isNaN(d.value));
          newData[series] = cleaned;
        } catch (err) {
          console.error(`❌ ${series} 로딩 오류:`, err);
        }
      }
      setData(newData);
    };
    if (selected.length > 0) fetchAll();
  }, [router.isReady, indicators]);

  const handleQuickFilter = (period) => {
    const end = new Date();
    let start;
    switch (period) {
      case '1W': start = new Date(end); start.setDate(end.getDate() - 7); break;
      case '1M': start = new Date(end); start.setMonth(end.getMonth() - 1); break;
      case '6M': start = new Date(end); start.setMonth(end.getMonth() - 6); break;
      case '1Y': start = new Date(end); start.setFullYear(end.getFullYear() - 1); break;
      case '2Y': start = new Date(end); start.setFullYear(end.getFullYear() - 2); break;
      case '5Y': start = new Date(end); start.setFullYear(end.getFullYear() - 5); break;
      case '10Y': start = new Date(end); start.setFullYear(end.getFullYear() - 10); break;
      case '25Y': start = new Date(end); start.setFullYear(end.getFullYear() - 25); break;
      case 'ALL': start = new Date('1900-01-01'); break;
      default: start = new Date(end); start.setFullYear(end.getFullYear() - 1);
    }
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  const goToCorrelation = () => {
    if (selected.length === 0) {
      alert('Choose an indicator!');
      return;
    }
    router.push(`/correlation?indicators=${selected.map(encodeURIComponent).join(',')}`);
  };

  return (
    <div style={{ padding: 20, background: '#111', color: '#fff', minHeight: '100vh' }}>
      <h1>Selected Indicator</h1>
      <div style={{ marginBottom: 20 }}>
        <button onClick={() => router.push('/')} style={{ padding: '10px 20px', marginRight: '10px' }}>
          Index
        </button>
        <button onClick={goToCorrelation} style={{ padding: '10px 20px' }}>
          Correlation Matrix
        </button>
      </div>

      <div style={{ marginBottom: 20 }}>
        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
      </div>

      <div>
        {['1W', '1M', '6M', '1Y', '2Y', '5Y', '10Y', '25Y', 'ALL'].map(p => (
          <button key={p} onClick={() => handleQuickFilter(p)} style={{ margin: '5px', padding: '5px 10px' }}>
            {p}
          </button>
        ))}
      </div>

      {selected.map(series => {
        const seriesData = data[series] || [];
        const filtered = seriesData.filter(d => {
          const date = new Date(d.date);
          return date >= new Date(startDate) && date <= new Date(endDate);
        });

        const shapes = recessionPeriods
          .filter(p => new Date(p.end) >= new Date(startDate) && new Date(p.start) <= new Date(endDate))
          .map(p => ({
            type: 'rect',
            xref: 'x',
            yref: 'paper',
            x0: p.start,
            x1: p.end,
            y0: 0,
            y1: 1,
            fillcolor: 'rgba(128,128,128,0.3)',
            line: { width: 0 }
          }));

        return (
          <div key={series} style={{ marginTop: 20 }}>
            <h3>{fullNames[series] || series}</h3>
            {filtered.length === 0 ? (
              <p>No data</p>
            ) : (
              <Plot
                data={[
                  {
                    x: filtered.map(d => d.date),
                    y: filtered.map(d => d.value),
                    type: 'scatter',
                    mode: 'lines',
                    line: { width: 2 }
                  }
                ]}
                layout={{
                  margin: { l: 30, r: 30, t: 20, b: 30 },
                  height: 300,
                  plot_bgcolor: '#111',
                  paper_bgcolor: '#111',
                  font: { color: '#fff' },
                  shapes: shapes,
                  xaxis: { range: [startDate, endDate], showgrid: false },
                  yaxis: { showgrid: false },
                  hovermode: 'x unified'
                }}
                useResizeHandler
                style={{ width: '100%' }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
