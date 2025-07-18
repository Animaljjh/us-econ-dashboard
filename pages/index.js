import { useState, useEffect, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Papa from 'papaparse';
import { useRouter } from 'next/router';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

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
  "S&P_500": "S&P 500 Index",
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

const newsKeywords = {
  PAYEMS: "nonfarm payrolls OR US employment report OR total nonfarm jobs",
  UNRATE: "US unemployment rate OR jobless rate OR labor market",
  ICSA: "US initial jobless claims OR unemployment claims OR weekly jobless data",
  PCE: "personal consumption expenditures OR US consumer spending OR PCE inflation",
  RSXFS: "US retail sales OR retail spending OR consumer sales",
  UMCSENT: "University of Michigan consumer sentiment OR consumer confidence index OR sentiment survey",
  CPIAUCSL: "US CPI OR consumer price index OR inflation data OR CPI inflation",
  PPIACO: "US PPI OR producer price index OR wholesale prices",
  "S&P_500": "S&P 500 OR stock market index OR SP500",
  NASDAQ_IXIC: "NASDAQ index OR NASDAQ composite OR tech stocks",
  Dow_Jones_DJI: "Dow Jones OR DJIA OR Dow index",
  VIX_Index: "VIX OR volatility index OR fear gauge",
  US_Dollar_Index_DXY: "US Dollar Index OR DXY OR dollar strength",
  USDJPY: "USD JPY exchange rate OR dollar yen OR USDJPY",
  Bitcoin_BTCUSD: "Bitcoin price OR BTCUSD OR cryptocurrency",
  DFEDTARU: "Federal funds target rate OR Fed interest rate upper bound",
  FEDFUNDS: "Federal funds rate OR Fed rate OR benchmark rate",
  US_13W_TBill_Rate_IRX: "13 week T-bill rate OR treasury bill yield OR 3 month treasury",
  DGS2: "2 year treasury yield OR 2y bond yield OR short term yields",
  US_10Y_Treasury_Yield_TNX: "10 year treasury yield OR 10y bond yield OR long term yields",
  US_30Y_Treasury_Yield_TYX: "30 year treasury yield OR 30y bond yield OR long term rates",
  Yield_Spread_10Y_minus_13W: "yield spread OR 10 year 3 month OR treasury curve",
  T10Y2Y: "yield curve inversion OR 10 year 2 year treasury spread OR yield curve 10y 2y OR US treasury spread",
  M2SL: "M2 money supply OR broad money OR US money stock",
  HHMSDODNS: "household mortgages OR mortgage debt OR home loans",
  HDTGPDUSQ163N: "household debt to GDP OR US household leverage",
  TOTALSL: "total consumer credit OR credit outstanding OR consumer debt",
  BUSLOANS: "commercial and industrial loans OR business lending OR bank loans",
  PERMIT: "building permits OR housing permits OR construction permits",
  HOUST: "housing starts OR home construction OR new housing units",
  MDSP: "mortgage debt service OR mortgage payments OR housing debt burden",
  WTI_Crude_Oil: "WTI crude oil prices OR West Texas Intermediate OR oil futures",
  Brent_Crude_Oil: "Brent crude oil prices OR Brent futures OR global oil prices",
  Copper: "copper prices OR copper futures OR industrial metals",
  Gold: "gold prices OR gold futures OR safe haven gold",
  Silver: "silver prices OR silver futures OR precious metals",
  GDP: "US GDP OR gross domestic product OR economic growth",
  INDPRO: "industrial production OR factory output OR manufacturing index",
  DGORDER: "durable goods orders OR manufacturers new orders OR factory orders"
};

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

// 🟢 Plot 컴포넌트를 별도로 정의
function IndicatorPlot({ series, filtered, fixedLines, activeColor, comparePanel, handlePlotClick, handlePlotClickErase, isNewsActive, handleNewsClick, noteSelectMode, handleNoteClick, startDate, endDate, xRange, setXRange }) {
  // 각 Plot 마다 임시 선 상태를 관리
  const [localTempLineX, setLocalTempLineX] = useState(null);

  const shapes = useMemo(() => {
    return [
      ...recessionPeriods
        .filter(p => new Date(p.end) >= new Date(filtered[0]?.date || '1900-01-01') && new Date(p.start) <= new Date(filtered[filtered.length - 1]?.date || '2100-01-01'))
        .map(p => ({
          type: 'rect', xref: 'x', yref: 'paper', x0: p.start, x1: p.end,
          y0: 0, y1: 1, fillcolor: 'rgba(128,128,128,0.3)', line: { width: 0 }
        })),
      ...fixedLines.map(l => ({
        type: 'line', x0: l.x, x1: l.x, y0: 0, y1: 1, xref: 'x', yref: 'paper',
        line: { color: l.color === 'blue' ? '#00f' : l.color === 'red' ? '#f00' : l.color === 'yellow' ? '#ff0' : '#0f0', width: 2 }
      })),
      ...(localTempLineX && activeColor && activeColor !== 'eraser'
        ? [{
          type: 'line', x0: localTempLineX, x1: localTempLineX, y0: 0, y1: 1,
          xref: 'x', yref: 'paper',
          line: { color: activeColor === 'blue' ? '#00f' : activeColor === 'red' ? '#f00' : activeColor === 'yellow' ? '#ff0' : '#0f0', width: 1, dash: 'dot' }
        }]
        : [])
    ];
  }, [fixedLines, localTempLineX, activeColor, filtered]);

  return (
    <Plot
      data={[
        { x: filtered.map(d => d.date), y: filtered.map(d => d.value), type: 'scatter', mode: 'lines', line: { width: 2 } }
      ]}
      layout={{
        margin: { l: 30, r: 30, t: 20, b: 30 },
        height: 300,
        plot_bgcolor: '#111',
        paper_bgcolor: '#111',
        font: { color: '#fff' },
        shapes: shapes,
        xaxis: {
          showgrid: false,
          range: xRange || [
            new Date(startDate).toISOString().split('T')[0],
            new Date(endDate).toISOString().split('T')[0]
          ]
        },
        yaxis: { showgrid: false },
        hovermode: 'x unified',
        uirevision: series
      }}
      useResizeHandler
      style={{ width: '100%' }}
      onRelayout={(event) => {
        if (event['xaxis.autorange']) {
          // 🔥 더블클릭으로 줌 리셋 → 이 그래프의 xRange 초기화
          setXRange(null);
        } else if (event['xaxis.range[0]'] && event['xaxis.range[1]']) {
          // 🔥 일반적인 줌 → xRange 저장
          setXRange([event['xaxis.range[0]'], event['xaxis.range[1]']]);
        }
      }}
      onHover={e => {
        if (comparePanel && activeColor && activeColor !== 'eraser') {
          setLocalTempLineX(e.points[0].x);
        }
      }}
      onUnhover={() => setLocalTempLineX(null)}
      onClick={e => {
        if (noteSelectMode) {
          handleNoteClick(e.points[0].x, series);
          return;
        }
        if (comparePanel) {
          if (activeColor === 'eraser') { handlePlotClickErase(e); }
          else if (activeColor) { handlePlotClick(e); }
        }
        if (isNewsActive) {
          handleNewsClick(e.points[0].x, series);
        }
      }}
    />
  );
}

export default function Home() {
  const router = useRouter();
  const [data, setData] = useState({});
  const [selectedIndicators, setSelectedIndicators] = useState([]);
  const [filterMode, setFilterMode] = useState('sector');
  const [newsMode, setNewsMode] = useState(null);
  const [filterPanel, setFilterPanel] = useState(false);

  const [startDate, setStartDate] = useState(new Date('2006-01-01'));
  const [endDate, setEndDate] = useState(new Date('2012-12-31'));
  const [xRanges, setXRanges] = useState({});
  const [startStep, setStartStep] = useState('year');
  const [endStep, setEndStep] = useState('year');
  const startPickerRef = useRef(null);
  const endPickerRef = useRef(null);

  const [comparePanel, setComparePanel] = useState(false);
  const [noteSelectMode, setNoteSelectMode] = useState(false);
  const [activeColor, setActiveColor] = useState(null);
  const [fixedLines, setFixedLines] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('fixedLines');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
  // ✅ 모든 지표에서 공통 날짜 범위를 계산해서 globalDates로 저장
  const [globalDates, setGlobalDates] = useState([]);

  useEffect(() => {
    const savedStartDate = localStorage.getItem('startDate');
    if (savedStartDate) setStartDate(new Date(savedStartDate));

    const savedEndDate = localStorage.getItem('endDate');
    if (savedEndDate) setEndDate(new Date(savedEndDate));

    const savedFilterMode = localStorage.getItem('filterMode');
    if (savedFilterMode) setFilterMode(savedFilterMode);

    const savedComparePanel = localStorage.getItem('comparePanel');
    if (savedComparePanel) setComparePanel(JSON.parse(savedComparePanel));

    const savedNoteSelectMode = localStorage.getItem('noteSelectMode');
    if (savedNoteSelectMode) setNoteSelectMode(JSON.parse(savedNoteSelectMode));

    const savedSelectedIndicators = localStorage.getItem('selectedIndicators');
    if (savedSelectedIndicators) setSelectedIndicators(JSON.parse(savedSelectedIndicators));
  }, []);

  // ✅ 상태 변경 시 로컬스토리지에 저장
  useEffect(() => {
    localStorage.setItem('startDate', startDate.toISOString());
  }, [startDate]);

  useEffect(() => {
    localStorage.setItem('endDate', endDate.toISOString());
  }, [endDate]);

  useEffect(() => {
    localStorage.setItem('filterMode', filterMode);
  }, [filterMode]);

  useEffect(() => {
    localStorage.setItem('comparePanel', JSON.stringify(comparePanel));
  }, [comparePanel]);

  useEffect(() => {
    localStorage.setItem('noteSelectMode', JSON.stringify(noteSelectMode));
  }, [noteSelectMode]);

  useEffect(() => {
    localStorage.setItem('selectedIndicators', JSON.stringify(selectedIndicators));
  }, [selectedIndicators]);


  useEffect(() => {
    if (!data || Object.keys(data).length === 0) return;

    let allDates = [];
    Object.values(data).forEach(arr => {
      allDates = allDates.concat(arr.map(d => d.date));
    });

    // 중복 제거 후 정렬
    allDates = [...new Set(allDates)].sort((a, b) => new Date(a) - new Date(b));
    setGlobalDates(allDates);
  }, [data]);


  const colorOptions = [
    { name: 'blue', code: '#00f' },
    { name: 'red', code: '#f00' },
    { name: 'yellow', code: '#ff0' },
    { name: 'green', code: '#0f0' }
  ];

  // 1) 데이터 fetch
  useEffect(() => {
    const fetchAllCSVs = async () => {
      const newData = {};
      const allKeys = new Set([...Object.values(sectors).flat(), ...Object.values(cycles).flat()]);
      for (const series of allKeys) {
        try {
          const res = await fetch(`/${series}.csv`);
          const txt = await res.text();
          const parsed = Papa.parse(txt, { header: true, skipEmptyLines: true });
          const cleaned = parsed.data
            .map(d => ({
              date: new Date(d.date).toISOString().split('T')[0], // ✅ 날짜를 UTC ISO로 통일
              value: parseFloat(d.value)
            }))
            .filter(d => !isNaN(d.value));
          newData[series] = cleaned;
        } catch (e) {
          console.error('load error', series, e);
        }
      }
      setData(newData);
    };
    fetchAllCSVs();
  }, []);

  // 2) fixedLines가 바뀔 때마다 저장
  useEffect(() => {
    localStorage.setItem('fixedLines', JSON.stringify(fixedLines));
  }, [fixedLines]);

  // 3) 첫 로드 시 기존 기둥 불러오기
  useEffect(() => {
    const saved = localStorage.getItem('fixedLines');
    if (saved) {
      setFixedLines(JSON.parse(saved));
    }
  }, []);


  const handleStartChange = (date) => {
    if (startStep === 'year') {
      const newDate = new Date(startDate);
      newDate.setFullYear(date.getFullYear());
      setStartDate(newDate);
      setStartStep('month');
      setTimeout(() => startPickerRef.current?.setOpen(true), 0);
    } else if (startStep === 'month') {
      const newDate = new Date(startDate);
      newDate.setMonth(date.getMonth());
      setStartDate(newDate);
      setStartStep('day');
      setTimeout(() => startPickerRef.current?.setOpen(true), 0);
    } else {
      setStartDate(date);
      setStartStep('year');
    }
  };

  const handleEndChange = (date) => {
    if (endStep === 'year') {
      const newDate = new Date(endDate);
      newDate.setFullYear(date.getFullYear());
      setEndDate(newDate);
      setEndStep('month');
      setTimeout(() => endPickerRef.current?.setOpen(true), 0);
    } else if (endStep === 'month') {
      const newDate = new Date(endDate);
      newDate.setMonth(date.getMonth());
      setEndDate(newDate);
      setEndStep('day');
      setTimeout(() => endPickerRef.current?.setOpen(true), 0);
    } else {
      setEndDate(date);
      setEndStep('year');
    }
  };

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
    setStartDate(start);
    setEndDate(end);
  };

  const toggleSelect = (series) => {
    setSelectedIndicators(prev =>
      prev.includes(series) ? prev.filter(s => s !== series) : [...prev, series]
    );
  };

  const goToCustom = () => {
    if (selectedIndicators.length === 0) {
      alert('하나 이상 선택하세요!');
      return;
    }
    const start = startDate.toISOString().split('T')[0];
    const end = endDate.toISOString().split('T')[0];
    const url = `/custom?indicators=${selectedIndicators.map(encodeURIComponent).join(',')}&start=${start}&end=${end}`;
    window.open(url, '_blank');   // 🔥 새탭으로 열기
  };

  const handleColorClick = (color) => {
    if (activeColor === color) {
      setFixedLines(prev => prev.filter(l => l.color !== color));
      setActiveColor(null);
      setTimeout(() => setActiveColor(color), 0);
    } else {
      setActiveColor(color);
    }
  };

  const handleNoteClick = (dateValue, series) => {
    const isoDate = new Date(dateValue).toISOString().split('T')[0];
    const mode = localStorage.getItem('currentMode') || filterMode;

    // 🔎 fixedLines에서 날짜 색상 찾기
    const foundBar = fixedLines.find(l => {
      const cleanX = l.x.includes('T') ? l.x.split('T')[0] : l.x;
      return cleanX === isoDate;
    });

    if (!foundBar) {
      alert('기둥을 먼저 선택하세요!');
      return;
    }

    // ✅ 현재 모드의 지표 리스트 불러오기
    const currentIndicators =
      JSON.parse(localStorage.getItem('currentIndicators')) ||
      Object.values(mode === 'sector' ? sectors : cycles).flat();

    // ✅ 현재 데이터에서 값 추출 (없으면 직전값)
    const row = {};
    currentIndicators.forEach(ind => {
      const arr = data[ind] || [];
      let found = arr.find(d => d.date.startsWith(isoDate));
      if (!found) {
        const past = arr.filter(d => new Date(d.date) < new Date(isoDate));
        if (past.length > 0) {
          past.sort((a, b) => new Date(b.date) - new Date(a.date));
          found = past[0];
        }
      }
      row[ind] = found ? found.value : '';
    });

    // 🔥 기존 저장된 matrix 불러오기
    const matrixKey = `noteMatrix_${mode}`;
    const currentMatrix = JSON.parse(localStorage.getItem(matrixKey)) || {};

    // 🔥 색과 clickedIndicator를 반영한 새로운 matrix
    const updatedMatrix = {
      ...currentMatrix,
      [isoDate]: {
        ...(currentMatrix[isoDate] || {}),
        color:
          foundBar.color === 'blue' ? '#00f' :
            foundBar.color === 'red' ? '#f00' :
              foundBar.color === 'yellow' ? '#ff0' :
                foundBar.color === 'green' ? '#0f0' : '#fff',
        clickedIndicator: series,
        indicators: {
          ...(currentMatrix[isoDate]?.indicators || {}),
          ...row
        },
        memo: currentMatrix[isoDate]?.memo || ''
      }
    };

    // ✅ 임시로 sessionStorage에만 반영 (NotePage에서 우선 읽도록)
    sessionStorage.setItem(matrixKey, JSON.stringify(updatedMatrix));

    // 👉 노트 페이지 열기
    window.open(`/note?date=${isoDate}&series=${encodeURIComponent(series)}`, '_blank');
  };




  const handlePlotClickErase = (e) => {
    const xValue = e.points[0].x.includes('T') ? e.points[0].x.split('T')[0] : e.points[0].x;
    setFixedLines(prev => prev.filter(l => l.x !== xValue));
  };

  const handleNewsClick = (xValue, series) => {
    const clickedDate = new Date(xValue);

    // 🔥 앞뒤 4일 범위
    const minDateObj = new Date(clickedDate);
    minDateObj.setDate(minDateObj.getDate() - 4);

    const maxDateObj = new Date(clickedDate);
    maxDateObj.setDate(maxDateObj.getDate() + 4);

    const minDate = `${(minDateObj.getMonth() + 1).toString().padStart(2, '0')}/${minDateObj.getDate().toString().padStart(2, '0')}/${minDateObj.getFullYear()}`;
    const maxDate = `${(maxDateObj.getMonth() + 1).toString().padStart(2, '0')}/${maxDateObj.getDate().toString().padStart(2, '0')}/${maxDateObj.getFullYear()}`;

    const keyword = newsKeywords[series] || fullNames[series] || series;
    const url = `https://www.google.com/search?q=${encodeURIComponent(keyword)}&tbs=cdr:1,cd_min:${encodeURIComponent(minDate)},cd_max:${encodeURIComponent(maxDate)}`;
    window.open(url, '_blank');
    setNewsMode(null);
  };

  // ✅ 플롯 클릭 시 기둥 추가
  const handlePlotClick = (e, seriesData, series) => {
    if (!activeColor || activeColor === 'eraser') return;

    // 현재 모드를 저장 (sector/cycle/custom 구분)
    localStorage.setItem('currentMode', filterMode);

    const isoDate = e.points[0].x.includes('T') ? e.points[0].x.split('T')[0] : e.points[0].x;
    setFixedLines(prev => [...prev, { x: isoDate, color: activeColor }]);
    const valueAtDate = seriesData.find(d => d.date.startsWith(isoDate))?.value ?? '';

  };


  const toggleComparePanel = () => {
    if (comparePanel) {
      setActiveColor(null);
    }
    setComparePanel(!comparePanel);
  };

  const currentGroups = filterMode === 'sector' ? sectors : cycles;

  return (
    <div style={{ padding: 20, background: '#111', color: '#fff', minHeight: '100vh' }}>
      <h1 style={{ fontSize: 32, fontWeight: 'bold', marginBottom: 20 }}>US Economic Dashboard</h1>

      <button
        onClick={() => window.open('/note', '_blank')}
        style={{
          marginBottom: '20px',
          padding: '10px 20px',
          background: '#0a84ff',
          color: '#fff',
          border: 'none',
          borderRadius: '6px',
          fontWeight: 'bold',
          cursor: 'pointer'
        }}
      >
        📒 노트 보기
      </button>

      <div style={{ display: 'flex', gap: 40, marginBottom: 20 }}>
        <div>
          <h4>시작일</h4>
          <DatePicker
            ref={startPickerRef}
            selected={startDate}
            onChange={handleStartChange}
            showYearPicker={startStep === 'year'}
            showMonthYearPicker={startStep === 'month'}
            dateFormat="yyyy-MM-dd"
            className="p-2 rounded text-black"
          />
        </div>
        <div>
          <h4>종료일</h4>
          <DatePicker
            ref={endPickerRef}
            selected={endDate}
            onChange={handleEndChange}
            showYearPicker={endStep === 'year'}
            showMonthYearPicker={endStep === 'month'}
            dateFormat="yyyy-MM-dd"
            className="p-2 rounded text-black"
          />
        </div>
      </div>

      <div>
        {['1W', '1M', '6M', '1Y', '2Y', '5Y', '10Y', '25Y', 'ALL'].map(p => (
          <button
            key={p}
            onClick={() => handleQuickFilter(p)}
            style={{ margin: '5px', padding: '5px 10px', background: '#222', color: '#fff', border: '1px solid #555', borderRadius: '6px', cursor: 'pointer' }}
          >{p}</button>
        ))}
      </div>

      <div style={{ marginTop: 20 }}>
        <button onClick={() => setFilterPanel(!filterPanel)} style={{ padding: '10px 20px', fontWeight: 'bold', background: '#444', color: '#fff', border: 'none', borderRadius: '6px' }}>Filter</button>
        <button
          onClick={() => window.open('/correlation', '_blank')}
          style={{ padding: '10px 20px', fontWeight: 'bold', marginLeft: '10px', background: '#444', color: '#fff', border: 'none', borderRadius: '6px' }}
        >
          Correlation Matrix
        </button>

        <button onClick={goToCustom} style={{ padding: '10px 20px', fontWeight: 'bold', marginLeft: '10px', background: '#444', color: '#fff', border: 'none', borderRadius: '6px' }}>Custom</button>
        <button onClick={toggleComparePanel} style={{ padding: '10px 20px', fontWeight: 'bold', marginLeft: '10px', background: '#444', color: '#fff', border: 'none', borderRadius: '6px' }}>Compare</button>
      </div>

      {comparePanel && (
        <div style={{ marginTop: 10, padding: 10, background: '#222', borderRadius: '6px', display: 'flex', gap: '10px', alignItems: 'center' }}>
          {colorOptions.map(c => (
            <div key={c.name}
              onClick={() => {
                handleColorClick(c.name);
                setNoteSelectMode(false); // 🎯 다른 버튼 클릭 시 마우스 모드 끄기
              }}
              style={{
                width: 30, height: 30, borderRadius: '50%',
                background: c.code,
                border: activeColor === c.name ? '3px solid white' : '2px solid gray',
                cursor: 'pointer'
              }}
            />
          ))}

          <div
            onClick={() => {
              setActiveColor('eraser');
              setNoteSelectMode(false); // 🎯 eraser 선택 시 마우스 모드 끄기
            }}
            style={{
              width: 30, height: 30, borderRadius: '6px', background: '#888',
              border: activeColor === 'eraser' ? '3px solid white' : '2px solid gray',
              display: 'flex', justifyContent: 'center', alignItems: 'center',
              color: '#000', fontWeight: 'bold', cursor: 'pointer'
            }}
          >X</div>

          <button
            onClick={() => {
              setFixedLines([]);
              setNoteSelectMode(false); // 🎯 모두삭제 클릭 시 마우스 모드 끄기
            }}
            style={{
              marginLeft: '20px', padding: '6px 12px',
              background: '#a00', color: '#fff', border: 'none',
              borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold'
            }}
          >모두 삭제</button>

          <button
            onClick={() => setNoteSelectMode(!noteSelectMode)}
            style={{
              marginLeft: '10px',
              padding: '10px 20px',
              fontWeight: 'bold',
              background: noteSelectMode ? '#00f' : '#444',
              color: '#fff',
              border: 'none',
              borderRadius: '6px'
            }}
          >
            🖱️
          </button>
        </div>
      )}

      {filterPanel && (
        <div style={{ marginTop: 20, padding: 10, background: '#222', borderRadius: '6px' }}>
          <p>모드를 선택하세요:</p>
          <button
            onClick={() => { setFilterMode('sector'); setFilterPanel(false); }}
            style={{ marginRight: 10, padding: '8px 16px', background: '#555', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
          >Sectors</button>
          <button
            onClick={() => { setFilterMode('cycle'); setFilterPanel(false); }}
            style={{ padding: '8px 16px', background: '#555', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
          >Cycles</button>
        </div>
      )}

      {Object.entries(currentGroups).map(([group, indicators]) => (
        <div key={group} style={{ marginTop: 40 }}>
          <h2 style={{ fontSize: 24, fontWeight: 'bold', color: 'yellow' }}>{group}</h2>
          {indicators.map(series => {
            const seriesData = data[series] || [];
            const filtered = seriesData.filter(d => {
              const date = new Date(d.date);
              return date >= startDate && date <= endDate;
            });
            const isNewsActive = newsMode === series;

            return (
              <div key={series} style={{ marginTop: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    onClick={() => toggleSelect(series)}
                    style={{
                      width: 20, height: 20, border: '2px solid gray',
                      backgroundColor: selectedIndicators.includes(series) ? '#00f' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', color: '#fff', fontSize: 14, fontWeight: 'bold'
                    }}
                  >
                    {selectedIndicators.includes(series) ? '✔' : ''}
                  </div>
                  <h3 style={{ margin: 0 }}>{fullNames[series] || series}</h3>
                  <button
                    onClick={() => setNewsMode(isNewsActive ? null : series)}
                    style={{
                      marginLeft: '8px', padding: '4px 8px', cursor: 'pointer',
                      background: isNewsActive ? '#007bff' : '#444',
                      color: '#fff', border: 'none', borderRadius: '4px'
                    }}
                  >News</button>
                </div>
                {filtered.length === 0 ? (
                  <p>No data</p>
                ) : (
                  <IndicatorPlot
                    series={series}
                    filtered={filtered}
                    fixedLines={fixedLines}
                    activeColor={activeColor}
                    comparePanel={comparePanel}
                    handlePlotClick={(e) => handlePlotClick(e, filtered, series)}
                    handlePlotClickErase={handlePlotClickErase}
                    isNewsActive={isNewsActive}
                    handleNewsClick={handleNewsClick}
                    noteSelectMode={noteSelectMode}           // ✅ 추가
                    handleNoteClick={handleNoteClick}
                    startDate={startDate}     // ✅ 추가
                    endDate={endDate}
                    xRange={xRanges[series] || null}
                    setXRange={(range) => {
                      setXRanges(prev => ({
                        ...prev,
                        [series]: range
                      }));
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

