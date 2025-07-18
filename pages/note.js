import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

export default function NotePage() {
    const router = useRouter();

    const [mode, setMode] = useState('sector');
    const [indicators, setIndicators] = useState([]);
    const [dates, setDates] = useState([]);
    const [matrix, setMatrix] = useState({});
    const [selectedDates, setSelectedDates] = useState([]);
    const [rawData, setRawData] = useState({});
    const [activeDate, setActiveDate] = useState(null);
    const [activeSeries, setActiveSeries] = useState(null);
    const [barColor, setBarColor] = useState(null);


    useEffect(() => {
        const savedMode = localStorage.getItem('currentMode') || 'sector';
        setMode(savedMode);

        const savedIndicators = JSON.parse(localStorage.getItem(`noteIndicators_${savedMode}`)) || [];
        setIndicators(savedIndicators);

        const savedDates = JSON.parse(localStorage.getItem(`noteDates_${savedMode}`)) || [];
        setDates(savedDates);

        // 🔥 sessionStorage에 임시 matrix가 있으면 그걸 우선 사용
        const sessionMatrix = sessionStorage.getItem(`noteMatrix_${savedMode}`);
        if (sessionMatrix) {
            setMatrix(JSON.parse(sessionMatrix));
        } else {
            const savedMatrix = JSON.parse(localStorage.getItem(`noteMatrix_${savedMode}`)) || {};
            setMatrix(savedMatrix);
        }
    }, []);


    // ✅ router.query.date 는 별도로 관리 (단순히 보기용)
    useEffect(() => {
        if (router.query.date) {
            setActiveDate(router.query.date);
        }
        if (router.query.series) {
            setActiveSeries(router.query.series);
        }

        // fixedLines 에서 색깔 찾아오기
        const savedLines = JSON.parse(localStorage.getItem('fixedLines')) || [];
        if (router.query.date) {
            const found = savedLines.find(l => {
                const cleanX = l.x.includes('T') ? l.x.split('T')[0] : l.x;
                return cleanX === router.query.date;
            });
            if (found) {
                switch (found.color) {
                    case 'blue': setBarColor('#00f'); break;
                    case 'red': setBarColor('#f00'); break;
                    case 'yellow': setBarColor('#ff0'); break;
                    case 'green': setBarColor('#0f0'); break;
                    default: setBarColor('#fff');
                }
            }
        }
    }, [router.query.date, router.query.series]);

    // ✅ CSV 원본 데이터 로드
    useEffect(() => {
        const loadAll = async () => {
            let newRaw = {};
            for (let ind of indicators) {
                try {
                    const res = await fetch(`/${ind}.csv`);
                    const txt = await res.text();
                    const lines = txt.split('\n').slice(1);
                    let arr = [];
                    for (let line of lines) {
                        const [d, v] = line.split(',');
                        if (!d || !v) continue;
                        arr.push({
                            date: new Date(d.trim()).toISOString().split('T')[0],
                            value: parseFloat(v),
                        });
                    }
                    arr = arr
                        .filter((a) => !isNaN(a.value))
                        .sort((a, b) => new Date(a.date) - new Date(b.date));
                    newRaw[ind] = arr;
                } catch (e) {
                    console.error('load fail', ind, e);
                }
            }
            setRawData(newRaw);
        };
        if (indicators.length > 0) {
            loadAll();
        }
    }, [indicators]);

    // 🔹 모드 변경 시 불러오기
    const handleModeChange = (newMode) => {
        setMode(newMode);
        const savedIndicators = JSON.parse(localStorage.getItem(`noteIndicators_${newMode}`)) || [];
        setIndicators(savedIndicators);
        const savedDates = JSON.parse(localStorage.getItem(`noteDates_${newMode}`)) || [];
        setDates(savedDates);
        const savedMatrix = JSON.parse(localStorage.getItem(`noteMatrix_${newMode}`)) || {};
        setMatrix(savedMatrix);

        if (savedDates.length > 0) setActiveDate(savedDates[0]);
        else setActiveDate(null);
    };

    // 🔹 값 변경
    const handleInputChange = (date, indicator, value) => {
        setMatrix(prev => ({
            ...prev,
            [date]: {
                ...prev[date], // 기존 color, clickedIndicator, memo 모두 유지
                indicators: {
                    ...(prev[date]?.indicators || {}),
                    [indicator]: value,
                },
            },
        }));

    };

    const handleMemoChange = (date, value) => {
        setMatrix((prev) => ({
            ...prev,
            [date]: {
                ...prev[date], // color와 clickedIndicator 유지
                memo: value,
            },
        }));
    };

    const handleMemoDelete = (date) => {
        setMatrix((prev) => ({
            ...prev,
            [date]: {
                ...prev[date], // color와 clickedIndicator 유지
                memo: '',      // memo만 초기화
            },
        }));
    };

    const handleMemoSave = () => {
        localStorage.setItem(`noteMatrix_${mode}`, JSON.stringify(matrix));
        alert('메모가 저장되었습니다!');
    };

    // 🔹 저장하기 버튼
    const handleSave = () => {
        if (selectedDates.length === 0) {
            alert('날짜를 하나 이상 선택해주세요.');
            return;
        }

        // ✅ 기존 dates에 없는 새로운 날짜만 추가
        const newDates = Array.from(new Set([...dates, ...selectedDates]));
        setDates(newDates);

        // ✅ localStorage에 갱신
        localStorage.setItem('currentMode', mode);
        localStorage.setItem(`noteIndicators_${mode}`, JSON.stringify(indicators));
        localStorage.setItem(`noteDates_${mode}`, JSON.stringify(newDates));
        localStorage.setItem(`noteMatrix_${mode}`, JSON.stringify(matrix));

        alert('선택한 날짜가 저장 목록에 추가되었습니다!');
    };


    // 🔹 날짜 체크 토글
    const toggleDateSelect = (date) => {
        setSelectedDates((prev) =>
            prev.includes(date) ? prev.filter((d) => d !== date) : [...prev, date]
        );
    };

    // 🔹 선택 날짜 삭제
    const handleDelete = () => {
        if (selectedDates.length === 0) {
            alert('삭제할 날짜를 선택하세요.');
            return;
        }
        const newMatrix = { ...matrix };
        selectedDates.forEach((date) => {
            delete newMatrix[date];
        });
        const newDates = dates.filter((d) => !selectedDates.includes(d));
        setMatrix(newMatrix);
        setDates(newDates);
        setSelectedDates([]);
        localStorage.setItem(`noteDates_${mode}`, JSON.stringify(newDates));
        localStorage.setItem(`noteMatrix_${mode}`, JSON.stringify(newMatrix));
        alert('선택된 날짜가 삭제되었습니다.');
    };

    // 🔹 값 없으면 바로 이전값 가져오기
    const getValueWithFallback = (date, indicator) => {
        const saved = matrix[date]?.indicators?.[indicator];
        if (saved !== undefined) return saved;

        const arr = rawData[indicator] || [];
        const exact = arr.find((d) => d.date === date);
        if (exact) return exact.value;
        const past = arr.filter((d) => new Date(d.date) < new Date(date));
        if (past.length > 0) {
            const latest = past.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
            return latest.value;
        }
        return '';
    };

    const handleActiveDate = (date) => {
        setActiveDate(date);
    };

    return (
        <div style={{ padding: 20, background: '#111', color: '#fff', minHeight: '100vh' }}>
            <h1 style={{ fontSize: 28, fontWeight: 'bold', marginBottom: 20 }}>📒 Note Page</h1>

            {/* 상단 버튼 */}
            <div style={{ display: 'flex', gap: '20px', margin: '30px 0' }}>
                <button
                    onClick={handleSave}
                    style={{
                        padding: '10px 20px',
                        background: '#007bff',
                        border: 'none',
                        borderRadius: '6px',
                        color: '#fff',
                    }}
                >
                    Save
                </button>
                <button
                    onClick={handleDelete}
                    style={{
                        padding: '10px 20px',
                        background: '#a00',
                        border: 'none',
                        borderRadius: '6px',
                        color: '#fff',
                    }}
                >
                    Delete Date
                </button>
                <button
                    onClick={() => router.push('/')}
                    style={{
                        padding: '10px 20px',
                        background: '#555',
                        border: 'none',
                        borderRadius: '6px',
                        color: '#fff',
                    }}
                >
                    Go Back
                </button>
            </div>

            {/* 선택된 날짜 표 (activeDate) */}
            {activeDate ? (
                <div style={{ overflowX: 'auto', marginBottom: '40px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px', gap: '10px' }}>
                        <h3
                            style={{
                                margin: 0,
                                color: matrix[activeDate]?.color ? matrix[activeDate].color : '#fff', // 🔥 색상 적용
                            }}
                        >
                            📅 {activeDate}
                        </h3>
                        {/* ✅ activeDate도 선택 가능 */}
                        <input
                            type="checkbox"
                            checked={selectedDates.includes(activeDate)}
                            onChange={() => toggleDateSelect(activeDate)}
                            style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                        />
                    </div>
                    <table
                        border="1"
                        style={{ borderCollapse: 'collapse', marginBottom: 20, width: 'max-content', minWidth: '100%' }}
                    >
                        <thead>
                            <tr>
                                <th style={{ padding: 10, background: '#222' }}>날짜</th>
                                {indicators.map((ind) => (
                                    <th
                                        key={ind}
                                        style={{
                                            padding: 10,
                                            background: '#222',
                                            whiteSpace: 'nowrap',
                                            borderBottom:
                                                (matrix[activeDate]?.clickedIndicator === ind)
                                                    ? `3px solid ${matrix[activeDate]?.color || '#fff'}`
                                                    : (activeDate === router.query.date && activeSeries === ind && barColor)
                                                        ? `3px solid ${barColor}`
                                                        : '3px solid transparent'
                                        }}
                                    >
                                        {ind}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style={{ padding: 8, background: '#333', fontWeight: 'bold' }}>
                                    {activeDate}
                                </td>
                                {indicators.map((ind) => (
                                    <td key={ind} style={{ padding: 4, background: '#000' }}>
                                        <input
                                            value={getValueWithFallback(activeDate, ind)}
                                            onChange={(e) => handleInputChange(activeDate, ind, e.target.value)}
                                            style={{
                                                width: '80px',
                                                background: '#222',
                                                border: '1px solid #555',
                                                color: '#fff',
                                                borderRadius: '4px',
                                                padding: '4px',
                                            }}
                                        />
                                    </td>
                                ))}
                            </tr>
                            <tr>
                                <td
                                    colSpan={indicators.length + 1}
                                    style={{ background: '#111', padding: '8px 12px' }}
                                >
                                    <textarea
                                        value={matrix[activeDate]?.memo || ''}
                                        onChange={(e) => handleMemoChange(activeDate, e.target.value)}
                                        style={{
                                            width: '100%',
                                            height: '60px',
                                            background: '#222',
                                            border: '1px solid #555',
                                            color: '#fff',
                                            borderRadius: '4px',
                                            padding: '4px',
                                        }}
                                    />
                                    <div style={{ marginTop: '4px', display: 'flex', gap: '10px' }}>
                                        <button
                                            onClick={handleMemoSave}
                                            style={{
                                                background: '#007bff',
                                                color: '#fff',
                                                border: 'none',
                                                borderRadius: '4px',
                                                padding: '4px 8px',
                                            }}
                                        >
                                            save memo
                                        </button>
                                        <button
                                            onClick={() => handleMemoDelete(activeDate)}
                                            style={{
                                                background: '#a00',
                                                color: '#fff',
                                                border: 'none',
                                                borderRadius: '4px',
                                                padding: '4px 8px',
                                            }}
                                        >
                                            delete memo
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            ) : (
                <p style={{ marginBottom: '40px' }}>No selected date.</p>
            )}

            {/* sector cycle custom 버튼 */}
            <div style={{ marginTop: 20, marginBottom: 20 }}>
                {['sector', 'cycle', 'custom'].map((m) => (
                    <button
                        key={m}
                        onClick={() => handleModeChange(m)}
                        style={{
                            marginRight: 10,
                            background: mode === m ? '#00f' : '#444',
                            color: '#fff',
                            padding: '6px 12px',
                            border: 'none',
                            borderRadius: '6px',
                        }}
                    >
                        {m}
                    </button>
                ))}
            </div>

            {/* ✅ 저장된 데이터 목록 */}
            <div style={{ marginTop: '20px', padding: '10px', background: '#222', borderRadius: '6px' }}>
                <h3>📌 Saved data</h3>
                {dates.length === 0 ? (
                    <p>No saved data.</p>
                ) : (
                    dates
                        .slice()
                        .sort((a, b) => new Date(a) - new Date(b))
                        .map((date) => {
                            const checked = selectedDates.includes(date);
                            return (
                                <div
                                    key={date}
                                    style={{
                                        marginBottom: '20px',
                                        padding: '10px',
                                        background: '#111',
                                        borderRadius: '6px',
                                        border: checked ? '2px solid #00f' : '1px solid #333'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px', gap: '10px' }}>
                                        <h4
                                            style={{
                                                margin: 0,
                                                cursor: 'pointer',
                                                textDecoration: activeDate === date ? 'underline' : 'none',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                color: matrix[date]?.color ? matrix[date].color : '#fff', // 🔥 색상 적용
                                            }}
                                            onClick={() => handleActiveDate(date)}
                                        >
                                            📅 {date}
                                        </h4>

                                        <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={() => toggleDateSelect(date)}
                                            style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                                        />
                                    </div>

                                    <div style={{ overflowX: 'auto', marginBottom: '10px' }}>
                                        <table
                                            border="1"
                                            style={{
                                                borderCollapse: 'collapse',
                                                width: 'max-content',
                                                minWidth: '100%',
                                            }}
                                        >
                                            <thead>
                                                <tr>
                                                    {indicators.map((ind) => (
                                                        <th
                                                            key={ind}
                                                            style={{
                                                                padding: '6px',
                                                                background: '#333', // 🔥 기본 배경으로 통일
                                                                whiteSpace: 'nowrap',
                                                                borderBottom:
                                                                    (matrix[date]?.clickedIndicator === ind)
                                                                        ? `3px solid ${matrix[date]?.color || '#fff'}`
                                                                        : (activeDate === date && activeSeries === ind && barColor)
                                                                            ? `3px solid ${barColor}`
                                                                            : '3px solid transparent'
                                                            }}
                                                        >
                                                            {ind}
                                                        </th>

                                                    ))}

                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr>
                                                    {indicators.map((ind) => (
                                                        <td
                                                            key={ind}
                                                            style={{
                                                                padding: '4px',
                                                                background: '#000',
                                                                textAlign: 'center',
                                                                whiteSpace: 'nowrap',
                                                            }}
                                                        >
                                                            {matrix[date]?.indicators?.[ind] ?? getValueWithFallback(date, ind)}
                                                        </td>
                                                    ))}
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>

                                    <textarea
                                        value={matrix[date]?.memo || ''}
                                        onChange={(e) => handleMemoChange(date, e.target.value)}
                                        style={{
                                            width: '100%',
                                            height: '60px',
                                            background: '#222',
                                            border: '1px solid #555',
                                            color: '#fff',
                                            borderRadius: '4px',
                                            padding: '4px',
                                            marginBottom: '6px',
                                        }}
                                    />
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button
                                            onClick={handleMemoSave}
                                            style={{
                                                background: '#007bff',
                                                color: '#fff',
                                                border: 'none',
                                                borderRadius: '4px',
                                                padding: '4px 8px',
                                            }}
                                        >
                                            save memo
                                        </button>
                                        <button
                                            onClick={() => handleMemoDelete(date)}
                                            style={{
                                                background: '#a00',
                                                color: '#fff',
                                                border: 'none',
                                                borderRadius: '4px',
                                                padding: '4px 8px',
                                            }}
                                        >
                                            delete memo
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                )}
            </div>
        </div>
    );
}


